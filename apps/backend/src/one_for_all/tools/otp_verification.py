"""
OTP Verification Tool

CrewAI tool for verifying OTP codes against the database.
"""

from datetime import datetime
from crewai.tools import tool
from .supabase_client import supabase


@tool
def verify_otp(identifier: str, code: str) -> str:
    """
    Verify an OTP code against the database.

    Args:
        identifier: Email or phone number the OTP was sent to
        code: The 6-digit code to verify

    Returns:
        "OTP_VALID" if successful, "OTP_INVALID: reason" if not
    """
    if not supabase:
        return "OTP_INVALID: Supabase client not configured"

    try:
        # Find matching OTP
        result = supabase.table("otp_codes")\
            .select("*")\
            .eq("identifier", identifier)\
            .eq("code", code)\
            .is_("verified_at", "null")\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()

        if not result.data or len(result.data) == 0:
            return "OTP_INVALID: Code not found or already used"

        otp_record = result.data[0]

        # Check if expired
        expires_at = datetime.fromisoformat(otp_record["expires_at"].replace("Z", "+00:00"))
        if datetime.now(expires_at.tzinfo) > expires_at:
            return "OTP_INVALID: Code has expired"

        # Check attempt limit
        if otp_record["attempts"] >= 3:
            return "OTP_INVALID: Maximum verification attempts exceeded"

        # Mark as verified
        supabase.table("otp_codes")\
            .update({
                "verified_at": datetime.utcnow().isoformat(),
                "attempts": otp_record["attempts"] + 1
            })\
            .eq("id", otp_record["id"])\
            .execute()

        return "OTP_VALID"

    except Exception as e:
        return f"OTP_INVALID: Verification error - {str(e)}"


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
