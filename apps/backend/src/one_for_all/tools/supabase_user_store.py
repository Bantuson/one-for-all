import asyncio
from crewai.tools import tool
from .supabase_client import supabase

# Security audit logging for service role access
# See docs/SERVICE_ROLE_AUDIT.md for details on RLS bypass risks
from ..utils.db_audit import audit_service_role_access


@audit_service_role_access(table="user_accounts", operation="insert")
@tool
def supabase_user_store(user_json: dict) -> str:
    """
    Stores user account after OTP verification.

    SECURITY NOTE: This tool uses service role key and bypasses RLS.
    User data should include user_id for audit logging.
    """
    async def async_logic():
        result = await supabase.table("user_accounts").insert(user_json).execute()
        return str(result.data)

    return asyncio.run(async_logic())
