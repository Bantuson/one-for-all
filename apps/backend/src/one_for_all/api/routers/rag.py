"""
RAG Router

Vector store operations for university/course information retrieval.
Used by rag_specialist_agent for semantic search.

Security Features:
- Content verification workflow (pending -> source_verified -> approved/rejected)
- SHA-256 content hashing for integrity verification
- SSRF allowlist validation for source URLs
- Admin-only approval/rejection endpoints
"""

import hashlib
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, status

from ..dependencies import AdminRequired, ApiKeyVerified, SupabaseClient
from ..schemas.rag import (
    RAGMatch,
    RAGQuery,
    RAGQueryResponse,
    RAGStore,
    RAGStoreResponse,
)
from ..schemas.rag_verification import (
    ApprovalResponse,
    AuditResponse,
    HashMismatchItem,
    PendingEmbeddingItem,
    PendingVerificationResponse,
    RAGApproveRequest,
    RAGAuditRequest,
    RAGRejectRequest,
    RejectionResponse,
    SourceVerificationResponse,
    VerificationStatus,
)

# Import SSRF validation from utils
try:
    from ...utils.ssrf_protection import validate_url
except ImportError:
    # Fallback if import path differs
    validate_url = None

router = APIRouter(
    prefix="/api/v1/rag",
    tags=["rag"],
)


@router.post("/query", response_model=RAGQueryResponse)
async def query_embeddings(
    query: RAGQuery,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Query RAG embeddings using vector similarity search.

    Calls the match_rag_embeddings RPC function in Supabase
    to perform cosine similarity search on the embeddings.

    Used by rag_specialist_agent to find relevant university/course information.
    """
    try:
        # Call the RPC function for vector similarity search
        result = supabase.rpc(
            "match_rag_embeddings",
            {
                "query_embedding": query.query_embedding,
                "match_count": query.match_count,
            },
        ).execute()

        if not result.data:
            return RAGQueryResponse(
                matches=[],
                query_count=query.match_count,
                total_matches=0,
            )

        # Filter by institution if provided
        matches = result.data
        if query.institution_id:
            matches = [
                m for m in matches
                if m.get("institution_id") == str(query.institution_id)
            ]

        # Filter by source if provided
        if query.source_filter:
            matches = [
                m for m in matches
                if query.source_filter.lower() in (m.get("source") or "").lower()
            ]

        # Convert to response format
        formatted_matches = []
        for match in matches:
            formatted_matches.append(
                RAGMatch(
                    id=match["id"],
                    content=match.get("content", ""),
                    metadata=match.get("metadata"),
                    source=match.get("source"),
                    similarity=match.get("similarity", 0.0),
                )
            )

        return RAGQueryResponse(
            matches=formatted_matches,
            query_count=query.match_count,
            total_matches=len(formatted_matches),
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG query failed: {str(e)}",
        )


@router.post(
    "/store",
    response_model=RAGStoreResponse,
    status_code=status.HTTP_201_CREATED,
)
async def store_embedding(
    embedding: RAGStore,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Store a new embedding in the RAG vector store.

    Used by rag_specialist_agent after scraping new university information.
    The embedding should be pre-computed (1536 dimensions for OpenAI embeddings).
    """
    # Build insert data
    insert_data = {
        "content": embedding.content,
        "embedding": embedding.embedding,
        "metadata": embedding.metadata,
        "source": embedding.source,
    }

    if embedding.institution_id:
        insert_data["institution_id"] = str(embedding.institution_id)

    try:
        result = supabase.table("rag_embeddings").insert(insert_data).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to store embedding",
            )

        stored = result.data[0]

        return RAGStoreResponse(
            id=stored["id"],
            content_preview=embedding.content[:200],
            source=embedding.source,
            institution_id=embedding.institution_id,
            created_at=stored["created_at"],
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to store embedding: {str(e)}",
        )


@router.delete("/{embedding_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_embedding(
    embedding_id: str,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Delete an embedding from the RAG vector store.

    Used for cleanup or when source data is updated.
    """
    try:
        supabase.table("rag_embeddings").delete().eq("id", embedding_id).execute()
        return None
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete embedding: {str(e)}",
        )


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_embeddings_by_source(
    source: str,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Delete all embeddings from a specific source.

    Used when re-scraping a website to replace old data.
    """
    try:
        supabase.table("rag_embeddings").delete().eq("source", source).execute()
        return None
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete embeddings: {str(e)}",
        )


# =============================================================================
# RAG CONTENT VERIFICATION ENDPOINTS
# =============================================================================


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


