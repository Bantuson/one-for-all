"""Utility modules for One For All backend."""

from .sanitization import (
    sanitize_for_prompt,
    sanitize_dict_for_prompt,
    INJECTION_PATTERNS,
)
from .rate_limit import (
    InMemoryRateLimiter,
    tool_limiter,
    ToolRateLimits,
    check_tool_rate_limit,
)
from .db_audit import (
    audit_service_role_access,
    audit_service_role_access_async,
    log_service_role_init,
    service_role_metrics,
    ServiceRoleAccessMetrics,
)
from .otp_crypto import (
    generate_secure_otp,
    hash_otp,
    verify_otp_hash,
    generate_and_hash_otp,
    BCRYPT_WORK_FACTOR,
)

__all__ = [
    # Sanitization
    "sanitize_for_prompt",
    "sanitize_dict_for_prompt",
    "INJECTION_PATTERNS",
    # Rate limiting
    "InMemoryRateLimiter",
    "tool_limiter",
    "ToolRateLimits",
    "check_tool_rate_limit",
    # Security audit logging
    "audit_service_role_access",
    "audit_service_role_access_async",
    "log_service_role_init",
    "service_role_metrics",
    "ServiceRoleAccessMetrics",
    # OTP cryptographic security
    "generate_secure_otp",
    "hash_otp",
    "verify_otp_hash",
    "generate_and_hash_otp",
    "BCRYPT_WORK_FACTOR",
]
