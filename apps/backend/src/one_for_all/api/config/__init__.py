"""
API Configuration Module

Provides centralized configuration for the FastAPI application,
including CORS, security settings, and environment-specific defaults.
"""

from .cors import (
    ALLOWED_HEADERS,
    ALLOWED_METHODS,
    get_cors_config,
    get_cors_origins,
)

__all__ = [
    "get_cors_config",
    "get_cors_origins",
    "ALLOWED_METHODS",
    "ALLOWED_HEADERS",
]
