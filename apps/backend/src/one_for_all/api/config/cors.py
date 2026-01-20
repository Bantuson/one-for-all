"""
CORS Configuration Module

Provides environment-aware CORS configuration for the FastAPI application.
Supports development defaults and production hardening.

Environment Variables:
    ENVIRONMENT: "development" | "production" (default: "development")
    CORS_ORIGINS: Comma-separated list of allowed origins (highest priority)
    FRONTEND_URL: Single frontend URL (fallback if CORS_ORIGINS not set)
"""

import logging
import os
from typing import List, Set

logger = logging.getLogger(__name__)

# Environment detection
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
IS_PRODUCTION = ENVIRONMENT == "production"

# Explicitly allowed HTTP methods (not using "*" wildcard)
ALLOWED_METHODS: List[str] = [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "PATCH",
    "OPTIONS",
]

# Explicitly allowed headers (not using "*" wildcard)
ALLOWED_HEADERS: List[str] = [
    "Authorization",
    "X-API-Key",
    "X-Institution-ID",
    "Content-Type",
    "Accept",
    "X-Request-ID",
]


def get_cors_origins() -> List[str]:
    """
    Get allowed CORS origins based on environment configuration.

    Priority order:
    1. CORS_ORIGINS environment variable (comma-separated)
    2. FRONTEND_URL environment variable (single URL)
    3. Development defaults (localhost:3000, localhost:8000)

    In production:
    - Localhost origins are stripped with a warning
    - Empty origins list will cause CORS to reject all cross-origin requests

    Returns:
        List of allowed origin URLs
    """
    origins: Set[str] = set()

    # Priority 1: CORS_ORIGINS (comma-separated list)
    cors_env = os.getenv("CORS_ORIGINS", "")
    if cors_env:
        for origin in cors_env.split(","):
            origin = origin.strip()
            if origin:
                origins.add(origin)

    # Priority 2: FRONTEND_URL (single URL fallback)
    frontend_url = os.getenv("FRONTEND_URL", "")
    if frontend_url:
        origins.add(frontend_url.strip())

    # Development defaults when no origins configured
    if not origins and not IS_PRODUCTION:
        logger.info("No CORS origins configured, using development defaults")
        origins = {"http://localhost:3000", "http://localhost:8000"}

    # Production security: block localhost origins
    if IS_PRODUCTION:
        localhost_origins = [
            o for o in origins if "localhost" in o or "127.0.0.1" in o
        ]
        if localhost_origins:
            logger.warning(
                f"Removing localhost origins in production environment: {localhost_origins}"
            )
            origins -= set(localhost_origins)

        if not origins:
            logger.error(
                "No valid CORS origins configured for production! "
                "Set CORS_ORIGINS or FRONTEND_URL environment variable."
            )

    origin_list = list(origins)
    logger.info(f"CORS origins configured: {origin_list}")
    return origin_list


def get_cors_config() -> dict:
    """
    Get complete CORS middleware configuration.

    Returns a dictionary suitable for unpacking into CORSMiddleware:
        app.add_middleware(CORSMiddleware, **get_cors_config())

    Configuration:
        - allow_origins: From get_cors_origins()
        - allow_credentials: True (required for cookies/auth headers)
        - allow_methods: Explicit list (no wildcards)
        - allow_headers: Explicit list (no wildcards)
        - expose_headers: Headers accessible to client JavaScript
        - max_age: Preflight cache duration (longer in production)

    Returns:
        Dictionary of CORS middleware configuration options
    """
    return {
        "allow_origins": get_cors_origins(),
        "allow_credentials": True,
        "allow_methods": ALLOWED_METHODS,
        "allow_headers": ALLOWED_HEADERS,
        "expose_headers": ["X-Request-ID"],
        "max_age": 600 if IS_PRODUCTION else 60,
    }
