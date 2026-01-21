"""
Sessions Router

Session management for applicant OTP authentication.
Sessions have a 24-hour TTL by default.

SECURITY:
- Session creation rate limited to 5/minute (prevent session flooding)
- Session validation rate limited to 30/minute (allow frequent auth checks)
- Session extension rate limited to 10/minute
- IP address and user-agent tracked for hijacking detection (H4)
- Token rotation endpoint for secure session refresh
"""

import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, status

from ..dependencies import ApiKeyVerified, SupabaseClient
from ..middleware import limiter, RATE_LIMITS
from ..schemas.session import (
    SessionCreate,
    SessionExtend,
    SessionResponse,
    SessionRotateResponse,
    SessionValidation,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/sessions",
    tags=["sessions"],
)


def generate_session_token() -> str:
    """Generate a cryptographically secure session token."""
    return secrets.token_urlsafe(32)


def get_client_ip(request: Request) -> Optional[str]:
    """
    Extract client IP address from request headers.

    Priority:
    1. X-Forwarded-For header (first IP in chain - original client behind proxy)
    2. X-Real-IP header (common proxy header)
    3. Direct client host from request

    Returns:
        IP address string or None if not available
    """
    # Check for forwarded IP (behind proxy/load balancer)
    forwarded_for = request.headers.get("X-Forwarded-For", "")
    if forwarded_for:
        # Take first IP in chain (original client)
        return forwarded_for.split(",")[0].strip()

    # Check for X-Real-IP header
    real_ip = request.headers.get("X-Real-IP", "")
    if real_ip:
        return real_ip.strip()

    # Fall back to direct client
    if request.client and request.client.host:
        return request.client.host

    return None


def get_user_agent(request: Request) -> Optional[str]:
    """
    Extract User-Agent header from request.

    Returns:
        User-Agent string or None if not available
    """
    user_agent = request.headers.get("User-Agent", "")
    # Truncate to reasonable length (prevent storage bloat from malicious headers)
    if user_agent:
        return user_agent[:512]
    return None


@router.post(
    "/",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit(RATE_LIMITS["session_create"])
async def create_session(
    request: Request,  # Required by slowapi for rate limiting
    session: SessionCreate,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Create a new 24-hour session for an applicant.

    Used by identity_auth_agent after successful OTP verification.
    Generates a secure session token for subsequent requests.

    Security (H4):
    - Captures client IP and user-agent at session creation
    - Stores created_ip_address as baseline for hijacking detection
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

    # Extract security context from request (H4)
    client_ip = get_client_ip(request)
    user_agent = get_user_agent(request)

    # Build session data with security fields
    session_insert = {
        "applicant_id": str(session.applicant_id),
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "token_version": 1,
        "last_activity_at": datetime.now(timezone.utc).isoformat(),
    }

    # Add IP and user-agent if available
    if client_ip:
        session_insert["ip_address"] = client_ip
        session_insert["created_ip_address"] = client_ip
    if user_agent:
        session_insert["user_agent"] = user_agent

    # Create session
    result = (
        supabase.table("applicant_sessions")
        .insert(session_insert)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create session",
        )

    logger.info(
        f"Session created for applicant {session.applicant_id} "
        f"from IP {client_ip or 'unknown'}"
    )

    session_data = result.data[0]
    session_data["is_valid"] = True
    return session_data


@router.get("/{token}", response_model=SessionValidation)
@limiter.limit(RATE_LIMITS["session_validate"])
async def validate_session(
    request: Request,  # Required by slowapi for rate limiting
    token: str,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Validate a session token and check if it's expired.

    Returns validation result with session data if valid.
    Used by agents to verify session before operations.

    Security (H4):
    - Compares request IP with stored session IP
    - Logs warnings on IP mismatch (potential hijacking)
    - Updates last_activity_at and current ip_address
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

    # Security check: Compare request IP with stored session IP (H4)
    current_ip = get_client_ip(request)
    stored_ip = session.get("ip_address")
    created_ip = session.get("created_ip_address")

    if current_ip and created_ip and current_ip != created_ip:
        # Log IP change as potential security concern
        logger.warning(
            f"Session IP mismatch detected for session {session['id']}: "
            f"created_ip={created_ip}, current_ip={current_ip}, "
            f"applicant_id={session.get('applicant_id')}"
        )

    # Update session with current IP and activity timestamp
    update_data = {"last_activity_at": now.isoformat()}
    if current_ip:
        update_data["ip_address"] = current_ip

    # Non-blocking update (don't fail validation if update fails)
    try:
        supabase.table("applicant_sessions").update(update_data).eq(
            "session_token", token
        ).execute()
    except Exception as e:
        logger.error(f"Failed to update session activity: {e}")

    session["is_valid"] = True
    return SessionValidation(
        valid=True,
        session=session,
        message="Session valid",
    )


@router.patch("/{token}/extend", response_model=SessionResponse)
@limiter.limit(RATE_LIMITS["session_extend"])
async def extend_session(
    request: Request,  # Required by slowapi for rate limiting
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
@limiter.limit(RATE_LIMITS["default"])
async def invalidate_session(
    request: Request,  # Required by slowapi for rate limiting
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


@router.post("/{token}/rotate", response_model=SessionRotateResponse)
@limiter.limit(RATE_LIMITS["session_create"])
async def rotate_session_token(
    request: Request,  # Required by slowapi for rate limiting
    token: str,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Rotate a session token for enhanced security.

    Security (H4):
    - Validates the current session is active and not expired
    - Generates a new cryptographically secure token
    - Increments token_version to track rotation history
    - Stores the old token as refresh_token (one-time fallback)
    - Returns the new token for client to use

    Use cases:
    - Periodic token refresh during long sessions
    - After sensitive operations (password change, etc.)
    - When IP change detected but session should continue
    """
    # Find and validate current session
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
    expires_at = datetime.fromisoformat(session["expires_at"].replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)

    # Check if expired
    if expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot rotate expired session",
        )

    # Generate new token
    new_token = generate_session_token()
    current_version = session.get("token_version", 1)
    new_version = current_version + 1

    # Extract current request context
    current_ip = get_client_ip(request)
    current_user_agent = get_user_agent(request)

    # Build update data
    update_data = {
        "session_token": new_token,
        "token_version": new_version,
        "refresh_token": token,  # Store old token for one-time fallback
        "last_activity_at": now.isoformat(),
    }

    # Update IP if available
    if current_ip:
        update_data["ip_address"] = current_ip
    if current_user_agent:
        update_data["user_agent"] = current_user_agent

    # Perform atomic update
    update_result = (
        supabase.table("applicant_sessions")
        .update(update_data)
        .eq("id", str(session["id"]))
        .execute()
    )

    if not update_result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to rotate session token",
        )

    logger.info(
        f"Session token rotated for session {session['id']}: "
        f"version {current_version} -> {new_version}, "
        f"IP: {current_ip or 'unknown'}"
    )

    updated_session = update_result.data[0]
    return SessionRotateResponse(
        new_token=new_token,
        old_token=token,
        token_version=new_version,
        expires_at=updated_session["expires_at"],
        message="Session token rotated successfully",
    )
