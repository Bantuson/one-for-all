"""
Session Schemas

Pydantic models for applicant session management.
Sessions are 24-hour TTL tokens for OTP-authenticated applicants.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    """Schema for creating a new session."""

    applicant_id: UUID = Field(..., description="ID of the applicant")


class SessionExtend(BaseModel):
    """Schema for extending a session."""

    hours: int = Field(
        default=24,
        ge=1,
        le=72,
        description="Number of hours to extend the session (max 72)",
    )


class SessionResponse(BaseModel):
    """Schema for session response."""

    id: UUID
    applicant_id: UUID
    session_token: str
    created_at: datetime
    expires_at: datetime
    is_valid: bool = Field(
        default=True,
        description="Whether the session is still valid (not expired)",
    )

    model_config = {"from_attributes": True}


class SessionValidation(BaseModel):
    """Schema for session validation response."""

    valid: bool
    session: Optional[SessionResponse] = None
    message: str = Field(default="", description="Validation message")


class SessionRotateResponse(BaseModel):
    """Schema for session token rotation response (H4 security)."""

    new_token: str = Field(..., description="The newly generated session token")
    old_token: str = Field(..., description="The previous token (now stored as refresh_token)")
    token_version: int = Field(..., description="Incremented token version number")
    expires_at: datetime = Field(..., description="Session expiry (unchanged by rotation)")
    message: str = Field(default="", description="Rotation status message")
