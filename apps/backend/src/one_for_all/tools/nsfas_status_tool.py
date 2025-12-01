import os
import asyncio
import aiohttp
from crewai_tools import tool

BACKEND_URL = os.getenv("BACKEND_URL")

@tool
def nsfas_status_tool(nsfas_application_id: str) -> str:
    """
    Retrieve current NSFAS application status from backend API.
    """

    async def async_logic():
        url = f"{BACKEND_URL}/api/nsfas/status/{nsfas_application_id}"

        async with aiohttp.ClientSession() as session:
            async with session.get(url) as resp:
                body = await resp.text()
                return body

    return asyncio.run(async_logic())
