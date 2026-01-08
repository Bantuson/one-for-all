"""
Mock Application Status Tools

Returns fake status information without querying real university/NSFAS APIs.
Used in test mode to avoid making real status check API calls.
"""

import logging
from crewai.tools import tool

logger = logging.getLogger(__name__)


@tool
def mock_status_tool(confirmation_number: str) -> str:
    """
    Mock implementation of university application status check.

    Returns fake status without making real API calls.
    Recognizes TEST- prefix and returns pending status.

    Args:
        confirmation_number: Application confirmation number

    Returns:
        Fake status message string
    """
    logger.info(f"[MOCK] Status check for confirmation: {confirmation_number}")

    is_test = confirmation_number.startswith("TEST-")

    if is_test:
        return (
            f"Application status (MOCK): PENDING. "
            f"Confirmation: {confirmation_number}. "
            f"This is a test application. No real status check was made."
        )
    else:
        return (
            f"Application status (MOCK): UNDER_REVIEW. "
            f"Confirmation: {confirmation_number}. "
            f"No real status check was made."
        )


@tool
def mock_nsfas_status_tool(reference_number: str) -> str:
    """
    Mock implementation of NSFAS application status check.

    Returns fake status without making real API calls.
    Recognizes TEST-NSFAS- prefix and returns pending status.

    Args:
        reference_number: NSFAS reference number

    Returns:
        Fake status message string
    """
    logger.info(f"[MOCK] NSFAS status check for reference: {reference_number}")

    is_test = reference_number.startswith("TEST-NSFAS-")

    if is_test:
        return (
            f"NSFAS application status (MOCK): PENDING_VERIFICATION. "
            f"Reference: {reference_number}. "
            f"This is a test application. No real status check was made."
        )
    else:
        return (
            f"NSFAS application status (MOCK): SUBMITTED. "
            f"Reference: {reference_number}. "
            f"No real status check was made."
        )
