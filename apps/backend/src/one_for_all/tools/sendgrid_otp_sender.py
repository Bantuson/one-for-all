import os
import asyncio
import aiohttp
from crewai.tools import tool

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")

@tool
def sendgrid_otp_sender(email: str, otp: str) -> str:
    """
    Sends OTP via SendGrid (email).
    Returns a plain string (CrewAI requirement).
    """
    async def async_logic():
        url = "https://api.sendgrid.com/v3/mail/send"

        payload = {
            "personalizations": [
                {"to": [{"email": email}], "subject": "Your One For All OTP Code"}
            ],
            "from": {"email": "no-reply@oneforall.app"},
            "content": [{"type": "text/plain", "value": f"Your OTP code is: {otp}"}],
        }

        headers = {
            "Authorization": f"Bearer {SENDGRID_API_KEY}",
            "Content-Type": "application/json",
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as resp:
                if resp.status in [200, 202]:
                    return f"OTP sent to {email}"
                else:
                    body = await resp.text()
                    return f"Failed to send OTP: {body}"

    return asyncio.run(async_logic())