@router.get(
    "/pending-verification",
    response_model=PendingVerificationResponse,
    tags=["rag", "verification"],
)
async def get_pending_verification(
    supabase: SupabaseClient,
    tenant: AdminRequired,
    limit: int = 100,
    domain_filter: Optional[str] = None,
):
    """
    List RAG embeddings pending verification.

    Returns all embeddings with verification_status='pending' for admin review.
    Admins can filter by source domain for targeted review.

    Security:
    - Requires admin role (AdminRequired dependency)
    - Returns limited data to avoid exposing potentially malicious content
    """
    try:
        query = supabase.table("rag_embeddings").select(
            "id, source_url, source_domain, verification_status, created_at"
        ).eq("verification_status", "pending")

        if domain_filter:
            query = query.eq("source_domain", domain_filter.lower())

        result = query.order("created_at", desc=False).limit(limit).execute()

        if not result.data:
            return PendingVerificationResponse(
                pending_count=0,
                embeddings=[],
                message="No pending embeddings to verify",
            )

        embeddings = [
            PendingEmbeddingItem(
                id=e["id"],
                source_url=e.get("source_url"),
                source_domain=e.get("source_domain"),
                verification_status=VerificationStatus(e["verification_status"]),
                created_at=e["created_at"],
            )
            for e in result.data
        ]

        return PendingVerificationResponse(
            pending_count=len(embeddings),
            embeddings=embeddings,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch pending embeddings: {str(e)}",
        )


@router.post(
    "/{embedding_id}/approve",
    response_model=ApprovalResponse,
    tags=["rag", "verification"],
)
async def approve_embedding(
    embedding_id: str,
    request: RAGApproveRequest,
    supabase: SupabaseClient,
    tenant: AdminRequired,
):
    """
    Approve a RAG embedding for production use.

    Sets verification_status to 'approved' and records the approver.
    Only embeddings with 'pending' or 'source_verified' status can be approved.

    Security:
    - Requires admin role (AdminRequired dependency)
    - Records approver_id and timestamp for audit trail
    """
    try:
        # Verify embedding exists and is in approvable state
        result = supabase.table("rag_embeddings").select(
            "id, verification_status, source_url"
        ).eq("id", embedding_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Embedding not found: {embedding_id}",
            )

        embedding = result.data[0]
        current_status = embedding.get("verification_status")

        # Only allow approval from pending or source_verified status
        if current_status not in ("pending", "source_verified"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot approve embedding with status '{current_status}'. "
                       f"Allowed statuses: pending, source_verified",
            )

        now = datetime.now(timezone.utc)

        # Update to approved status
        update_result = supabase.table("rag_embeddings").update({
            "verification_status": "approved",
            "approved_by": str(request.approver_id),
            "approved_at": now.isoformat(),
        }).eq("id", embedding_id).execute()

        if not update_result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update approval status",
            )

        return ApprovalResponse(
            id=embedding_id,
            verification_status=VerificationStatus.APPROVED,
            approved_by=request.approver_id,
            approved_at=now,
            previous_status=VerificationStatus(current_status),
            message="Embedding approved for production use",
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to approve embedding: {str(e)}",
        )


@router.post(
    "/{embedding_id}/reject",
    response_model=RejectionResponse,
    tags=["rag", "verification"],
)
async def reject_embedding(
    embedding_id: str,
    request: RAGRejectRequest,
    supabase: SupabaseClient,
    tenant: AdminRequired,
):
    """
    Reject a RAG embedding with a required reason.

    Sets verification_status to 'rejected' and records the rejection reason.
    Rejected embeddings will not be used in production queries.

    Security:
    - Requires admin role (AdminRequired dependency)
    - Rejection reason is required for audit trail
    """
    try:
        # Verify embedding exists
        result = supabase.table("rag_embeddings").select(
            "id, verification_status, source_url"
        ).eq("id", embedding_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Embedding not found: {embedding_id}",
            )

        embedding = result.data[0]
        current_status = embedding.get("verification_status")

        # Don't allow re-rejecting already rejected content
        if current_status == "rejected":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Embedding is already rejected",
            )

        # Update to rejected status
        update_result = supabase.table("rag_embeddings").update({
            "verification_status": "rejected",
            "rejection_reason": request.reason,
        }).eq("id", embedding_id).execute()

        if not update_result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update rejection status",
            )

        return RejectionResponse(
            id=embedding_id,
            verification_status=VerificationStatus.REJECTED,
            rejection_reason=request.reason,
            previous_status=VerificationStatus(current_status),
            message="Embedding rejected and will not be used in queries",
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reject embedding: {str(e)}",
        )


