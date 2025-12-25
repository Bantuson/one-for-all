"""
API Dependencies

Provides dependency injection for:
- Supabase client with service role credentials
- API key authentication
- Rate limiting (future)
"""

import os
from functools import lru_cache
from pathlib import Path
from typing import Annotated

from dotenv import load_dotenv
from fastapi import Depends, Header, HTTPException, status
from supabase import Client, create_client

# Load env from monorepo root
load_dotenv(dotenv_path=Path(__file__).resolve().parents[5] / ".env.local")


@lru_cache()
def get_settings() -> dict:
    """Get cached application settings from environment."""
    return {
        "supabase_url": os.getenv("NEXT_PUBLIC_SUPABASE_URL", ""),
        "supabase_service_key": os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        "api_secret_key": os.getenv("BACKEND_API_KEY", ""),
    }


def get_supabase_client() -> Client:
    """
    Get Supabase client with service role credentials.
    Uses SUPABASE_SERVICE_ROLE_KEY for full RLS bypass.

    This is intentional - the API layer handles authorization,
    and the service role allows the API to perform any operation
    on behalf of authenticated agents.
    """
    settings = get_settings()
    if not settings["supabase_url"] or not settings["supabase_service_key"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase configuration missing",
        )
    return create_client(settings["supabase_url"], settings["supabase_service_key"])


async def verify_api_key(
    x_api_key: Annotated[str, Header(alias="X-API-Key")]
) -> bool:
    """
    Verify API key for backend-to-backend authentication.
    Prevents unauthorized access to internal API.

    The API key should be kept secret and only used by trusted
    backend services (CrewAI agents).
    """
    settings = get_settings()
    if not settings["api_secret_key"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="API key not configured on server",
        )
    if x_api_key != settings["api_secret_key"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    return True


# Type aliases for dependency injection
SupabaseClient = Annotated[Client, Depends(get_supabase_client)]
ApiKeyVerified = Annotated[bool, Depends(verify_api_key)]
