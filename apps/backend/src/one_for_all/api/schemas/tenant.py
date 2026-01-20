"""
Tenant Context Schema

Provides validated tenant context for multi-tenant isolation.
The TenantContext is injected into request.state by TenantIsolationMiddleware
and used by dependencies to enforce authorization.

Security Features:
- Immutable (frozen) to prevent tampering after validation
- Contains verified user identity and institution membership
- Role-based permissions for fine-grained access control
"""

from typing import List
from uuid import UUID

from pydantic import BaseModel, Field


class TenantContext(BaseModel):
    """
    Validated tenant context injected into request.state.

    This context represents a verified user session with:
    - Confirmed identity via JWT (Clerk)
    - Verified membership in the specified institution
    - Role-based permissions loaded from institution_members table

    Attributes:
        institution_id: UUID of the tenant institution
        user_id: UUID of the user in our system (institution_members.id)
        clerk_user_id: Clerk's user ID from JWT claims
        role: User's role within the institution (admin, reviewer, member, applicant)
        permissions: List of permission strings for fine-grained access control
    """

    institution_id: UUID = Field(
        ...,
        description="UUID of the tenant institution"
    )
    user_id: UUID = Field(
        ...,
        description="UUID of the user in institution_members table"
    )
    clerk_user_id: str = Field(
        ...,
        min_length=1,
        description="Clerk user ID from JWT claims"
    )
    role: str = Field(
        ...,
        pattern="^(super_admin|admin|reviewer|member|applicant)$",
        description="User's role within the institution"
    )
    permissions: List[str] = Field(
        default=[],
        description="List of permission strings for the user"
    )

    class Config:
        """Pydantic model configuration."""
        frozen = True  # Immutable after creation to prevent tampering
        json_schema_extra = {
            "example": {
                "institution_id": "550e8400-e29b-41d4-a716-446655440000",
                "user_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                "clerk_user_id": "user_2abc123def456",
                "role": "reviewer",
                "permissions": ["read:applications", "update:applications"]
            }
        }


# Role hierarchy for permission checking
# Higher roles include all permissions of lower roles
ROLE_HIERARCHY = {
    "super_admin": 5,  # Cross-tenant access
    "admin": 4,        # Full tenant access
    "reviewer": 3,     # Application review access
    "member": 2,       # Basic member access
    "applicant": 1,    # Applicant-only access (their own data)
}


def has_role_or_higher(user_role: str, required_role: str) -> bool:
    """
    Check if user_role is at or above required_role in hierarchy.

    Args:
        user_role: The user's current role
        required_role: The minimum required role

    Returns:
        True if user_role >= required_role in hierarchy
    """
    user_level = ROLE_HIERARCHY.get(user_role, 0)
    required_level = ROLE_HIERARCHY.get(required_role, 0)
    return user_level >= required_level
