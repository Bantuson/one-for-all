import asyncio
from crewai_tools import tool
from .supabase_client import supabase

@tool
def supabase_application_store(app_json: dict) -> str:
    """
    Stores university application data.
    """
    async def async_logic():
        result = await supabase.table("applications").insert(app_json).execute()
        return str(result.data)

    return asyncio.run(async_logic())
