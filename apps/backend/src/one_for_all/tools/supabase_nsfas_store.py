import asyncio
from crewai_tools import tool
from .supabase_client import supabase

@tool
def supabase_nsfas_store(nsfas_json: dict) -> str:
    """
    Create or update the main NSFAS application entry for a user.

    nsfas_json MUST include:
    - user_id
    - combined personal + academic + NSFAS-specific data
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

