import os
import asyncio
import aiohttp
from crewai.tools import tool
from .otp_store import generate_otp, store_otp

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")

@tool
def sendgrid_otp_sender(email: str) -> str:
    """
    Generates a 6-digit OTP, stores it in the database, and sends it via SendGrid (email).
    The OTP is generated internally for security.

    Args:
        email: The email address to send the OTP to

    Returns:
        Success message with OTP sent confirmation, or error details
    """
    async def async_logic():
        # Generate OTP
        otp = generate_otp()

        # Store OTP in database
        if not store_otp(identifier=email, channel="email", code=otp):
            return f"Failed to store OTP for {email}. Email not sent."

        # Send OTP via SendGrid
        url = "https://api.sendgrid.com/v3/mail/send"

        payload = {
            "personalizations": [
                {"to": [{"email": email}], "subject": "Your One For All OTP Code"}
            ],
            "from": {"email": "no-reply@oneforall.app"},
            "content": [{"type": "text/plain", "value": f"Your OTP code is: {otp}\n\nThis code expires in 10 minutes. Do not share this code with anyone."}],
        }

        headers = {
            "Authorization": f"Bearer {SENDGRID_API_KEY}",
            "Content-Type": "application/json",
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as resp:
                if resp.status in [200, 202]:
                    return f"OTP sent to {email}. Code expires in 10 minutes."
                else:
                    body = await resp.text()
                    return f"Failed to send OTP email: {body}"

    return asyncio.run(async_logic())
