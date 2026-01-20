"""
Tenant Isolation Middleware

Enforces multi-tenant isolation by validating JWT tokens and institution membership.
This middleware implements a fail-closed security model - requests without valid
tenant context are rejected.

Security Features:
- JWT verification via Clerk (CWE-287: Improper Authentication)
- Institution membership verification (CWE-862: Missing Authorization)
- Fail-closed design - rejects requests without valid context
- Exempt routes for public endpoints (health, docs)
- Service routes for backend-to-backend calls (API key auth)

OWASP References:
- A01:2021 Broken Access Control
- A07:2021 Identification and Authentication Failures
"""

import logging
import os
from typing import Callable, Optional, Set
from uuid import UUID

import jwt
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from supabase import Client, create_client

from ..schemas.tenant import TenantContext

logger = logging.getLogger(__name__)


# =============================================================================
# ROUTE CONFIGURATION
# =============================================================================

# Routes that do not require tenant context (public endpoints)
EXEMPT_ROUTES: Set[str] = {
    "/health",
    "/healthz",
    "/ready",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/",
}

# Route prefixes that are exempt (allows path variations)
EXEMPT_PREFIXES: Set[str] = {
    "/docs",
    "/redoc",
}

# Service routes - require API key instead of JWT (backend-to-backend)
# These are called by CrewAI agents with X-API-Key header
SERVICE_ROUTES: Set[str] = {
    "/api/v1/applicants",
    "/api/v1/sessions",
    "/api/v1/applications",
    "/api/v1/nsfas",
    "/api/v1/rag",
}


