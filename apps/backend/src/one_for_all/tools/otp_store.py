"""
OTP Storage Utility

Provides functions for generating, storing, and managing OTP codes in Supabase.

SECURITY ENHANCEMENTS (Phase 1):
- OTP generation now uses secrets module (CSPRNG) instead of random.randint
- OTPs are hashed with bcrypt before database storage
- Plaintext OTPs are never stored in the database

References:
- CWE-330: Use of Insufficiently Random Values
- CWE-328: Use of Weak Hash
"""

from datetime import datetime, timedelta
from typing import Optional, Tuple
from .supabase_client import supabase
from ..utils.db_audit import audit_service_role_access

# Import secure OTP functions from utils
from one_for_all.utils.otp_crypto import (
    generate_secure_otp,
    hash_otp,
    generate_and_hash_otp,
)


def generate_otp() -> str:
    """
    Generate a 6-digit OTP code using cryptographically secure randomness.

    SECURITY: Uses secrets.choice() (CSPRNG) instead of random.randint()
    which uses Mersenne Twister (predictable given sufficient output).

    Returns:
        A string containing a 6-digit cryptographically random numeric code
    """
    return generate_secure_otp(length=6)


@audit_service_role_access(table="otp_codes", operation="insert")
def store_otp(identifier: str, channel: str, code: str) -> bool:
    """
    Store OTP in database with 10-minute expiry.

    SECURITY: The OTP code is hashed with bcrypt before storage.
    Plaintext OTPs are NEVER stored in the database.

    Args:
        identifier: Email address or phone number where OTP was sent
        channel: Delivery channel ('email', 'sms', or 'whatsapp')
        code: The 6-digit OTP code (plaintext - will be hashed before storage)

    Returns:
        True if storage successful, False otherwise
    """
    if not supabase:
        print("ERROR: Supabase client not configured")
        return False

    try:
        expires_at = (datetime.utcnow() + timedelta(minutes=10)).isoformat()

        # SECURITY: Hash the OTP before storing in database
        # This prevents exposure of plaintext OTPs if database is compromised
        hashed_code = hash_otp(code)

        result = supabase.table("otp_codes").insert({
            "identifier": identifier,
            "channel": channel,
            "code": hashed_code,  # Store bcrypt hash, not plaintext
            "expires_at": expires_at,
            "attempts": 0
        }).execute()

        if result.data:
            print(f"OTP stored successfully (hashed) for {identifier} via {channel}")
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
