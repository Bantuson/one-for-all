import os
import asyncio
import aiohttp
from crewai_tools import tool

BACKEND_URL = os.getenv("BACKEND_URL")

@tool
def application_submission_tool(app_json: dict) -> str:
    """
    Submits final application to backend API.
    """
    async def async_logic():
        url = f"{BACKEND_URL}/api/applications/submit"
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=app_json) as resp:
                body = await resp.text()
                return body

    return asyncio.run(async_logic())
