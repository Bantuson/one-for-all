import os
import asyncio
import aiohttp
from crewai.tools import tool

BACKEND_URL = os.getenv("BACKEND_URL")

@tool
def nsfas_application_submission_tool(nsfas_json: dict) -> str:
    """
    Submit NSFAS application to the backend API.
    """

    async def async_logic():
        url = f"{BACKEND_URL}/api/nsfas/submit"

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=nsfas_json) as resp:
                body = await resp.text()
                return body

    return asyncio.run(async_logic())
