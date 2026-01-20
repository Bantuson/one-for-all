"""
One For All Internal API

FastAPI application for secure database operations.
All CrewAI agents should use this API instead of direct database access.

Security Features:
- API key authentication for backend-to-backend calls
- Rate limiting via slowapi to prevent abuse
- Audit logging for security monitoring
- CORS restrictions for web clients
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from .middleware import (
    AuditMiddleware,
    TenantIsolationMiddleware,
    limiter,
    rate_limit_exceeded_handler,
)
from .routers import agents, applicants, applications, health, nsfas, rag, sessions


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="One For All Internal API",
        description=(
            "Secure API for CrewAI agents to interact with the database. "
            "Provides validated endpoints with proper authorization and rate limiting."
        ),
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # ==========================================================================
    # RATE LIMITING
    # ==========================================================================
    # Attach limiter to app state (required by slowapi)
    app.state.limiter = limiter

    # Add custom rate limit exceeded handler
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

    # ==========================================================================
    # MIDDLEWARE (order matters: first added = last executed)
    # ==========================================================================

    # Add CORS middleware (restrict in production)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://localhost:8000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Add tenant isolation middleware (multi-tenant security)
    # This middleware:
    # - Validates JWT tokens from Clerk
    # - Verifies institution membership
    # - Injects TenantContext into request.state
    # - Exempts public routes (/health, /docs) and service routes (API key auth)
    app.add_middleware(TenantIsolationMiddleware)

    # Add audit logging middleware
    app.add_middleware(AuditMiddleware)

    # ==========================================================================
    # ROUTERS
    # ==========================================================================
    app.include_router(health.router)
    app.include_router(applicants.router)
    app.include_router(sessions.router)
    app.include_router(applications.router)
    app.include_router(nsfas.router)
    app.include_router(rag.router)
    app.include_router(agents.router)

    # Include legacy routers for CrewAI tool compatibility
    app.include_router(applications.legacy_router)
    app.include_router(nsfas.legacy_router)

    return app


# Create app instance for uvicorn
app = create_app()
