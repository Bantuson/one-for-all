import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import uuid4
from crewai.tools import tool
from .supabase_client import supabase
from ..utils.db_audit import audit_service_role_access


@audit_service_role_access(table="user_sessions", operation="insert")
@tool
def supabase_session_create(
    user_id: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> str:
    """
    Create a new 24-hour session with optional security context.

    Args:
        user_id: The user ID to create a session for
        ip_address: Optional client IP address for hijacking detection (H4)
        user_agent: Optional browser/client User-Agent for fingerprinting (H4)

    Returns:
        SESSION_CREATED::{session_token} on success

    Security (H4):
        - Stores ip_address and created_ip_address for later comparison
        - Stores user_agent for session fingerprinting
        - Initializes token_version to 1 for rotation tracking
        - Sets last_activity_at for session reaping
    """

    async def async_logic():
        session_token = str(uuid4())
        now = datetime.now(timezone.utc)
        expires_at = (now + timedelta(hours=24)).isoformat()

        # Build base session data
        insert = {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at,
            "token_version": 1,
            "last_activity_at": now.isoformat(),
        }

        # Add security context if provided (H4)
        if ip_address:
            insert["ip_address"] = ip_address
            insert["created_ip_address"] = ip_address
        if user_agent:
            # Truncate user_agent to prevent storage bloat
            insert["user_agent"] = user_agent[:512] if len(user_agent) > 512 else user_agent

        await supabase.table("user_sessions").insert(insert).execute()
        return f"SESSION_CREATED::{session_token}"

    return asyncio.run(async_logic())
