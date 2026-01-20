import asyncio
from crewai.tools import tool
from .supabase_client import supabase

# Security audit logging for service role access
# See docs/SERVICE_ROLE_AUDIT.md for details on RLS bypass risks
from ..utils.db_audit import audit_service_role_access


@audit_service_role_access(table="nsfas_applications", operation="insert")
@tool
def supabase_nsfas_store(nsfas_json: dict) -> str:
    """
    Create or update the main NSFAS application entry for a user.

    nsfas_json MUST include:
    - user_id
    - combined personal + academic + NSFAS-specific data

    SECURITY NOTE: This tool uses service role key and bypasses RLS.
    NSFAS data should include user_id for audit logging.
    """

    async def async_logic():
        result = (
            await supabase
            .table("nsfas_applications")
            .insert(nsfas_json)
            .execute()
        )

        return str(result.data)

    return asyncio.run(async_logic())

