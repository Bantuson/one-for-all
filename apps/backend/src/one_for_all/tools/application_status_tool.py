import os
import asyncio
import aiohttp
from crewai.tools import tool
from ..utils.db_audit import audit_service_role_access

BACKEND_URL = os.getenv("BACKEND_URL")

@audit_service_role_access(table="applications", operation="select")
@tool
def application_status_tool(application_id: str) -> str:
    """
    Retrieve current application status from backend API.

    Args:
        application_id: The unique identifier of the application to check.

    Returns:
        JSON string containing application status details.
    """
    async def async_logic():
        url = f"{BACKEND_URL}/api/applications/status/{application_id}"
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as resp:
                body = await resp.text()
                return body

    return asyncio.run(async_logic())
