"""
OTP Verification Tool

CrewAI tool for verifying OTP codes against the database.

SECURITY:
- Rate limited to 5 verification attempts per 5 minutes per identifier
- Prevents brute force attacks on OTP codes (CWE-307)
- Combined with database-level attempt tracking for defense in depth
- Uses bcrypt constant-time comparison to prevent timing attacks (CWE-208)
- OTPs are stored as bcrypt hashes, never in plaintext
"""

from datetime import datetime
from crewai.tools import tool
from .supabase_client import supabase
from ..utils.db_audit import audit_service_role_access

# Import rate limiter for brute force protection
from one_for_all.utils.rate_limit import tool_limiter, ToolRateLimits, check_tool_rate_limit

# Import secure OTP verification
from one_for_all.utils.otp_crypto import verify_otp_hash


@audit_service_role_access(table="otp_codes", operation="select")
@tool
def verify_otp(identifier: str, code: str) -> str:
    """
    Verify an OTP code against the database using constant-time comparison.

    SECURITY:
    - Rate limited to 5 attempts per 5 minutes per identifier (CWE-307)
    - Uses bcrypt.checkpw() for constant-time comparison (CWE-208)
    - Queries by identifier ONLY, then verifies hash in application code
    - This prevents timing side-channel attacks that could leak partial matches

    Args:
        identifier: Email or phone number the OTP was sent to
        code: The 6-digit code to verify

    Returns:
        "OTP_VALID" if successful, "OTP_INVALID: reason" if not
    """
    if not supabase:
        return "OTP_INVALID: Supabase client not configured"

    # SECURITY: Check rate limit before database query
    # This prevents brute force even if attacker bypasses DB attempt limit
    allowed, error_msg = check_tool_rate_limit(
        identifier=identifier,
        action="otp_verify",
        config=ToolRateLimits.OTP_VERIFY
    )
    if not allowed:
        return f"OTP_INVALID: {error_msg}"

    try:
        # SECURITY: Query by identifier ONLY, not by code
        # This prevents database-level timing attacks where query time
        # could reveal information about partial code matches
        result = supabase.table("otp_codes")\
            .select("*")\
            .eq("identifier", identifier)\
            .is_("verified_at", "null")\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()

        if not result.data or len(result.data) == 0:
            return "OTP_INVALID: No active OTP found for this identifier"

        otp_record = result.data[0]

        # Check if expired BEFORE attempting hash verification
        expires_at = datetime.fromisoformat(otp_record["expires_at"].replace("Z", "+00:00"))
        if datetime.now(expires_at.tzinfo) > expires_at:
            return "OTP_INVALID: Code has expired"

        # Check attempt limit (database-level defense in depth)
        if otp_record["attempts"] >= 3:
            return "OTP_INVALID: Maximum verification attempts exceeded"

        # Increment attempt counter BEFORE verification (fail-safe)
        supabase.table("otp_codes")\
            .update({"attempts": otp_record["attempts"] + 1})\
            .eq("id", otp_record["id"])\
            .execute()

        # SECURITY: Use bcrypt constant-time comparison
        # This prevents timing attacks that could reveal partial matches
        stored_hash = otp_record["code"]
        if not verify_otp_hash(code, stored_hash):
            return "OTP_INVALID: Incorrect code"

        # Mark as verified (code matched)
        supabase.table("otp_codes")\
            .update({"verified_at": datetime.utcnow().isoformat()})\
            .eq("id", otp_record["id"])\
            .execute()

        # SECURITY: Reset rate limit on successful verification
        # This allows user to start fresh on next auth cycle
        tool_limiter.reset(identifier=identifier, action="otp_verify")

        return "OTP_VALID"

    except Exception as e:
        return f"OTP_INVALID: Verification error - {str(e)}"


@audit_service_role_access(table="otp_codes", operation="select")
@tool
def check_otp_status(identifier: str) -> str:
    """
    Check if there's an active (unexpired, unverified) OTP for an identifier.

    Args:
        identifier: Email or phone number to check

    Returns:
        Status message indicating if an active OTP exists
    """
    if not supabase:
        return "ERROR: Supabase client not configured"

    try:
        result = supabase.table("otp_codes")\
            .select("*")\
            .eq("identifier", identifier)\
            .is_("verified_at", "null")\
            .gte("expires_at", datetime.utcnow().isoformat())\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()

        if result.data and len(result.data) > 0:
            otp = result.data[0]
            expires_at = datetime.fromisoformat(otp["expires_at"].replace("Z", "+00:00"))
            time_remaining = (expires_at - datetime.now(expires_at.tzinfo)).total_seconds() / 60

            return f"ACTIVE_OTP: Code sent via {otp['channel']}. {time_remaining:.1f} minutes remaining. Attempts: {otp['attempts']}/3"

        return "NO_ACTIVE_OTP: No active OTP found for this identifier"

    except Exception as e:
        return f"ERROR: Status check failed - {str(e)}"


@audit_service_role_access(table="otp_codes", operation="select")
@tool
def resend_otp_check(identifier: str) -> str:
    """
    Check if it's safe to resend an OTP (no active OTP exists or previous one expired).

    Args:
        identifier: Email or phone number

    Returns:
        "RESEND_OK" if safe to resend, or "WAIT: reason" if should wait
    """
    if not supabase:
        return "ERROR: Supabase client not configured"

    try:
        result = supabase.table("otp_codes")\
            .select("*")\
            .eq("identifier", identifier)\
            .is_("verified_at", "null")\
            .gte("expires_at", datetime.utcnow().isoformat())\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()

        if result.data and len(result.data) > 0:
            otp = result.data[0]
            expires_at = datetime.fromisoformat(otp["expires_at"].replace("Z", "+00:00"))
            time_remaining = (expires_at - datetime.now(expires_at.tzinfo)).total_seconds() / 60

            return f"WAIT: Active OTP exists with {time_remaining:.1f} minutes remaining. Please use the existing code or wait for expiry."

        return "RESEND_OK: No active OTP found. Safe to generate and send a new code."

    except Exception as e:
        return f"ERROR: Resend check failed - {str(e)}"
