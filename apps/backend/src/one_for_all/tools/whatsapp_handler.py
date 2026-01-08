"""
WhatsApp Handler Tools

CrewAI tools for sending WhatsApp messages via Twilio Business API.
"""

import os
import asyncio
from datetime import datetime
from pathlib import Path

import aiohttp
from crewai.tools import tool
from dotenv import load_dotenv

# Load environment from monorepo root
load_dotenv(dotenv_path=Path(__file__).resolve().parents[5] / '.env.local')

TWILIO_SID = os.getenv("TWILIO_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER")


def format_whatsapp_number(phone: str) -> str:
    """
    Format phone number to WhatsApp format (whatsapp:+27...).

    Args:
        phone: Phone number in various formats (e.g., 0821234567, +27821234567, 27821234567)

    Returns:
        Formatted WhatsApp number (e.g., whatsapp:+27821234567)
    """
    # Remove all non-digit characters except +
    cleaned = ''.join(c for c in phone if c.isdigit() or c == '+')

    # Handle South African number formats
    if cleaned.startswith('0'):
        # Convert 0XX to +27XX
        cleaned = '+27' + cleaned[1:]
    elif cleaned.startswith('27') and not cleaned.startswith('+'):
        # Add + prefix
        cleaned = '+' + cleaned
    elif not cleaned.startswith('+'):
        # Assume South African if no country code
        cleaned = '+27' + cleaned

    return f"whatsapp:{cleaned}"


@tool
def send_whatsapp_message(phone_number: str, message: str) -> str:
    """
    Send a WhatsApp message via Twilio Business API.

    Args:
        phone_number: Recipient phone number (SA format: 0821234567 or +27821234567)
        message: The message content to send

    Returns:
        Success message with SID or error details
    """
    async def async_logic():
        if not all([TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER]):
            return "ERROR: Twilio WhatsApp credentials not configured"

        formatted_to = format_whatsapp_number(phone_number)
        formatted_from = f"whatsapp:{TWILIO_WHATSAPP_NUMBER}" if not TWILIO_WHATSAPP_NUMBER.startswith("whatsapp:") else TWILIO_WHATSAPP_NUMBER

        url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Messages.json"
        data = {
            "To": formatted_to,
            "From": formatted_from,
            "Body": message
        }

        auth = aiohttp.BasicAuth(TWILIO_SID, TWILIO_AUTH_TOKEN)

        async with aiohttp.ClientSession() as session:
            async with session.post(url, data=data, auth=auth) as resp:
                response_body = await resp.json()

                if 200 <= resp.status < 300:
                    message_sid = response_body.get("sid", "unknown")
                    return f"WhatsApp message sent to {formatted_to}. SID: {message_sid}"

                error_message = response_body.get("message", "Unknown error")
                error_code = response_body.get("code", resp.status)
                return f"Failed to send WhatsApp message: [{error_code}] {error_message}"

    return asyncio.run(async_logic())


@tool
def send_whatsapp_otp(phone_number: str) -> str:
    """
    Generates a 6-digit OTP, stores it in the database, and sends it via WhatsApp.
    The OTP is generated internally for security.

    Args:
        phone_number: Recipient phone number (SA format: 0821234567 or +27821234567)

    Returns:
        Success message with OTP sent confirmation, or error details
    """
    from .otp_store import generate_otp, store_otp

    # Generate OTP
    otp = generate_otp()

    # Store OTP in database (use normalized phone format for identifier)
    normalized_phone = format_whatsapp_number(phone_number).replace("whatsapp:", "")
    if not store_otp(identifier=normalized_phone, channel="whatsapp", code=otp):
        return f"Failed to store OTP for {phone_number}. WhatsApp message not sent."

    # Send OTP via WhatsApp
    message = f"Your One For All verification code is: {otp}\n\nThis code expires in 10 minutes. Do not share this code with anyone."
    return send_whatsapp_message.func(phone_number, message)


@tool
def log_whatsapp_interaction(
    applicant_id: str,
    phone_number: str,
    message_type: str,
    message_content: str,
    direction: str = "outbound"
) -> str:
    """
    Log a WhatsApp interaction for audit and tracking.

    Args:
        applicant_id: UUID of the applicant
        phone_number: WhatsApp number used
        message_type: Type of message (otp, notification, reminder, response)
        message_content: Brief description of message content
        direction: Message direction (inbound or outbound)

    Returns:
        Confirmation of logged interaction
    """
    async def async_logic():
        from .supabase_client import supabase

        if not supabase:
            return "ERROR: Supabase client not configured"

        formatted_number = format_whatsapp_number(phone_number)
        timestamp = datetime.utcnow().isoformat()

        try:
            # Update applicant's last WhatsApp message timestamp
            result = supabase.table("applicant_accounts").update({
                "last_whatsapp_message_at": timestamp,
                "whatsapp_number": formatted_number.replace("whatsapp:", "")
            }).eq("id", applicant_id).execute()

            if result.data:
                return f"WhatsApp interaction logged for applicant {applicant_id} at {timestamp}. Type: {message_type}, Direction: {direction}"
            else:
                return f"WhatsApp interaction logged (applicant record not updated). Type: {message_type}, Direction: {direction}"

        except Exception as e:
            return f"WhatsApp interaction completed but logging failed: {str(e)}"

    return asyncio.run(async_logic())


@tool
def send_whatsapp_template(phone_number: str, template_name: str, template_params: str = "") -> str:
    """
    Send a pre-approved WhatsApp template message.

    Args:
        phone_number: Recipient phone number (SA format)
        template_name: Name of the approved Twilio template
        template_params: Comma-separated template parameters (e.g., "John,UCT,Computer Science")

    Returns:
        Success message with SID or error details
    """
    async def async_logic():
        if not all([TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER]):
            return "ERROR: Twilio WhatsApp credentials not configured"

        formatted_to = format_whatsapp_number(phone_number)
        formatted_from = f"whatsapp:{TWILIO_WHATSAPP_NUMBER}" if not TWILIO_WHATSAPP_NUMBER.startswith("whatsapp:") else TWILIO_WHATSAPP_NUMBER

        url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Messages.json"

        # Build content SID format for templates
        data = {
            "To": formatted_to,
            "From": formatted_from,
            "ContentSid": template_name,
        }

        # Add template variables if provided
        if template_params:
            params_list = [p.strip() for p in template_params.split(",")]
            content_variables = {str(i+1): param for i, param in enumerate(params_list)}
            import json
            data["ContentVariables"] = json.dumps(content_variables)

        auth = aiohttp.BasicAuth(TWILIO_SID, TWILIO_AUTH_TOKEN)

        async with aiohttp.ClientSession() as session:
            async with session.post(url, data=data, auth=auth) as resp:
                response_body = await resp.json()

                if 200 <= resp.status < 300:
                    message_sid = response_body.get("sid", "unknown")
                    return f"WhatsApp template '{template_name}' sent to {formatted_to}. SID: {message_sid}"

                error_message = response_body.get("message", "Unknown error")
                error_code = response_body.get("code", resp.status)
                return f"Failed to send WhatsApp template: [{error_code}] {error_message}"

    return asyncio.run(async_logic())
