import asyncio
from crewai.tools import tool
from .supabase_client import supabase

@tool
def supabase_user_lookup(username_or_email: str) -> str:
    """
    Check if a user exists in Supabase.
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