class TenantIsolationMiddleware(BaseHTTPMiddleware):
    """
    Middleware that enforces multi-tenant isolation.

    For each request, this middleware:
    1. Checks if route is exempt (public) or service route (API key auth)
    2. Extracts and verifies JWT from Authorization header
    3. Gets institution_id from X-Institution-ID header or query param
    4. Verifies user membership in the institution
    5. Injects TenantContext into request.state

    Fail-closed: Requests without valid context are rejected with 401/403.
    """

    def __init__(self, app, clerk_jwks_url: Optional[str] = None):
        """
        Initialize middleware with Clerk configuration.

        Args:
            app: The FastAPI application
            clerk_jwks_url: Optional JWKS URL override for testing
        """
        super().__init__(app)

        # Get Clerk configuration from environment
        self.clerk_secret_key = os.getenv("CLERK_SECRET_KEY", "")
        self.clerk_publishable_key = os.getenv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "")

        # Clerk JWKS endpoint for JWT verification
        # Format: https://<clerk-instance>.clerk.accounts.dev/.well-known/jwks.json
        self.clerk_jwks_url = clerk_jwks_url

        # API key for service routes
        self.api_key = os.getenv("BACKEND_API_KEY", "")

        # Supabase configuration for membership verification
        self.supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

        # Cache for JWKS (in production, use proper caching with TTL)
        self._jwks_cache: Optional[dict] = None

    def _is_exempt_route(self, path: str) -> bool:
        """Check if route is exempt from tenant validation."""
        # Exact match
        if path in EXEMPT_ROUTES:
            return True

        # Prefix match
        for prefix in EXEMPT_PREFIXES:
            if path.startswith(prefix):
                return True

        return False

    def _is_service_route(self, path: str) -> bool:
        """Check if route uses API key authentication instead of JWT."""
        for prefix in SERVICE_ROUTES:
            if path.startswith(prefix):
                return True
        return False

    def _verify_api_key(self, request: Request) -> bool:
        """Verify API key for service routes."""
        api_key = request.headers.get("X-API-Key", "")
        if not self.api_key:
            logger.error("BACKEND_API_KEY not configured")
            return False
        return api_key == self.api_key

    def _extract_bearer_token(self, request: Request) -> Optional[str]:
        """Extract JWT from Authorization header."""
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None
        return auth_header[7:]  # Remove "Bearer " prefix

    def _verify_jwt(self, token: str) -> Optional[dict]:
        """
        Verify JWT and extract claims.

        In production, this should:
        1. Fetch JWKS from Clerk
        2. Verify signature using RS256
        3. Validate claims (exp, iss, aud)

        For now, we decode without verification for development.
        TODO: Implement full JWKS verification for production.
        """
        try:
            # SECURITY WARNING: In production, always verify the signature!
            # This is a placeholder for development that decodes without verification.
            # The actual implementation should use PyJWT with the Clerk JWKS.
            #
            # Production implementation:
            # 1. Fetch JWKS from self.clerk_jwks_url
            # 2. Get signing key using kid from token header
            # 3. Verify with jwt.decode(token, key, algorithms=["RS256"], ...)

            # Decode header to get algorithm info
            unverified_header = jwt.get_unverified_header(token)

            # For development/testing: decode without verification
            # WARNING: This MUST be replaced with verified decoding in production
            if os.getenv("ENVIRONMENT", "development") == "development":
                claims = jwt.decode(
                    token,
                    options={
                        "verify_signature": False,
                        "verify_exp": True,
                        "verify_aud": False,
                    }
                )
                return claims

            # Production: Verify signature (requires JWKS setup)
            # This path requires proper JWKS configuration
            logger.error("JWT verification not configured for production")
            return None

        except jwt.ExpiredSignatureError:
            logger.warning("JWT expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT: {e}")
            return None
        except Exception as e:
            logger.error(f"JWT verification error: {e}")
            return None

    def _get_institution_id(self, request: Request) -> Optional[str]:
        """
        Get institution ID from request.

        Priority:
        1. X-Institution-ID header (preferred for API calls)
        2. institution_id query parameter (fallback)
        """
        # Check header first
        institution_id = request.headers.get("X-Institution-ID")
        if institution_id:
            return institution_id

        # Check query parameter
        institution_id = request.query_params.get("institution_id")
        if institution_id:
            return institution_id

        return None

    async def _verify_membership(
        self,
        clerk_user_id: str,
        institution_id: str
    ) -> Optional[dict]:
        """
        Verify user is a member of the specified institution.

        Args:
            clerk_user_id: The Clerk user ID from JWT claims
            institution_id: The institution UUID to verify membership for

        Returns:
            Membership record with role and permissions, or None if not a member
        """
        if not self.supabase_url or not self.supabase_key:
            logger.error("Supabase configuration missing")
            return None

        try:
            # Create Supabase client for membership lookup
            supabase: Client = create_client(self.supabase_url, self.supabase_key)

            # Query institution_members table for membership
            # The table should have: id, clerk_user_id, institution_id, role
            result = (
                supabase.table("institution_members")
                .select("id, clerk_user_id, institution_id, role, permissions")
                .eq("clerk_user_id", clerk_user_id)
                .eq("institution_id", institution_id)
                .eq("status", "active")  # Only active members
                .single()
                .execute()
            )

            if result.data:
                return result.data

            return None

        except Exception as e:
            # Log but don't expose internal errors
            logger.error(f"Membership verification failed: {e}")
            return None

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request with tenant isolation enforcement.

        Args:
            request: The incoming HTTP request
            call_next: The next middleware/handler in the chain

        Returns:
            Response from the handler or error response
        """
        path = request.url.path

        # =======================================================================
        # EXEMPT ROUTES - No tenant context required
        # =======================================================================
        if self._is_exempt_route(path):
            return await call_next(request)

        # =======================================================================
        # SERVICE ROUTES - API key authentication (backend-to-backend)
        # =======================================================================
        if self._is_service_route(path):
            if self._verify_api_key(request):
                # Service routes bypass tenant context
                # The service is trusted to enforce its own authorization
                return await call_next(request)
            else:
                logger.warning(f"Invalid API key for service route: {path}")
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={
                        "error": "unauthorized",
                        "detail": "Invalid or missing API key",
                        "code": "INVALID_API_KEY"
                    },
                    headers={"WWW-Authenticate": "ApiKey"}
                )

        # =======================================================================
        # TENANT ROUTES - Full JWT + institution validation
        # =======================================================================

        # Step 1: Extract and verify JWT
        token = self._extract_bearer_token(request)
        if not token:
            logger.warning(f"Missing authorization header: {path}")
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "error": "unauthorized",
                    "detail": "Authorization header required",
                    "code": "MISSING_AUTH_HEADER"
                },
                headers={"WWW-Authenticate": "Bearer"}
            )

        claims = self._verify_jwt(token)
        if not claims:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "error": "unauthorized",
                    "detail": "Invalid or expired token",
                    "code": "INVALID_TOKEN"
                },
                headers={"WWW-Authenticate": "Bearer"}
            )

        # Extract Clerk user ID from claims
        # Clerk uses 'sub' claim for user ID
        clerk_user_id = claims.get("sub")
        if not clerk_user_id:
            logger.warning("JWT missing 'sub' claim")
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "error": "unauthorized",
                    "detail": "Invalid token claims",
                    "code": "INVALID_CLAIMS"
                }
            )

        # Step 2: Get institution ID
        institution_id = self._get_institution_id(request)
        if not institution_id:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "error": "bad_request",
                    "detail": "Institution ID required (X-Institution-ID header or institution_id query param)",
                    "code": "MISSING_INSTITUTION_ID"
                }
            )

        # Validate UUID format
        try:
            institution_uuid = UUID(institution_id)
        except ValueError:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "error": "bad_request",
                    "detail": "Invalid institution ID format",
                    "code": "INVALID_INSTITUTION_ID"
                }
            )

        # Step 3: Verify membership
        membership = await self._verify_membership(clerk_user_id, institution_id)
        if not membership:
            logger.warning(
                f"User {clerk_user_id} not a member of institution {institution_id}"
            )
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "error": "forbidden",
                    "detail": "User is not a member of this institution",
                    "code": "NOT_A_MEMBER"
                }
            )

        # Step 4: Build and inject TenantContext
        try:
            tenant_context = TenantContext(
                institution_id=institution_uuid,
                user_id=UUID(membership["id"]),
                clerk_user_id=clerk_user_id,
                role=membership.get("role", "member"),
                permissions=membership.get("permissions", []) or []
            )

            # Inject into request state for access by dependencies
            request.state.tenant_context = tenant_context

        except Exception as e:
            logger.error(f"Failed to build TenantContext: {e}")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "error": "internal_error",
                    "detail": "Failed to establish tenant context",
                    "code": "CONTEXT_BUILD_FAILED"
                }
            )

        # =======================================================================
        # PROCEED WITH REQUEST
        # =======================================================================
        return await call_next(request)
