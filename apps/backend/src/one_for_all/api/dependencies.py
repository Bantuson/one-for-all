"""
API Dependencies

Provides dependency injection for:
- Supabase client with service role credentials
- API key authentication
- Tenant context extraction and validation
- Role-based access control

Security Features:
- TenantContext validation (CWE-862: Missing Authorization)
- Role-based access control with hierarchy support
- Fail-closed design for missing tenant context
"""

import os
from functools import lru_cache
from pathlib import Path
from typing import Annotated, Callable, List, Optional

from dotenv import load_dotenv
from fastapi import Depends, Header, HTTPException, Request, status
from supabase import Client, create_client

from .schemas.tenant import TenantContext, has_role_or_higher

# Load env from monorepo root (local dev) or use Render env vars (production)
_env_paths = [
    Path(__file__).resolve().parents[5] / ".env.local",  # Monorepo root (local)
    Path(__file__).resolve().parents[4] / ".env.local",  # Alternative structure
    Path.cwd() / ".env.local",  # Current working directory
]

for _env_path in _env_paths:
    if _env_path.exists():
        load_dotenv(dotenv_path=_env_path)
        break
# If no .env.local found, rely on environment variables (Render sets these directly)


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


# =============================================================================
# TENANT CONTEXT DEPENDENCIES
# =============================================================================


def get_tenant_context(request: Request) -> TenantContext:
    """
    Extract TenantContext from request state.

    The TenantIsolationMiddleware injects TenantContext into request.state
    after validating JWT and institution membership. This dependency retrieves
    that context for use in route handlers.

    Security: Fail-closed design - raises 403 if no context found.
    This should never happen if middleware is properly configured,
    but provides defense-in-depth.

    Args:
        request: The FastAPI request object

    Returns:
        Validated TenantContext

    Raises:
        HTTPException: 403 if no tenant context found
    """
    tenant_context: Optional[TenantContext] = getattr(
        request.state, "tenant_context", None
    )

    if not tenant_context:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant context not established. Ensure TenantIsolationMiddleware is enabled.",
            headers={"X-Error-Code": "MISSING_TENANT_CONTEXT"},
        )

    return tenant_context


def require_role(*allowed_roles: str) -> Callable[[TenantContext], TenantContext]:
    """
    Dependency factory for role-based access control.

    Creates a dependency that verifies the user has one of the allowed roles.
    Uses role hierarchy - higher roles include permissions of lower roles.

    Usage:
        @router.get("/admin-only")
        async def admin_endpoint(
            tenant: Annotated[TenantContext, Depends(require_role("admin"))]
        ):
            # Only admins and super_admins can access
            ...

        @router.get("/reviewer-or-admin")
        async def reviewer_endpoint(
            tenant: Annotated[TenantContext, Depends(require_role("reviewer", "admin"))]
        ):
            # Reviewers, admins, and super_admins can access
            ...

    Args:
        *allowed_roles: One or more role names that are allowed access

    Returns:
        A FastAPI dependency function that validates role

    Raises:
        HTTPException: 403 if user's role is not sufficient
    """
    if not allowed_roles:
        raise ValueError("At least one allowed role must be specified")

    def role_checker(
        tenant_context: Annotated[TenantContext, Depends(get_tenant_context)]
    ) -> TenantContext:
        """Inner dependency that checks role."""
        user_role = tenant_context.role

        # Check if user has any of the allowed roles (considering hierarchy)
        for allowed_role in allowed_roles:
            if has_role_or_higher(user_role, allowed_role):
                return tenant_context

        # User does not have sufficient role
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Required role: {' or '.join(allowed_roles)}. Your role: {user_role}",
            headers={"X-Error-Code": "INSUFFICIENT_ROLE"},
        )

    return role_checker


def require_permission(*required_permissions: str) -> Callable[[TenantContext], TenantContext]:
    """
    Dependency factory for permission-based access control.

    Creates a dependency that verifies the user has all required permissions.
    This is for fine-grained access control beyond role-based checks.

    Usage:
        @router.post("/applications/approve")
        async def approve_application(
            tenant: Annotated[TenantContext, Depends(require_permission("approve:applications"))]
        ):
            # Only users with approve:applications permission can access
            ...

    Args:
        *required_permissions: Permission strings that are all required

    Returns:
        A FastAPI dependency function that validates permissions

    Raises:
        HTTPException: 403 if user lacks any required permission
    """
    if not required_permissions:
        raise ValueError("At least one required permission must be specified")

    def permission_checker(
        tenant_context: Annotated[TenantContext, Depends(get_tenant_context)]
    ) -> TenantContext:
        """Inner dependency that checks permissions."""
        user_permissions = set(tenant_context.permissions)
        required = set(required_permissions)

        # Check if user has all required permissions
        missing = required - user_permissions

        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Missing permissions: {', '.join(missing)}",
                headers={"X-Error-Code": "MISSING_PERMISSIONS"},
            )

        return tenant_context

    return permission_checker


# =============================================================================
# TYPE ALIASES FOR DEPENDENCY INJECTION
# =============================================================================

# Supabase client
SupabaseClient = Annotated[Client, Depends(get_supabase_client)]

# API key verification (for service routes)
ApiKeyVerified = Annotated[bool, Depends(verify_api_key)]

# Tenant context (requires valid JWT + institution membership)
TenantRequired = Annotated[TenantContext, Depends(get_tenant_context)]

# Role-based access (common patterns)
AdminRequired = Annotated[TenantContext, Depends(require_role("admin"))]
ReviewerRequired = Annotated[TenantContext, Depends(require_role("reviewer"))]
MemberRequired = Annotated[TenantContext, Depends(require_role("member"))]
