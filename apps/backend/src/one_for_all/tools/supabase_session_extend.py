import asyncio
from datetime import datetime, timedelta
from crewai.tools import tool
from .supabase_client import supabase
from ..utils.db_audit import audit_service_role_access

@audit_service_role_access(table="user_sessions", operation="update")
@tool
def supabase_session_extend(session_token: str) -> str:
    """
    Extend a session for another 24 hours.
    """

    async def async_logic():
        new_expiry = (datetime.utcnow() + timedelta(hours=24)).isoformat()

        result = (
            await supabase.table("user_sessions")
            .update({"expires_at": new_expiry})
            .eq("session_token", session_token)
            .execute()
        )

        return "SESSION_EXTENDED"

    return asyncio.run(async_logic())
