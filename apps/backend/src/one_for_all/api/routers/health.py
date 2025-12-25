"""
Health Check Router

Provides health check endpoints for monitoring and load balancers.
"""

from fastapi import APIRouter, status

from ..dependencies import SupabaseClient

router = APIRouter(tags=["health"])


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """Basic health check - returns OK if server is running."""
    return {"status": "healthy", "service": "one-for-all-api"}


@router.get("/health/db", status_code=status.HTTP_200_OK)
async def database_health(supabase: SupabaseClient):
    """
    Database health check - verifies Supabase connection.
    Does not require API key (for load balancer probes).
    """
    try:
        # Simple query to verify connection
        result = supabase.table("applicant_accounts").select("id").limit(1).execute()
        return {
            "status": "healthy",
            "database": "connected",
            "service": "one-for-all-api",
        }
    except Exception as e:
        return {
            "status": "degraded",
            "database": "error",
            "error": str(e),
            "service": "one-for-all-api",
        }
