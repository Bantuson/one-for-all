"""
Mock SMS OTP Sender Tool

Returns success without sending real SMS via Twilio.
Used in test mode to avoid API costs and SMS delivery.
"""

import logging
from crewai.tools import tool

logger = logging.getLogger(__name__)


@tool
def mock_sms_sender(phone_number: str, otp: str) -> str:
    """
    Mock implementation of Twilio SMS OTP sender.

    Returns success without making real API calls.
    Logs the OTP for debugging purposes.

    Args:
        phone_number: Recipient phone number
        otp: One-time password code

    Returns:
        Success message string
    """
    logger.info(f"[MOCK] SMS OTP would be sent to {phone_number}: {otp}")
    return f"OTP SMS sent to {phone_number} (MOCK - no real SMS sent)"
