"""
Test Configuration Module

Manages test mode for CrewAI application agents to prevent production data
contamination and API cost accumulation during testing.

Environment Variables:
    ONEFORALL_TEST_MODE: Set to 'true' or '1' to enable test mode

Test Mode Effects:
    - Replaces real tools with mocks in TOOL_REGISTRY
    - Student numbers prefixed with "TEST-" for cleanup
    - No real SMS/Email/WhatsApp messages sent
    - No real university/NSFAS submissions made
"""

import os
import logging
from typing import Dict

logger = logging.getLogger(__name__)

# Read test mode from environment
TEST_MODE = os.getenv("ONEFORALL_TEST_MODE", "false").lower() in ("true", "1", "yes")

# Log test mode status
if TEST_MODE:
    logger.info("=" * 60)
    logger.info("TEST MODE ENABLED - Using mock tools")
    logger.info("No real API calls will be made")
    logger.info("Student numbers will be prefixed with TEST-")
    logger.info("=" * 60)
else:
    logger.info("Running in PRODUCTION mode with real tools")


# Mock tool registry mapping
# Maps real tool names to mock tool names
MOCK_TOOLS: Dict[str, str] = {
    # OTP & Messaging Tools
    "sendgrid_otp_sender": "mock_otp_sender",
    "sms_otp_sender": "mock_sms_sender",
    "send_whatsapp_message": "mock_whatsapp_sender",

    # Submission Tools
    "application_submission_tool": "mock_submission_tool",
    "nsfas_application_submission_tool": "mock_nsfas_submission_tool",

    # Status Check Tools
    "application_status_tool": "mock_status_tool",
    "nsfas_status_tool": "mock_nsfas_status_tool",
}


def is_test_mode() -> bool:
    """
    Check if the application is running in test mode.

    Returns:
        True if test mode is enabled, False otherwise
    """
    return TEST_MODE


def get_mock_tool_name(real_tool_name: str) -> str:
    """
    Get the mock tool name for a given real tool name.

    Args:
        real_tool_name: Name of the real tool

    Returns:
        Mock tool name if available, otherwise returns the real tool name
    """
    return MOCK_TOOLS.get(real_tool_name, real_tool_name)


def log_test_mode_warning():
    """Log a warning message about test mode being enabled."""
    if TEST_MODE:
        logger.warning(
            "TEST MODE is enabled. No real external API calls will be made. "
            "Set ONEFORALL_TEST_MODE=false to use production tools."
        )
