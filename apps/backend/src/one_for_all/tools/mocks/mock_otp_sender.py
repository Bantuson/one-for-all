"""
Mock OTP Sender Tool

Returns success without sending real emails via SendGrid.
Used in test mode to avoid API costs and email delivery.
"""

import logging
from crewai.tools import tool

logger = logging.getLogger(__name__)


@tool
def mock_otp_sender(email: str, otp: str) -> str:
    """
    Mock implementation of SendGrid OTP sender.

    Returns success without making real API calls.
    Logs the OTP for debugging purposes.

    Args:
        email: Recipient email address
        otp: One-time password code

    Returns:
        Success message string
    """
    logger.info(f"[MOCK] OTP would be sent to {email}: {otp}")
    return f"OTP sent to {email} (MOCK - no real email sent)"
