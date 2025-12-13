import os
import asyncio
import aiohttp
from crewai.tools import tool

TWILIO_SID = os.getenv("TWILIO_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_NUMBER = os.getenv("TWILIO_NUMBER")

@tool
def sms_otp_sender(phone_number: str, otp: str) -> str:
    """
    Sends OTP via SMS using Twilio.
    """
    async def async_logic():
        url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Messages.json"
        data = {
            "To": phone_number,
            "From": TWILIO_NUMBER,
            "Body": f"Your OTP code is: {otp}"
        }

        auth = aiohttp.BasicAuth(TWILIO_SID, TWILIO_AUTH_TOKEN)

        async with aiohttp.ClientSession() as session:
            async with session.post(url, data=data, auth=auth) as resp:
                if 200 <= resp.status < 300:
                    return f"OTP SMS sent to {phone_number}"
                body = await resp.text()
                return f"Failed to send SMS OTP: {body}"

    return asyncio.run(async_logic())
