import os
import asyncio
import aiohttp
from crewai.tools import tool
from .otp_store import generate_otp, store_otp

TWILIO_SID = os.getenv("TWILIO_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_NUMBER = os.getenv("TWILIO_NUMBER")

@tool
def sms_otp_sender(phone_number: str) -> str:
    """
    Generates a 6-digit OTP, stores it in the database, and sends it via SMS using Twilio.
    The OTP is generated internally for security.

    Args:
        phone_number: The phone number to send the OTP to (e.g., +27821234567)

    Returns:
        Success message with OTP sent confirmation, or error details
    """
    async def async_logic():
        # Generate OTP
        otp = generate_otp()

        # Store OTP in database
        if not store_otp(identifier=phone_number, channel="sms", code=otp):
            return f"Failed to store OTP for {phone_number}. SMS not sent."

        # Send OTP via Twilio SMS
        url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Messages.json"
        data = {
            "To": phone_number,
            "From": TWILIO_NUMBER,
            "Body": f"Your One For All verification code is: {otp}\n\nThis code expires in 10 minutes. Do not share this code with anyone."
        }

        auth = aiohttp.BasicAuth(TWILIO_SID, TWILIO_AUTH_TOKEN)

        async with aiohttp.ClientSession() as session:
            async with session.post(url, data=data, auth=auth) as resp:
                if 200 <= resp.status < 300:
                    return f"OTP SMS sent to {phone_number}. Code expires in 10 minutes."
                body = await resp.text()
                return f"Failed to send SMS OTP: {body}"

    return asyncio.run(async_logic())
