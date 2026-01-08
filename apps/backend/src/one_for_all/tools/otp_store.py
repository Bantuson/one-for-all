"""
OTP Storage Utility

Provides functions for generating, storing, and managing OTP codes in Supabase.
"""

import random
from datetime import datetime, timedelta
from typing import Optional
from .supabase_client import supabase


def generate_otp() -> str:
    """
    Generate a 6-digit OTP code.

    Returns:
        A string containing a 6-digit numeric code
    """
    return str(random.randint(100000, 999999))


def store_otp(identifier: str, channel: str, code: str) -> bool:
    """
    Store OTP in database with 10-minute expiry.

    Args:
        identifier: Email address or phone number where OTP was sent
        channel: Delivery channel ('email', 'sms', or 'whatsapp')
        code: The 6-digit OTP code

    Returns:
        True if storage successful, False otherwise
    """
    if not supabase:
        print("ERROR: Supabase client not configured")
        return False

    try:
        expires_at = (datetime.utcnow() + timedelta(minutes=10)).isoformat()

        result = supabase.table("otp_codes").insert({
            "identifier": identifier,
            "channel": channel,
            "code": code,
            "expires_at": expires_at,
            "attempts": 0
        }).execute()

        if result.data:
            print(f"OTP stored successfully for {identifier} via {channel}")
            return True
        else:
            print(f"OTP store failed: No data returned")
            return False

    except Exception as e:
        print(f"OTP store error: {str(e)}")
        return False


def cleanup_expired_otps() -> int:
    """
    Delete OTPs older than 1 hour (both expired and verified).
    This helps maintain database cleanliness and performance.

    Returns:
        Number of OTP records deleted
    """
    if not supabase:
        print("ERROR: Supabase client not configured")
        return 0

    try:
        cutoff = (datetime.utcnow() - timedelta(hours=1)).isoformat()

        # Delete OTPs that expired more than 1 hour ago
        result = supabase.table("otp_codes")\
            .delete()\
            .lt("expires_at", cutoff)\
            .execute()

        deleted_count = len(result.data) if result.data else 0
        if deleted_count > 0:
            print(f"Cleaned up {deleted_count} expired OTP records")

        return deleted_count

    except Exception as e:
        print(f"OTP cleanup error: {str(e)}")
        return 0


def get_active_otp(identifier: str, channel: Optional[str] = None) -> Optional[dict]:
    """
    Retrieve the most recent active (non-expired, unverified) OTP for an identifier.

    Args:
        identifier: Email address or phone number
        channel: Optional channel filter ('email', 'sms', 'whatsapp')

    Returns:
        OTP record dict if found, None otherwise
    """
    if not supabase:
        print("ERROR: Supabase client not configured")
        return None

    try:
        query = supabase.table("otp_codes")\
            .select("*")\
            .eq("identifier", identifier)\
            .is_("verified_at", "null")\
            .gte("expires_at", datetime.utcnow().isoformat())\
            .order("created_at", desc=True)\
            .limit(1)

        if channel:
            query = query.eq("channel", channel)

        result = query.execute()

        if result.data and len(result.data) > 0:
            return result.data[0]

        return None

    except Exception as e:
        print(f"Get active OTP error: {str(e)}")
        return None
