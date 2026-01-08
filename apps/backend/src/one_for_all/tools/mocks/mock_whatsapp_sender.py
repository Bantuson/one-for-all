"""
Mock WhatsApp Message Sender Tool

Returns success without sending real WhatsApp messages via Twilio.
Used in test mode to avoid API costs and message delivery.
"""

import logging
from crewai.tools import tool

logger = logging.getLogger(__name__)


@tool
def mock_whatsapp_sender(phone_number: str, message: str) -> str:
    """
    Mock implementation of Twilio WhatsApp message sender.

    Returns success without making real API calls.
    Logs the message for debugging purposes.

    Args:
        phone_number: Recipient phone number (WhatsApp format)
        message: Message content

    Returns:
        Success message string
    """
    logger.info(f"[MOCK] WhatsApp message would be sent to {phone_number}: {message}")
    return f"WhatsApp message sent to {phone_number} (MOCK - no real message sent)"
