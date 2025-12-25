"""
Audit Logging Middleware

Logs all API requests for security auditing and debugging.
"""

import logging
import time
import uuid
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# Configure audit logger
audit_logger = logging.getLogger("api.audit")
audit_logger.setLevel(logging.INFO)

# Add handler if not already configured
if not audit_logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(
        logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
    )
    audit_logger.addHandler(handler)


class AuditMiddleware(BaseHTTPMiddleware):
    """
    Middleware that logs all API requests with timing and metadata.

    Logs:
    - Request ID (for tracing)
    - HTTP method and path
    - Response status code
    - Request duration in ms
    - Client IP (if available)
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate unique request ID for tracing
        request_id = str(uuid.uuid4())[:8]
        request.state.request_id = request_id

        # Record start time
        start_time = time.time()

        # Get client IP
        client_ip = request.client.host if request.client else "unknown"

        # Log incoming request
        audit_logger.info(
            f"[{request_id}] --> {request.method} {request.url.path} "
            f"from {client_ip}"
        )

        # Process request
        try:
            response = await call_next(request)
        except Exception as e:
            # Log error and re-raise
            duration_ms = (time.time() - start_time) * 1000
            audit_logger.error(
                f"[{request_id}] <-- ERROR after {duration_ms:.2f}ms: {str(e)}"
            )
            raise

        # Calculate duration
        duration_ms = (time.time() - start_time) * 1000

        # Log response
        log_level = logging.INFO if response.status_code < 400 else logging.WARNING
        audit_logger.log(
            log_level,
            f"[{request_id}] <-- {response.status_code} in {duration_ms:.2f}ms",
        )

        # Add request ID to response headers for debugging
        response.headers["X-Request-ID"] = request_id

        return response
