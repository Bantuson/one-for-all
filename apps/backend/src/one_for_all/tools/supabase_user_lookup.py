import asyncio
from crewai.tools import tool
from .supabase_client import supabase

# Security audit logging for service role access
# See docs/SERVICE_ROLE_AUDIT.md for details on RLS bypass risks
from ..utils.db_audit import audit_service_role_access


@audit_service_role_access(table="user_accounts", operation="select")
@tool
def supabase_user_lookup(username_or_email: str) -> str:
    """
    Check if a user exists in Supabase.

    SECURITY NOTE: This tool uses service role key and bypasses RLS.
    Currently queries across all tenants - see SERVICE_ROLE_AUDIT.md.
    """

    async def async_logic():
        result = (
            await supabase
            .table("user_accounts")
            .select("*")
            .or_(f"username.eq.{username_or_email},email.eq.{username_or_email}")
            .execute()
        )

        if not result.data:
            return "USER_NOT_FOUND"

        return str(result.data[0])

    return asyncio.run(async_logic())
