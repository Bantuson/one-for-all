"""
RAG Verification Schemas

Pydantic models for RAG content verification API operations.
Provides request/response schemas for the verification workflow.

Security Features:
- Strong typing for verification status enum
- Required fields for rejection reason
- Sanitized response schemas (no sensitive data exposure)
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class VerificationStatus(str, Enum):
    """Allowed verification status values."""

    PENDING = "pending"
    SOURCE_VERIFIED = "source_verified"
    APPROVED = "approved"
    REJECTED = "rejected"


class VerificationMethod(str, Enum):
    """Methods used to verify RAG content."""

    SSRF_ALLOWLIST = "ssrf_allowlist"
    MANUAL_REVIEW = "manual_review"
    TRUSTED_SOURCE = "trusted_source"


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================


class RAGApproveRequest(BaseModel):
    """Request schema for approving a RAG embedding."""

    approver_id: UUID = Field(
        ...,
        description="UUID of the user approving the content",
    )

    model_config = {"json_schema_extra": {"example": {"approver_id": "550e8400-e29b-41d4-a716-446655440000"}}}


class RAGRejectRequest(BaseModel):
    """Request schema for rejecting a RAG embedding."""

    reason: str = Field(
        ...,
        min_length=5,
        max_length=500,
        description="Required explanation for rejection",
    )

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, v: str) -> str:
        """Ensure reason is not just whitespace."""
        if not v.strip():
            raise ValueError("Rejection reason cannot be empty or whitespace only")
        return v.strip()

    model_config = {
        "json_schema_extra": {
            "example": {"reason": "Content from untrusted source - domain not in allowlist"}
        }
    }


class RAGAuditRequest(BaseModel):
    """Request schema for triggering RAG integrity audit."""

    limit: int = Field(
        default=1000,
        ge=1,
        le=10000,
        description="Maximum number of embeddings to audit",
    )
    domain_filter: Optional[str] = Field(
        None,
        max_length=100,
        description="Optional filter by source domain",
    )


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================


class PendingEmbeddingItem(BaseModel):
    """Schema for a single pending embedding in the list."""

    id: UUID
    source_url: Optional[str] = None
    source_domain: Optional[str] = None
    verification_status: VerificationStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class PendingVerificationResponse(BaseModel):
    """Response schema for listing pending verifications."""

    pending_count: int = Field(
        ...,
        ge=0,
        description="Number of embeddings pending verification",
    )
    embeddings: List[PendingEmbeddingItem] = Field(
        default_factory=list,
        description="List of pending embeddings",
    )
    message: Optional[str] = Field(
        None,
        description="Optional status message",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "pending_count": 2,
                "embeddings": [
                    {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "source_url": "https://www.up.ac.za/courses",
                        "source_domain": "up.ac.za",
                        "verification_status": "pending",
                        "created_at": "2026-01-21T10:00:00Z",
                    }
                ],
                "message": None,
            }
        }
    }


class ApprovalResponse(BaseModel):
    """Response schema for embedding approval."""

    id: UUID
    verification_status: VerificationStatus
    approved_by: UUID
    approved_at: datetime
    previous_status: VerificationStatus
    message: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "verification_status": "approved",
                "approved_by": "user-uuid-here",
                "approved_at": "2026-01-21T12:00:00Z",
                "previous_status": "source_verified",
                "message": "Embedding approved for production use",
            }
        }
    }


class RejectionResponse(BaseModel):
    """Response schema for embedding rejection."""

    id: UUID
    verification_status: VerificationStatus
    rejection_reason: str
    previous_status: VerificationStatus
    message: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "verification_status": "rejected",
                "rejection_reason": "Content from untrusted source",
                "previous_status": "pending",
                "message": "Embedding rejected and will not be used in queries",
            }
        }
    }


class HashMismatchItem(BaseModel):
    """Schema for a hash mismatch found during audit."""

    id: UUID
    stored_hash_preview: str = Field(
        ...,
        description="Truncated stored hash for reference",
    )
    computed_hash_preview: str = Field(
        ...,
        description="Truncated computed hash for comparison",
    )


class AuditResponse(BaseModel):
    """Response schema for RAG integrity audit."""

    total_audited: int = Field(
        ...,
        ge=0,
        description="Number of embeddings checked",
    )
    passed: int = Field(
        ...,
        ge=0,
        description="Number with matching hashes",
    )
    failed: int = Field(
        ...,
        ge=0,
        description="Number with mismatching hashes",
    )
    missing_hash: int = Field(
        ...,
        ge=0,
        description="Number without stored hashes (legacy data)",
    )
    integrity_percentage: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Percentage of verified embeddings that passed",
    )
    mismatches: List[HashMismatchItem] = Field(
        default_factory=list,
        description="List of embeddings with hash mismatches (limited)",
    )
    message: str = Field(
        ...,
        description="Audit summary message",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "total_audited": 500,
                "passed": 495,
                "failed": 2,
                "missing_hash": 3,
                "integrity_percentage": 99.60,
                "mismatches": [
                    {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "stored_hash_preview": "a1b2c3d4e5f6...",
                        "computed_hash_preview": "f6e5d4c3b2a1...",
                    }
                ],
                "message": "INTEGRITY ALERT: 2 embeddings have hash mismatches. Manual review required.",
            }
        }
    }


class SourceVerificationResponse(BaseModel):
    """Response schema for source URL verification."""

    id: UUID
    verification_status: VerificationStatus
    source_url: str
    source_domain: Optional[str] = None
    resolved_ip: Optional[str] = None
    verified_at: Optional[datetime] = None
    verification_method: Optional[VerificationMethod] = None
    validation_failed: bool = Field(
        default=False,
        description="True if URL failed SSRF validation",
    )
    reason: Optional[str] = Field(
        None,
        description="Reason for validation failure (if any)",
    )
    message: Optional[str] = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "verification_status": "source_verified",
                "source_url": "https://www.up.ac.za/courses",
                "source_domain": "up.ac.za",
                "resolved_ip": "196.24.164.1",
                "verified_at": "2026-01-21T11:00:00Z",
                "verification_method": "ssrf_allowlist",
                "validation_failed": False,
                "reason": None,
                "message": None,
            }
        }
    }


class ErrorResponse(BaseModel):
    """Standard error response schema."""

    error: str = Field(
        ...,
        description="Error message describing what went wrong",
    )
    detail: Optional[str] = Field(
        None,
        description="Additional error details",
    )
    embedding_id: Optional[UUID] = Field(
        None,
        description="Embedding ID if applicable",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "error": "Embedding not found",
                "detail": "No embedding exists with the specified ID",
                "embedding_id": "550e8400-e29b-41d4-a716-446655440000",
            }
        }
    }
