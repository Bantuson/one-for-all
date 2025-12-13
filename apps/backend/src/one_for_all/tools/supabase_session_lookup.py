import asyncio
from datetime import datetime
from crewai.tools import tool
from .supabase_client import supabase

@tool
def supabase_session_lookup(user_id: str) -> str:
    """
    Check if the user has a valid active session.
    """

    async def async_logic():
        result = (
            await supabase
            .table("user_sessions")
            .select("*")
            .eq("user_id", user_id)
            .order("expires_at", desc=True)
            .limit(1)
            .execute()
        )

        if not result.data:
            return "NO_SESSION"

        session = result.data[0]
        expires = datetime.fromisoformat(session["expires_at"])

        if expires > datetime.utcnow():
            return f"VALID_SESSION::{session['session_token']}"

        return "EXPIRED_SESSION"

    return asyncio.run(async_logic())
