"""
Applicant Schemas

Pydantic models for applicant account operations.
These are WhatsApp/Twilio users who interact with CrewAI agents.
"""

import re
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


class ApplicantCreate(BaseModel):
    """Schema for creating a new applicant account."""

    username: Optional[str] = Field(
        None,
        min_length=3,
        max_length=50,
        description="Optional username for the applicant",
    )
    email: EmailStr = Field(..., description="Applicant's email address")
    cellphone: str = Field(
        ...,
        min_length=10,
        max_length=15,
        description="South African phone number",
    )

    @field_validator("cellphone")
    @classmethod
    def validate_cellphone(cls, v: str) -> str:
        """Validate and normalize South African phone number."""
        # Remove spaces and dashes
        cleaned = re.sub(r"[\s\-]", "", v)

        # South African phone number patterns:
        # +27 6/7/8 XXXXXXXX (international)
        # 0 6/7/8 XXXXXXXX (local)
        pattern = r"^(\+27|0)[6-8][0-9]{8}$"

        if not re.match(pattern, cleaned):
            raise ValueError(
                "Invalid South African phone number. "
                "Expected format: +27XXXXXXXXX or 0XXXXXXXXX"
            )

        # Normalize to international format
        if cleaned.startswith("0"):
            cleaned = "+27" + cleaned[1:]

        return cleaned

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: Optional[str]) -> Optional[str]:
        """Validate username format if provided."""
        if v is None:
            return None

        # Only allow alphanumeric and underscores
        if not re.match(r"^[a-zA-Z0-9_]+$", v):
            raise ValueError(
                "Username can only contain letters, numbers, and underscores"
            )
        return v.lower()


class ApplicantLookup(BaseModel):
    """Schema for looking up an applicant."""

    email: Optional[EmailStr] = Field(None, description="Email to search for")
    cellphone: Optional[str] = Field(None, description="Phone number to search for")

    @field_validator("cellphone")
    @classmethod
    def validate_cellphone(cls, v: Optional[str]) -> Optional[str]:
        """Normalize phone number for lookup."""
        if v is None:
            return None

        cleaned = re.sub(r"[\s\-]", "", v)

        # Normalize to international format for consistent lookup
        if cleaned.startswith("0") and len(cleaned) == 10:
            cleaned = "+27" + cleaned[1:]

        return cleaned


class ApplicantResponse(BaseModel):
    """Schema for applicant response."""

    id: UUID
    username: Optional[str] = None
    email: EmailStr
    cellphone: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
