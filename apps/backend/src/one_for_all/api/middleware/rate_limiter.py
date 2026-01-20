"""
Rate Limiting Middleware

Uses slowapi for HTTP endpoint rate limiting.
Provides defense against brute force attacks and resource exhaustion.

Security Features:
- IP-based rate limiting for unauthenticated requests
- API key-based rate limiting for authenticated requests
- Custom limits per endpoint type (OTP, agent execution, general)
- Automatic retry-after headers for compliance
"""

import logging
from typing import Optional

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)


def get_identifier(request: Request) -> str:
    """
    Get rate limit identifier from API key or IP address.

    Priority:
    1. API key (truncated for privacy) - allows higher limits for authenticated clients
    2. IP address - default fallback for unauthenticated requests

    Returns:
        Unique identifier string for rate limiting bucket
    """
    # Check for API key header (used by backend services)
    api_key = request.headers.get("X-API-Key", "")
    if api_key:
        # Use first 16 chars of API key as identifier (privacy + uniqueness)
        return f"key:{api_key[:16]}"

    # Check for forwarded IP (behind proxy/load balancer)
    forwarded_for = request.headers.get("X-Forwarded-For", "")
    if forwarded_for:
        # Take first IP in chain (original client)
        client_ip = forwarded_for.split(",")[0].strip()
        return f"ip:{client_ip}"

    # Fall back to direct IP
    return f"ip:{get_remote_address(request)}"


def get_identifier_strict(request: Request) -> str:
    """
    Stricter identifier for sensitive endpoints (OTP, auth).

    Uses IP address regardless of API key to prevent abuse
    from compromised API keys.
    """
    # Check for forwarded IP first
    forwarded_for = request.headers.get("X-Forwarded-For", "")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
        return f"strict:{client_ip}"

    return f"strict:{get_remote_address(request)}"


# Create limiter instance with custom key function
limiter = Limiter(key_func=get_identifier)


async def rate_limit_exceeded_handler(
    request: Request,
    exc: RateLimitExceeded
) -> JSONResponse:
    """
    Handle rate limit exceeded errors with proper security response.

    Returns:
        JSONResponse with 429 status and retry information
    """
    # Extract retry-after from exception if available
    retry_after = getattr(exc, 'retry_after', 60)

    # Log the rate limit hit for security monitoring
    identifier = get_identifier(request)
    logger.warning(
        f"Rate limit exceeded: {identifier} on {request.method} {request.url.path} - "
        f"Limit: {exc.detail}"
    )

    return JSONResponse(
        status_code=429,
        content={
            "error": "rate_limit_exceeded",
            "detail": str(exc.detail),
            "retry_after": retry_after,
            "message": "Too many requests. Please wait before retrying."
        },
        headers={
            "Retry-After": str(retry_after),
            "X-RateLimit-Remaining": "0"
        }
    )


# =============================================================================
# RATE LIMIT CONFIGURATIONS
# =============================================================================
# These are documented here for reference. Actual decorators are applied
# in router files.
#
# Endpoint Type          | Limit           | Window  | Rationale
# -----------------------|-----------------|---------|---------------------------
# Health check           | 60/minute       | 1 min   | Monitoring tools
# Agent execution        | 10/minute       | 1 min   | Resource intensive
# Session create         | 5/minute        | 1 min   | Prevent session flooding
# Session validate       | 30/minute       | 1 min   | Frequent during auth flow
# OTP send               | 3/15 minutes    | 15 min  | Prevent SMS/email spam
# OTP verify             | 5/5 minutes     | 5 min   | Prevent brute force
# Application CRUD       | 30/minute       | 1 min   | Normal operations
# RAG queries            | 20/minute       | 1 min   | LLM resource usage
# =============================================================================

# Export common limit strings for consistency
RATE_LIMITS = {
    "health": "60/minute",
    "agent_execute": "10/minute",
    "session_create": "5/minute",
    "session_validate": "30/minute",
    "session_extend": "10/minute",
    "otp_send": "3/15 minutes",
    "otp_verify": "5/5 minutes",
    "application_crud": "30/minute",
    "rag_query": "20/minute",
    "default": "30/minute",
}
