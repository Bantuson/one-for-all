"""
NSFAS Schemas

Pydantic models for NSFAS (National Student Financial Aid Scheme) operations.
Contains sensitive financial information - handle with care.
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


class NsfasApplicationCreate(BaseModel):
    """Schema for creating a new NSFAS application."""

    applicant_id: UUID = Field(..., description="ID of the applicant")
    session_token: str = Field(
        ...,
        min_length=10,
        description="Valid session token for authentication",
    )

    # Reused from university application
    personal_info: dict = Field(..., description="Personal information JSON")
    academic_info: dict = Field(..., description="Academic history JSON")

    # NSFAS-specific fields
    guardian_info: dict = Field(
        ...,
        description="Guardian/parent information",
    )
    household_info: dict = Field(
        ...,
        description="Household composition and details",
    )
    income_info: dict = Field(
        ...,
        description="Household income information",
    )
    bank_details: dict = Field(
        ...,
        description="Bank account details for disbursement",
    )
    living_situation: Optional[dict] = Field(
        None,
        description="Current living situation details",
    )

    @field_validator(
        "personal_info",
        "academic_info",
        "guardian_info",
        "household_info",
        "income_info",
        "bank_details",
        "living_situation",
    )
    @classmethod
    def sanitize_json_fields(cls, v: Optional[dict]) -> Optional[dict]:
        """Remove potentially dangerous keys from JSON fields."""
        if v is None:
            return None
        return sanitize_json(v)

    @field_validator("bank_details")
    @classmethod
    def validate_bank_details(cls, v: dict) -> dict:
        """Validate required bank details fields are present."""
        required_fields = {"bank_name", "account_number", "account_type"}
        missing = required_fields - set(v.keys())
        if missing:
            raise ValueError(f"Missing required bank details: {', '.join(missing)}")
        return v


class NsfasApplicationResponse(BaseModel):
    """Schema for NSFAS application response."""

    id: UUID
    applicant_id: UUID
    personal_info: dict
    academic_info: dict
    guardian_info: dict
    household_info: dict
    income_info: dict
    # Note: bank_details excluded from response for security
    living_situation: Optional[dict] = None
    status: str = "submitted"
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class NsfasDocumentCreate(BaseModel):
    """Schema for creating an NSFAS document."""

    document_type: str = Field(
        ...,
        description="Type of NSFAS document",
    )
    file_url: str = Field(..., description="URL of the uploaded document")
    file_name: Optional[str] = Field(None, max_length=255)

    @field_validator("document_type")
    @classmethod
    def validate_document_type(cls, v: str) -> str:
        """Validate document type is one of the allowed NSFAS values."""
        allowed_types = {
            "id_document",
            "proof_of_income",
            "affidavit",
            "death_certificate",
            "disability_grant",
            "sassa_letter",
            "bank_statement",
            "payslip",
            "uif_document",
            "proof_of_registration",
            "consent_form",
            "other",
        }
        if v.lower() not in allowed_types:
            raise ValueError(
                f"Invalid NSFAS document type. Must be one of: {', '.join(allowed_types)}"
            )
        return v.lower()


class NsfasDocumentResponse(BaseModel):
    """Schema for NSFAS document response."""

    id: UUID
    nsfas_application_id: UUID
    document_type: str
    file_url: str
    file_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
