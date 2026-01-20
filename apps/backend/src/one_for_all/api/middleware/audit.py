"""
Enhanced Audit Logging Middleware

Logs all API requests for security auditing and debugging with:
- Structured JSON or text output for log aggregators
- User and tenant context extraction from request.state
- PII masking for URLs and sensitive data
- Failed authentication attempt tracking
- Categorized audit events for security monitoring

This middleware integrates with the TenantIsolationMiddleware to include
user_id, institution_id, and role in audit logs when available.
"""

import logging
import time
import uuid
from typing import Callable, Optional

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from ...utils.audit_logger import (
    AuditEvent,
    audit_logger,
    mask_url_path,
)

# Keep legacy logger for backward compatibility during transition
legacy_logger = logging.getLogger("api.audit")
legacy_logger.setLevel(logging.INFO)

# Add handler if not already configured
if not legacy_logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(
        logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    )
    legacy_logger.addHandler(handler)


def _extract_tenant_context(request: Request) -> dict:
    """
    Extract tenant context from request.state if available.

    The TenantIsolationMiddleware injects a TenantContext object into
    request.state.tenant_context after successful authentication.

    Returns:
        Dictionary with user_id, institution_id, and role (or None values)
    """
    context = {
        "user_id": None,
        "institution_id": None,
        "role": None,
    }

    # Check for tenant_context set by TenantIsolationMiddleware
    if hasattr(request.state, "tenant_context"):
        tenant_ctx = request.state.tenant_context
        if tenant_ctx:
            # TenantContext uses UUID types, convert to string
            context["user_id"] = str(tenant_ctx.user_id) if tenant_ctx.user_id else None
            context["institution_id"] = (
                str(tenant_ctx.institution_id) if tenant_ctx.institution_id else None
            )
            context["role"] = tenant_ctx.role

    return context


def _get_real_client_ip(request: Request) -> str:
    """
    Get the real client IP, considering proxy headers.

    Checks X-Forwarded-For and X-Real-IP headers for proxied requests.

    Args:
        request: FastAPI Request object

    Returns:
        Client IP address string
    """
    # Check X-Forwarded-For header (may contain multiple IPs)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Take the first IP (original client)
        return forwarded_for.split(",")[0].strip()

    # Check X-Real-IP header
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()

    # Fall back to direct client IP
    if request.client:
        return request.client.host

    return "unknown"


def _is_auth_failure(status_code: int) -> bool:
    """Check if status code indicates authentication/authorization failure."""
    return status_code in (401, 403)


def _determine_auth_event(status_code: int, path: str) -> Optional[AuditEvent]:
    """
    Determine the appropriate auth-related event based on response.

    Args:
        status_code: HTTP response status code
        path: Request path

    Returns:
        AuditEvent for auth failures, or None for other responses
    """
    if status_code == 401:
        return AuditEvent.AUTH_FAILURE
    elif status_code == 403:
        return AuditEvent.AUTHZ_DENIED
    return None


class AuditMiddleware(BaseHTTPMiddleware):
    """
    Enhanced middleware that logs all API requests with comprehensive context.

    Features:
    - Request ID generation for distributed tracing
    - User and tenant context from TenantIsolationMiddleware
    - PII masking for URLs and sensitive data
    - Failed auth attempt tracking (401/403 responses)
    - Structured JSON or text output based on AUDIT_LOG_FORMAT env var
    - Real client IP detection through proxy headers

    Logs:
    - Request start with method, path, IP, user context
    - Request completion with status code and duration
    - Request errors with masked exception details
    - Authentication failures for brute force detection
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate unique request ID for tracing (full UUID for better uniqueness)
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        # Record start time
        start_time = time.time()

        # Get real client IP (considering proxies)
        client_ip = _get_real_client_ip(request)

        # Get path for logging (will be masked)
        path = request.url.path

        # Log incoming request (minimal context at this point)
        # Tenant context may not be available yet as it's set by TenantIsolationMiddleware
        audit_logger.log_request_start(
            request_id=request_id,
            method=request.method,
            path=path,
            ip_address=client_ip,
        )

        # Process request
        try:
            response = await call_next(request)
        except Exception as e:
            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000

            # Extract tenant context (may be partially set)
            tenant_ctx = _extract_tenant_context(request)

            # Log error with masked exception details
            audit_logger.log_request_error(
                request_id=request_id,
                method=request.method,
                path=path,
                duration_ms=duration_ms,
                error=str(e),
                user_id=tenant_ctx["user_id"],
                institution_id=tenant_ctx["institution_id"],
                ip_address=client_ip,
            )

            # Also log to legacy logger for backward compatibility
            legacy_logger.error(
                f"[{request_id[:8]}] <-- ERROR after {duration_ms:.2f}ms: "
                f"{mask_url_path(path)}"
            )

            raise

        # Calculate duration
        duration_ms = (time.time() - start_time) * 1000

        # Extract tenant context (now available after TenantIsolationMiddleware)
        tenant_ctx = _extract_tenant_context(request)

        # Log completed request with full context
        audit_logger.log_request_complete(
            request_id=request_id,
            method=request.method,
            path=path,
            status_code=response.status_code,
            duration_ms=duration_ms,
            user_id=tenant_ctx["user_id"],
            institution_id=tenant_ctx["institution_id"],
            role=tenant_ctx["role"],
            ip_address=client_ip,
        )

        # Track failed authentication attempts
        if _is_auth_failure(response.status_code):
            auth_event = _determine_auth_event(response.status_code, path)
            if auth_event == AuditEvent.AUTH_FAILURE:
                audit_logger.log_auth_failure(
                    ip_address=client_ip,
                    request_id=request_id,
                    reason=f"HTTP {response.status_code} on {mask_url_path(path)}",
                    details={
                        "method": request.method,
                        "path": mask_url_path(path),
                    },
                )
            elif auth_event == AuditEvent.AUTHZ_DENIED:
                audit_logger.log(
                    AuditEvent.AUTHZ_DENIED,
                    level="WARNING",
                    request_id=request_id,
                    user_id=tenant_ctx["user_id"],
                    institution_id=tenant_ctx["institution_id"],
                    role=tenant_ctx["role"],
                    ip_address=client_ip,
                    method=request.method,
                    path=path,
                    status_code=response.status_code,
                    details={"reason": "access_denied"},
                )

        # Also log to legacy logger for backward compatibility
        log_level = logging.INFO if response.status_code < 400 else logging.WARNING
        legacy_logger.log(
            log_level,
            f"[{request_id[:8]}] <-- {response.status_code} in {duration_ms:.2f}ms",
        )

        # Add request ID to response headers for debugging/tracing
        response.headers["X-Request-ID"] = request_id

        return response
