"""
One For All Internal API

FastAPI application for secure database operations.
All CrewAI agents should use this API instead of direct database access.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .middleware import AuditMiddleware
from .routers import applicants, applications, health, nsfas, rag, sessions


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="One For All Internal API",
        description=(
            "Secure API for CrewAI agents to interact with the database. "
            "Provides validated endpoints with proper authorization."
        ),
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # Add CORS middleware (restrict in production)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://localhost:8000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Add audit logging middleware
    app.add_middleware(AuditMiddleware)

    # Include routers
    app.include_router(health.router)
    app.include_router(applicants.router)
    app.include_router(sessions.router)
    app.include_router(applications.router)
    app.include_router(nsfas.router)
    app.include_router(rag.router)

    # Include legacy routers for CrewAI tool compatibility
    app.include_router(applications.legacy_router)
    app.include_router(nsfas.legacy_router)

    return app


# Create app instance for uvicorn
app = create_app()