@router.post(
    "/audit",
    response_model=AuditResponse,
    tags=["rag", "verification"],
)
async def audit_integrity(
    supabase: SupabaseClient,
    tenant: AdminRequired,
    request: Optional[RAGAuditRequest] = None,
):
    """
    Trigger integrity audit of RAG embeddings.

    Recomputes SHA-256 hashes of all RAG content and compares against stored hashes.
    Reports any mismatches that could indicate data tampering or corruption.

    Security:
    - Requires admin role (AdminRequired dependency)
    - Read-only operation - mismatches are reported but not auto-corrected
    - Results are logged for security audit trail
    """
    limit = request.limit if request else 1000
    domain_filter = request.domain_filter if request else None

    try:
        # Fetch embeddings with content and hash
        query = supabase.table("rag_embeddings").select(
            "id, chunk, content_hash, source_domain"
        )

        if domain_filter:
            query = query.eq("source_domain", domain_filter.lower())

        result = query.limit(limit).execute()

        if not result.data:
            return AuditResponse(
                total_audited=0,
                passed=0,
                failed=0,
                missing_hash=0,
                integrity_percentage=100.0,
                mismatches=[],
                message="No embeddings to audit",
            )

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
                mismatches.append(
                    HashMismatchItem(
                        id=embedding_id,
                        stored_hash_preview=stored_hash[:16] + "...",
                        computed_hash_preview=computed_hash[:16] + "...",
                    )
                )

        integrity_percentage = round(
            (passed / (passed + failed) * 100) if (passed + failed) > 0 else 100,
            2
        )

        if mismatches:
            message = (
                f"INTEGRITY ALERT: {failed} embeddings have hash mismatches. "
                "Manual review required."
            )
        elif missing_hash > 0:
            message = (
                f"Audit complete. {missing_hash} embeddings have no stored hash "
                "(legacy data - consider backfilling)."
            )
        else:
            message = "Integrity audit passed. All hashes match."

        return AuditResponse(
            total_audited=len(result.data),
            passed=passed,
            failed=failed,
            missing_hash=missing_hash,
            integrity_percentage=integrity_percentage,
            mismatches=mismatches[:10],  # Limit to first 10
            message=message,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Audit failed: {str(e)}",
        )


@router.post(
    "/{embedding_id}/verify-source",
    response_model=SourceVerificationResponse,
    tags=["rag", "verification"],
)
async def verify_source(
    embedding_id: str,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Verify RAG embedding source URL against SSRF allowlist.

    Checks if the source URL is from an allowed domain (South African universities
    and trusted institutions). If valid, marks the embedding as 'source_verified'.

    Security:
    - Uses SSRF protection allowlist from utils/ssrf_protection.py
    - Only domains explicitly listed pass verification
    - Can be called by service (API key) for automated verification
    """
    try:
        # Fetch the embedding
        result = supabase.table("rag_embeddings").select(
            "id, source_url, source_domain, verification_status"
        ).eq("id", embedding_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Embedding not found: {embedding_id}",
            )

        embedding = result.data[0]
        source_url = embedding.get("source_url")

        if not source_url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Embedding has no source_url to verify",
            )

        # Check if validate_url is available
        if validate_url is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="SSRF validation module not available",
            )

        # Validate URL against SSRF allowlist
        validation_result = validate_url(
            source_url,
            require_allowlist=True,
            allow_http=False
        )

        now = datetime.now(timezone.utc)
        source_domain = _extract_domain(source_url)

        if validation_result.is_valid:
            # Update to source_verified status
            update_result = supabase.table("rag_embeddings").update({
                "verification_status": "source_verified",
                "source_verified_at": now.isoformat(),
                "source_verification_method": "ssrf_allowlist",
                "source_domain": source_domain,
            }).eq("id", embedding_id).execute()

            if not update_result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to update verification status",
                )

            return SourceVerificationResponse(
                id=embedding_id,
                verification_status=VerificationStatus.SOURCE_VERIFIED,
                source_url=source_url,
                source_domain=source_domain,
                resolved_ip=validation_result.resolved_ip,
                verified_at=now,
                verification_method="ssrf_allowlist",
                validation_failed=False,
            )
        else:
            # URL failed validation - keep as pending
            return SourceVerificationResponse(
                id=embedding_id,
                verification_status=VerificationStatus.PENDING,
                source_url=source_url,
                source_domain=source_domain,
                validation_failed=True,
                reason=validation_result.reason,
                message="Source URL failed SSRF validation. Requires manual review.",
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Source verification failed: {str(e)}",
        )
