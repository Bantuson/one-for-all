import asyncio
from datetime import datetime, timedelta
from uuid import uuid4
from crewai_tools import tool
from .supabase_client import supabase

@tool
def supabase_session_create(user_id: str) -> str:
    """
    Create a new 24-hour session.
    """

    async def async_logic():
        session_token = str(uuid4())
        expires_at = (datetime.utcnow() + timedelta(hours=24)).isoformat()

        insert = {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at
        }

        await supabase.table("user_sessions").insert(insert).execute()
        return f"SESSION_CREATED::{session_token}"

    return asyncio.run(async_logic())
