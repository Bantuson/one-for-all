import asyncio
from crewai_tools import tool
from .supabase_client import supabase

@tool
def supabase_user_store(user_json: dict) -> str:
    """
    Stores user account after OTP verification.
    """
    async def async_logic():
        result = await supabase.table("user_accounts").insert(user_json).execute()
        return str(result.data)

    return asyncio.run(async_logic())
