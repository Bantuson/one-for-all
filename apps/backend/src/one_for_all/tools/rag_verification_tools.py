"""
RAG Content Verification Tools

CrewAI tools for verifying and auditing RAG (Retrieval-Augmented Generation) content.
Provides security controls for content integrity, source validation, and approval workflows.

Security Features:
- SHA-256 content hashing for integrity verification
- SSRF allowlist validation for source URLs
- Admin approval workflow for content
- Audit logging for all verification operations

Usage:
    from one_for_all.tools.rag_verification_tools import (
        hash_and_store_rag_content,
        verify_rag_source,
        get_pending_rag_verification,
        approve_rag_embedding,
        reject_rag_embedding,
        audit_rag_integrity,
    )
"""

import asyncio
import hashlib
import json
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlparse

from crewai.tools import tool

from .supabase_client import supabase
from ..utils.db_audit import audit_service_role_access
from ..utils.ssrf_protection import validate_url, ALLOWED_DOMAINS


def _compute_sha256(content: str) -> str:
    """Compute SHA-256 hash of content."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def _extract_domain(url: str) -> Optional[str]:
    """Extract domain from URL for allowlist validation."""
    if not url:
        return None
    try:
        parsed = urlparse(url)
        return parsed.hostname.lower() if parsed.hostname else None
    except Exception:
        return None


@audit_service_role_access(table="rag_embeddings", operation="insert")
@tool
def hash_and_store_rag_content(content: str, source_url: str) -> str:
    """
    Compute SHA-256 hash of RAG content, extract source domain, and store with verification pending.

    This tool creates a new RAG embedding entry with content integrity tracking.
    The content is hashed for future integrity verification, and the source URL
    is parsed to extract the domain for SSRF allowlist validation.

    Security: All new content starts with verification_status='pending' and must
    be approved before being used in production queries.

    Args:
        content: Text content to store (the chunk text)
        source_url: Original URL the content was scraped from

    Returns:
        JSON string with embedding ID, content hash, and domain extraction result,
        or error message on failure

    Example:
        result = hash_and_store_rag_content(
            content="BSc Computer Science requires APS of 30...",
            source_url="https://www.up.ac.za/programmes/bsc-computer-science"
        )
    """
    if not content or len(content.strip()) < 10:
        return json.dumps({"error": "Content must be at least 10 characters"})

    if not source_url:
        return json.dumps({"error": "source_url is required"})

    async def async_logic():
        # Compute content hash
        content_hash = _compute_sha256(content)

        # Extract domain from URL
        source_domain = _extract_domain(source_url)
        if not source_domain:
            return json.dumps({
                "error": f"Could not extract domain from URL: {source_url}"
            })

        # Prepare insert data
        insert_data = {
            "chunk": content,
            "content_hash": content_hash,
            "source_url": source_url,
            "source_domain": source_domain,
            "verification_status": "pending",
        }

        # Insert into database
        result = supabase.table("rag_embeddings").insert(insert_data).execute()

        if not result.data:
            return json.dumps({"error": "Failed to insert RAG content"})

        stored = result.data[0]
        return json.dumps({
            "id": stored["id"],
            "content_hash": content_hash,
            "source_domain": source_domain,
            "verification_status": "pending",
            "message": "Content stored successfully. Requires verification before use.",
        })

    return asyncio.run(async_logic())


@audit_service_role_access(table="rag_embeddings", operation="update")
@tool
def verify_rag_source(embedding_id: str) -> str:
    """
    Verify RAG embedding source URL against SSRF allowlist.

    This tool checks if the source URL of a RAG embedding is from an allowed domain
    (South African universities and trusted institutions). If valid, the embedding
    is marked as 'source_verified'.

    Security: Uses the SSRF protection allowlist to validate URLs. Only domains
    explicitly listed in the allowlist will pass verification.

    Args:
        embedding_id: UUID of the RAG embedding to verify

    Returns:
        JSON string with verification result and updated status,
        or error message on failure

    Example:
        result = verify_rag_source("550e8400-e29b-41d4-a716-446655440000")
    """
    if not embedding_id:
        return json.dumps({"error": "embedding_id is required"})

    async def async_logic():
        # Fetch the embedding
        result = supabase.table("rag_embeddings").select(
            "id, source_url, source_domain, verification_status"
        ).eq("id", embedding_id).execute()

        if not result.data:
            return json.dumps({"error": f"Embedding not found: {embedding_id}"})

        embedding = result.data[0]
        source_url = embedding.get("source_url")

        if not source_url:
            return json.dumps({
                "error": "Embedding has no source_url to verify",
                "embedding_id": embedding_id
            })

        # Validate URL against SSRF allowlist
        validation_result = validate_url(
            source_url,
            require_allowlist=True,
            allow_http=False
        )

        now = datetime.now(timezone.utc).isoformat()

        if validation_result.is_valid:
            # Update to source_verified status
            update_result = supabase.table("rag_embeddings").update({
                "verification_status": "source_verified",
                "source_verified_at": now,
                "source_verification_method": "ssrf_allowlist",
            }).eq("id", embedding_id).execute()

            if not update_result.data:
                return json.dumps({"error": "Failed to update verification status"})

            return json.dumps({
                "id": embedding_id,
                "verification_status": "source_verified",
                "source_url": source_url,
                "resolved_ip": validation_result.resolved_ip,
                "verified_at": now,
                "verification_method": "ssrf_allowlist",
            })
        else:
            # URL failed validation - keep as pending
            return json.dumps({
                "id": embedding_id,
                "verification_status": "pending",
                "source_url": source_url,
                "validation_failed": True,
                "reason": validation_result.reason,
                "message": "Source URL failed SSRF validation. Requires manual review.",
            })

    return asyncio.run(async_logic())


@audit_service_role_access(table="rag_embeddings", operation="select")
@tool
def get_pending_rag_verification() -> str:
    """
    List RAG embeddings with verification status='pending'.

    This tool retrieves all RAG content that is awaiting verification or approval.
    Used by admins to review the verification queue.

    Security: Returns limited data (no full content) to avoid exposing
    potentially malicious content in tool output.

    Returns:
        JSON string with list of pending embeddings including id, source_url,
        source_domain, and created_at

    Example:
        pending_list = get_pending_rag_verification()
    """
    async def async_logic():
        result = supabase.table("rag_embeddings").select(
            "id, source_url, source_domain, verification_status, created_at"
        ).eq("verification_status", "pending").order(
            "created_at", desc=False
        ).limit(100).execute()

        if not result.data:
            return json.dumps({
                "pending_count": 0,
                "embeddings": [],
                "message": "No pending embeddings to verify"
            })

        return json.dumps({
            "pending_count": len(result.data),
            "embeddings": result.data,
        })

    return asyncio.run(async_logic())


@audit_service_role_access(table="rag_embeddings", operation="update")
@tool
def approve_rag_embedding(embedding_id: str, approver_id: str) -> str:
    """
    Approve a RAG embedding for use in production queries.

    This tool sets the verification status to 'approved' and records the approver.
    Only embeddings with 'pending' or 'source_verified' status can be approved.

    Security: Records who approved the content and when for audit trail.
    The approver_id should be a valid auth.users UUID.

    Args:
        embedding_id: UUID of the RAG embedding to approve
        approver_id: UUID of the user approving the content

    Returns:
        JSON string with approval confirmation and updated status,
        or error message on failure

    Example:
        result = approve_rag_embedding(
            embedding_id="550e8400-e29b-41d4-a716-446655440000",
            approver_id="user-uuid-here"
        )
    """
    if not embedding_id:
        return json.dumps({"error": "embedding_id is required"})

    if not approver_id:
        return json.dumps({"error": "approver_id is required"})

    async def async_logic():
        # Verify embedding exists and is in approvable state
        result = supabase.table("rag_embeddings").select(
            "id, verification_status, source_url"
        ).eq("id", embedding_id).execute()

        if not result.data:
            return json.dumps({"error": f"Embedding not found: {embedding_id}"})

        embedding = result.data[0]
        current_status = embedding.get("verification_status")

        # Only allow approval from pending or source_verified status
        if current_status not in ("pending", "source_verified"):
            return json.dumps({
                "error": f"Cannot approve embedding with status '{current_status}'",
                "allowed_statuses": ["pending", "source_verified"],
                "embedding_id": embedding_id
            })

        now = datetime.now(timezone.utc).isoformat()

        # Update to approved status
        update_result = supabase.table("rag_embeddings").update({
            "verification_status": "approved",
            "approved_by": approver_id,
            "approved_at": now,
        }).eq("id", embedding_id).execute()

        if not update_result.data:
            return json.dumps({"error": "Failed to update approval status"})

        return json.dumps({
            "id": embedding_id,
            "verification_status": "approved",
            "approved_by": approver_id,
            "approved_at": now,
            "previous_status": current_status,
            "message": "Embedding approved for production use",
        })

    return asyncio.run(async_logic())


@audit_service_role_access(table="rag_embeddings", operation="update")
@tool
def reject_rag_embedding(embedding_id: str, reason: str) -> str:
    """
    Reject a RAG embedding with a required reason.

    This tool sets the verification status to 'rejected' and records the reason.
    Rejected embeddings will not be used in production queries.

    Security: A reason is required to maintain audit trail of why content
    was rejected (e.g., "Content from untrusted source", "Contains outdated information").

    Args:
        embedding_id: UUID of the RAG embedding to reject
        reason: Required explanation for the rejection

    Returns:
        JSON string with rejection confirmation and updated status,
        or error message on failure

    Example:
        result = reject_rag_embedding(
            embedding_id="550e8400-e29b-41d4-a716-446655440000",
            reason="Content from untrusted source - domain not in allowlist"
        )
    """
    if not embedding_id:
        return json.dumps({"error": "embedding_id is required"})

    if not reason or len(reason.strip()) < 5:
        return json.dumps({
            "error": "rejection_reason is required and must be at least 5 characters"
        })

    async def async_logic():
        # Verify embedding exists
        result = supabase.table("rag_embeddings").select(
            "id, verification_status, source_url"
        ).eq("id", embedding_id).execute()

        if not result.data:
            return json.dumps({"error": f"Embedding not found: {embedding_id}"})

        embedding = result.data[0]
        current_status = embedding.get("verification_status")

        # Don't allow re-rejecting already rejected content
        if current_status == "rejected":
            return json.dumps({
                "error": "Embedding is already rejected",
                "embedding_id": embedding_id
            })

        # Update to rejected status
        update_result = supabase.table("rag_embeddings").update({
            "verification_status": "rejected",
            "rejection_reason": reason.strip(),
        }).eq("id", embedding_id).execute()

        if not update_result.data:
            return json.dumps({"error": "Failed to update rejection status"})

        return json.dumps({
            "id": embedding_id,
            "verification_status": "rejected",
            "rejection_reason": reason.strip(),
            "previous_status": current_status,
            "message": "Embedding rejected and will not be used in queries",
        })

    return asyncio.run(async_logic())


@audit_service_role_access(table="rag_embeddings", operation="select")
@tool
def audit_rag_integrity() -> str:
    """
    Query all RAG embeddings and verify content hashes match stored content.

    This tool performs an integrity audit by recomputing SHA-256 hashes of all
    RAG content and comparing against stored hashes. Reports any mismatches
    that could indicate data tampering or corruption.

    Security: This is a read-only audit operation. Mismatches are reported
    but not automatically corrected - manual review is required.

    Returns:
        JSON string with audit results including:
        - total_audited: Number of embeddings checked
        - passed: Number with matching hashes
        - failed: Number with mismatching hashes
        - missing_hash: Number without stored hashes
        - mismatches: List of IDs with hash mismatches (if any)

    Example:
        audit_result = audit_rag_integrity()
    """
    async def async_logic():
        # Fetch all embeddings with content and hash
        # Note: This could be paginated for very large datasets
        result = supabase.table("rag_embeddings").select(
            "id, chunk, content_hash"
        ).limit(1000).execute()

        if not result.data:
            return json.dumps({
                "total_audited": 0,
                "passed": 0,
                "failed": 0,
                "missing_hash": 0,
                "message": "No embeddings to audit"
            })

        passed = 0
        failed = 0
        missing_hash = 0
        mismatches = []

        for embedding in result.data:
            embedding_id = embedding["id"]
            content = embedding.get("chunk") or ""
            stored_hash = embedding.get("content_hash")

            if not stored_hash:
                missing_hash += 1
                continue

            # Recompute hash
            computed_hash = _compute_sha256(content)

            if computed_hash == stored_hash:
                passed += 1
            else:
                failed += 1
                mismatches.append({
                    "id": embedding_id,
                    "stored_hash": stored_hash[:16] + "...",  # Truncate for safety
                    "computed_hash": computed_hash[:16] + "...",
                })

        audit_summary = {
            "total_audited": len(result.data),
            "passed": passed,
            "failed": failed,
            "missing_hash": missing_hash,
            "integrity_percentage": round(
                (passed / (passed + failed) * 100) if (passed + failed) > 0 else 100,
                2
            ),
        }

        if mismatches:
            audit_summary["mismatches"] = mismatches[:10]  # Limit to first 10
            audit_summary["message"] = (
                f"INTEGRITY ALERT: {failed} embeddings have hash mismatches. "
                "Manual review required."
            )
        elif missing_hash > 0:
            audit_summary["message"] = (
                f"Audit complete. {missing_hash} embeddings have no stored hash "
                "(legacy data - consider backfilling)."
            )
        else:
            audit_summary["message"] = "Integrity audit passed. All hashes match."

        return json.dumps(audit_summary)

    return asyncio.run(async_logic())
