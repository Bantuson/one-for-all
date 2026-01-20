"""
OTP Cryptographic Security Utilities

Provides cryptographically secure OTP generation and verification using:
- secrets module for CSPRNG-based OTP generation (not random.randint)
- bcrypt for one-way hashing of OTP codes before storage
- Constant-time comparison via bcrypt.checkpw() to prevent timing attacks

SECURITY PRINCIPLES:
- OTPs are NEVER stored in plaintext in the database
- OTPs are hashed with bcrypt (work factor 10) before storage
- Verification uses constant-time comparison to prevent timing side-channels
- Generation uses secrets.choice() which is cryptographically secure

References:
- CWE-330: Use of Insufficiently Random Values
- CWE-328: Use of Weak Hash
- CWE-208: Observable Timing Discrepancy
"""

import secrets
import string
import bcrypt
from typing import Tuple


# Bcrypt work factor - 10 provides good security/performance balance
# Each increment doubles the computation time
BCRYPT_WORK_FACTOR = 10


def generate_secure_otp(length: int = 6) -> str:
    """
    Generate a cryptographically secure OTP code.

    Uses secrets.choice() which sources randomness from os.urandom(),
    a cryptographically secure pseudo-random number generator (CSPRNG).
    This is suitable for security-sensitive applications unlike random.randint().

    Args:
        length: Number of digits in the OTP (default: 6)

    Returns:
        A string containing `length` cryptographically random digits

    Security:
        - Uses secrets module (CSPRNG) instead of random module (Mersenne Twister)
        - Each digit is independently and uniformly selected
        - Resistant to prediction attacks even if previous OTPs are known

    Example:
        >>> otp = generate_secure_otp()
        >>> len(otp)
        6
        >>> otp.isdigit()
        True
    """
    if length < 4:
        raise ValueError("OTP length must be at least 4 digits for security")
    if length > 10:
        raise ValueError("OTP length should not exceed 10 digits")

    # Use secrets.choice for cryptographically secure random selection
    digits = string.digits  # '0123456789'
    return ''.join(secrets.choice(digits) for _ in range(length))


def hash_otp(code: str) -> str:
    """
    Hash an OTP code using bcrypt for secure storage.

    Bcrypt is a password hashing function that incorporates:
    - A salt to prevent rainbow table attacks
    - A configurable work factor to resist brute force
    - A design that makes GPU acceleration difficult

    Args:
        code: The plaintext OTP code to hash

    Returns:
        The bcrypt hash as a string (safe for database storage)

    Security:
        - Work factor 10 = ~100ms on modern hardware
        - Salt is automatically generated and embedded in the hash
        - Hash output is 60 characters, always starts with $2b$

    Example:
        >>> hashed = hash_otp("123456")
        >>> hashed.startswith("$2b$")
        True
    """
    if not code or not isinstance(code, str):
        raise ValueError("OTP code must be a non-empty string")

    # Encode to bytes for bcrypt
    code_bytes = code.encode('utf-8')

    # Generate salt with specified work factor and hash
    salt = bcrypt.gensalt(rounds=BCRYPT_WORK_FACTOR)
    hashed = bcrypt.hashpw(code_bytes, salt)

    # Return as string for database storage
    return hashed.decode('utf-8')


def verify_otp_hash(code: str, hashed_code: str) -> bool:
    """
    Verify an OTP code against its bcrypt hash using constant-time comparison.

    Uses bcrypt.checkpw() which performs constant-time comparison to prevent
    timing attacks. An attacker cannot determine how many characters match
    by measuring response time.

    Args:
        code: The plaintext OTP code to verify
        hashed_code: The bcrypt hash from the database

    Returns:
        True if the code matches the hash, False otherwise

    Security:
        - Constant-time comparison prevents timing side-channel attacks
        - No information about partial matches is leaked
        - Same execution time for valid and invalid codes

    Example:
        >>> hashed = hash_otp("123456")
        >>> verify_otp_hash("123456", hashed)
        True
        >>> verify_otp_hash("654321", hashed)
        False
    """
    if not code or not isinstance(code, str):
        return False

    if not hashed_code or not isinstance(hashed_code, str):
        return False

    try:
        # Encode both to bytes
        code_bytes = code.encode('utf-8')
        hashed_bytes = hashed_code.encode('utf-8')

        # bcrypt.checkpw performs constant-time comparison internally
        return bcrypt.checkpw(code_bytes, hashed_bytes)

    except (ValueError, TypeError):
        # Invalid hash format or encoding error
        # Return False without revealing which error occurred
        return False


def generate_and_hash_otp(length: int = 6) -> Tuple[str, str]:
    """
    Generate a secure OTP and return both plaintext and hash.

    Convenience function for common use case of generating an OTP
    to send to the user while storing only the hash.

    Args:
        length: Number of digits in the OTP (default: 6)

    Returns:
        Tuple of (plaintext_otp, hashed_otp)
        - plaintext_otp: Send this to the user via SMS/email/WhatsApp
        - hashed_otp: Store this in the database

    Security:
        - Plaintext should only exist in memory temporarily
        - Only the hash should be persisted to storage
        - Plaintext should be transmitted over secure channels only

    Example:
        >>> plaintext, hashed = generate_and_hash_otp()
        >>> verify_otp_hash(plaintext, hashed)
        True
    """
    plaintext = generate_secure_otp(length)
    hashed = hash_otp(plaintext)
    return plaintext, hashed
