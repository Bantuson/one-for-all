"""
Sessions Router

Session management for applicant OTP authentication.
Sessions have a 24-hour TTL by default.
"""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, status

from ..dependencies import ApiKeyVerified, SupabaseClient
from ..schemas.session import (
    SessionCreate,
    SessionExtend,
    SessionResponse,
    SessionValidation,
)

router = APIRouter(
    prefix="/api/v1/sessions",
    tags=["sessions"],
)


def generate_session_token() -> str:
    """Generate a cryptographically secure session token."""
    return secrets.token_urlsafe(32)


@router.post(
    "/",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_session(
    session: SessionCreate,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Create a new 24-hour session for an applicant.

    Used by identity_auth_agent after successful OTP verification.
    Generates a secure session token for subsequent requests.
    """
    # Verify applicant exists
    applicant = (
        supabase.table("applicant_accounts")
        .select("id")
        .eq("id", str(session.applicant_id))
        .execute()
    )

    if not applicant.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Applicant {session.applicant_id} not found",
        )

    # Generate session token and expiry
    session_token = generate_session_token()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

    # Create session
    result = (
        supabase.table("applicant_sessions")
        .insert(
            {
                "applicant_id": str(session.applicant_id),
                "session_token": session_token,
                "expires_at": expires_at.isoformat(),
            }
        )
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create session",
        )

    session_data = result.data[0]
    session_data["is_valid"] = True
    return session_data


@router.get("/{token}", response_model=SessionValidation)
async def validate_session(
    token: str,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Validate a session token and check if it's expired.

    Returns validation result with session data if valid.
    Used by agents to verify session before operations.
    """
    result = (
        supabase.table("applicant_sessions")
        .select("*")
        .eq("session_token", token)
        .execute()
    )

    if not result.data:
        return SessionValidation(
            valid=False,
            session=None,
            message="Session not found",
        )

    session = result.data[0]
    expires_at = datetime.fromisoformat(session["expires_at"].replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)

    if expires_at <= now:
        return SessionValidation(
            valid=False,
            session=None,
            message="Session expired",
        )

    session["is_valid"] = True
    return SessionValidation(
        valid=True,
        session=session,
        message="Session valid",
    )


@router.patch("/{token}/extend", response_model=SessionResponse)
async def extend_session(
    token: str,
    extend: SessionExtend,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Extend a session's expiry time.

    Default extension is 24 hours, max 72 hours.
    Used to keep sessions active during long application processes.
    """
    # Find existing session
    result = (
        supabase.table("applicant_sessions")
        .select("*")
        .eq("session_token", token)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    session = result.data[0]
    current_expiry = datetime.fromisoformat(
        session["expires_at"].replace("Z", "+00:00")
    )
    now = datetime.now(timezone.utc)

    # Check if already expired
    if current_expiry <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot extend expired session",
        )

    # Calculate new expiry (from now, not from current expiry)
    new_expiry = now + timedelta(hours=extend.hours)

    # Update session
    update_result = (
        supabase.table("applicant_sessions")
        .update({"expires_at": new_expiry.isoformat()})
        .eq("session_token", token)
        .execute()
    )

    if not update_result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to extend session",
        )

    updated_session = update_result.data[0]
    updated_session["is_valid"] = True
    return updated_session


@router.delete("/{token}", status_code=status.HTTP_204_NO_CONTENT)
async def invalidate_session(
    token: str,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Invalidate (delete) a session.

    Used for logout or session cleanup.
    """
    result = (
        supabase.table("applicant_sessions")
        .delete()
        .eq("session_token", token)
        .execute()
    )

    # No error if session doesn't exist - idempotent operation
    return None
