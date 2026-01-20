import asyncio
from crewai.tools import tool
from .supabase_client import supabase

# Security audit logging for service role access
# See docs/SERVICE_ROLE_AUDIT.md for details on RLS bypass risks
from ..utils.db_audit import audit_service_role_access


@audit_service_role_access(table="applications", operation="insert")
@tool
def supabase_application_store(app_json: dict) -> str:
    """
    Stores university application data.

    SECURITY NOTE: This tool uses service role key and bypasses RLS.
    Application data should include institution_id and applicant_id for audit logging.
    """
    async def async_logic():
        result = await supabase.table("applications").insert(app_json).execute()
        return str(result.data)

    return asyncio.run(async_logic())
