"""
Session API Tools

CrewAI tools for session management via the internal API.
Replaces direct Supabase access with validated API calls.
"""

from crewai.tools import tool

from .api_client import api_delete, api_get, api_patch, api_post


@tool
def create_session(applicant_id: str) -> str:
    """
    Create a new 24-hour session for an applicant after OTP verification.

    The session token should be stored and used for subsequent operations.

    Args:
        applicant_id: UUID of the applicant

    Returns:
        JSON string with session data including session_token, or error message

    Example:
        result = create_session("123e4567-e89b-12d3-a456-426614174000")
        # Returns: {"id": "...", "session_token": "abc123...", "expires_at": "..."}
    """
    result = api_post("/api/v1/sessions", {"applicant_id": applicant_id})

    if result.get("error"):
        return f"ERROR: {result.get('detail', 'Unknown error')}"

    return str(result)


@tool
def validate_session(session_token: str) -> str:
    """
    Validate a session token and check if it's still valid.

    Use this before any operation that requires authentication.

    Args:
        session_token: The session token to validate

    Returns:
        "VALID_SESSION::{applicant_id}" if valid
        "INVALID_SESSION::{reason}" if invalid or expired

    Example:
        result = validate_session("abc123...")
        if result.startswith("VALID_SESSION"):
            applicant_id = result.split("::")[1]
    """
    result = api_get(f"/api/v1/sessions/{session_token}")

    if result.get("error"):
        return f"INVALID_SESSION::{result.get('detail', 'Unknown error')}"

    if not result.get("valid", False):
        return f"INVALID_SESSION::{result.get('message', 'Session invalid')}"

    session = result.get("session", {})
    applicant_id = session.get("applicant_id", "unknown")

    return f"VALID_SESSION::{applicant_id}"


@tool
def extend_session(session_token: str, hours: int = 24) -> str:
    """
    Extend a session's expiry time.

    Use this to keep a session active during long application processes.
    Maximum extension is 72 hours.

    Args:
        session_token: The session token to extend
        hours: Number of hours to extend (1-72, default 24)

    Returns:
        JSON string with updated session data or error message

    Example:
        result = extend_session("abc123...", hours=48)
    """
    if hours < 1 or hours > 72:
        return "ERROR: Hours must be between 1 and 72"

    result = api_patch(
        f"/api/v1/sessions/{session_token}/extend",
        {"hours": hours}
    )

    if result.get("error"):
        return f"ERROR: {result.get('detail', 'Unknown error')}"

    return str(result)


@tool
def invalidate_session(session_token: str) -> str:
    """
    Invalidate (logout) a session.

    Use this when the applicant is done or wants to logout.

    Args:
        session_token: The session token to invalidate

    Returns:
        "SUCCESS" or error message

    Example:
        result = invalidate_session("abc123...")
    """
    result = api_delete(f"/api/v1/sessions/{session_token}")

    if result.get("error"):
        return f"ERROR: {result.get('detail', 'Unknown error')}"

    return "SUCCESS"
