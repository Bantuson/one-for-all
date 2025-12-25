"""
One For All Internal API

This API provides secure, validated endpoints for CrewAI agents to interact
with the database. All operations go through this API layer instead of
direct database access.

Features:
- API key authentication for backend-to-backend communication
- Pydantic validation on all inputs
- Audit logging for sensitive operations
- Rate limiting to prevent abuse
"""

from .app import create_app

__all__ = ["create_app"]
