"""
Mock Application Submission Tool

Returns fake confirmation numbers without submitting to real university APIs.
Used in test mode to avoid affecting production application data.
"""

import logging
import random
import string
from datetime import datetime
from crewai.tools import tool

logger = logging.getLogger(__name__)


def generate_fake_confirmation_number() -> str:
    """
    Generate a fake application confirmation number.

    Format: TEST-YYYYMMDD-XXXXX
    Example: TEST-20260107-A1B2C

    Returns:
        Fake confirmation number string
    """
    date_part = datetime.now().strftime("%Y%m%d")
    random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"TEST-{date_part}-{random_part}"


@tool
def mock_submission_tool(app_json: dict) -> str:
    """
    Mock implementation of university application submission.

    Returns success with a fake confirmation number without making real API calls.
    Logs the submission details for debugging.

    Args:
        app_json: Application data dictionary

    Returns:
        Success message with fake confirmation number
    """
    confirmation = generate_fake_confirmation_number()

    # Extract key info for logging
    applicant_name = app_json.get("full_name", "Unknown")
    institution = app_json.get("institution", "Unknown")
    programme = app_json.get("programme", "Unknown")

    logger.info(
        f"[MOCK] Application submission for {applicant_name} to {institution} "
        f"({programme}). Confirmation: {confirmation}"
    )

    return (
        f"Application submitted successfully (MOCK). "
        f"Confirmation number: {confirmation}. "
        f"Institution: {institution}. "
        f"No real submission was made."
    )
