"""
Application Schemas

Pydantic models for university application operations.
"""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


def sanitize_json(obj: Any) -> Any:
    """Remove potentially dangerous keys from JSON objects."""
    dangerous_keys = {"__proto__", "constructor", "prototype", "__class__"}

    if isinstance(obj, dict):
        return {
            k: sanitize_json(v)
            for k, v in obj.items()
            if k not in dangerous_keys
        }
    elif isinstance(obj, list):
        return [sanitize_json(item) for item in obj]
    return obj


class ApplicationCreate(BaseModel):
    """Schema for creating a new university application."""

    applicant_id: UUID = Field(..., description="ID of the applicant")
    session_token: str = Field(
        ...,
        min_length=10,
        description="Valid session token for authentication",
    )

    # University details
    university_name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Name of the university",
    )
    faculty: Optional[str] = Field(None, max_length=100)
    qualification_type: Optional[str] = Field(None, max_length=50)
    program: Optional[str] = Field(None, max_length=100)
    year: Optional[int] = Field(None, ge=2024, le=2030)

    # Application data
    personal_info: dict = Field(..., description="Personal information JSON")
    academic_info: dict = Field(..., description="Academic history JSON")
    submission_payload: Optional[dict] = Field(
        None,
        description="Raw submission payload sent to university",
    )

    # Multi-tenant fields (optional)
    institution_id: Optional[UUID] = Field(
        None,
        description="Institution ID for multi-tenant applications",
    )
    course_id: Optional[UUID] = Field(
        None,
        description="Specific course ID if known",
    )

    @field_validator("personal_info", "academic_info", "submission_payload")
    @classmethod
    def sanitize_json_fields(cls, v: Optional[dict]) -> Optional[dict]:
        """Remove potentially dangerous keys from JSON fields."""
        if v is None:
            return None
        return sanitize_json(v)


class ApplicationStatusUpdate(BaseModel):
    """Schema for updating application status."""

    status: str = Field(
        ...,
        description="New status for the application",
    )
    notes: Optional[str] = Field(
        None,
        max_length=1000,
        description="Optional notes about the status change",
    )

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        """Validate status is one of the allowed values."""
        allowed_statuses = {
            "draft",
            "submitted",
            "under_review",
            "accepted",
            "rejected",
            "waitlisted",
            "withdrawn",
        }
        if v.lower() not in allowed_statuses:
            raise ValueError(
                f"Invalid status. Must be one of: {', '.join(allowed_statuses)}"
            )
        return v.lower()


class ApplicationResponse(BaseModel):
    """Schema for application response."""

    id: UUID
    applicant_id: UUID
    university_name: str
    faculty: Optional[str] = None
    qualification_type: Optional[str] = None
    program: Optional[str] = None
    year: Optional[int] = None
    personal_info: dict
    academic_info: dict
    submission_payload: Optional[dict] = None
    status: str = "submitted"
    institution_id: Optional[UUID] = None
    course_id: Optional[UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class DocumentCreate(BaseModel):
    """Schema for creating an application document."""

    document_type: str = Field(
        ...,
        description="Type of document (e.g., 'id_document', 'transcript')",
    )
    file_url: str = Field(..., description="URL of the uploaded document")
    file_name: Optional[str] = Field(None, max_length=255)

    @field_validator("document_type")
    @classmethod
    def validate_document_type(cls, v: str) -> str:
        """Validate document type is one of the allowed values."""
        allowed_types = {
            "id_document",
            "passport",
            "matric_certificate",
            "transcript",
            "proof_of_residence",
            "motivation_letter",
            "recommendation_letter",
            "portfolio",
            "other",
        }
        if v.lower() not in allowed_types:
            raise ValueError(
                f"Invalid document type. Must be one of: {', '.join(allowed_types)}"
            )
        return v.lower()


class DocumentResponse(BaseModel):
    """Schema for document response."""

    id: UUID
    application_id: UUID
    document_type: str
    file_url: str
    file_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
