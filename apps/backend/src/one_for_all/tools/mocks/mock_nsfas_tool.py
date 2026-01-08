"""
Mock NSFAS Application Submission Tool

Returns fake NSFAS reference numbers without submitting to real NSFAS API.
Used in test mode to avoid affecting production NSFAS application data.
"""

import logging
import random
import string
from datetime import datetime
from crewai.tools import tool

logger = logging.getLogger(__name__)


def generate_fake_nsfas_reference() -> str:
    """
    Generate a fake NSFAS reference number.

    Format: TEST-NSFAS-YYYYMMDD-XXXXX
    Example: TEST-NSFAS-20260107-N1S2F

    Returns:
        Fake NSFAS reference number string
    """
    date_part = datetime.now().strftime("%Y%m%d")
    random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"TEST-NSFAS-{date_part}-{random_part}"


@tool
def mock_nsfas_submission_tool(nsfas_json: dict) -> str:
    """
    Mock implementation of NSFAS application submission.

    Returns success with a fake reference number without making real API calls.
    Logs the submission details for debugging.

    Args:
        nsfas_json: NSFAS application data dictionary

    Returns:
        Success message with fake NSFAS reference number
    """
    reference = generate_fake_nsfas_reference()

    # Extract key info for logging
    applicant_name = nsfas_json.get("full_name", "Unknown")
    id_number = nsfas_json.get("id_number", "Unknown")

    logger.info(
        f"[MOCK] NSFAS application submission for {applicant_name} (ID: {id_number}). "
        f"Reference: {reference}"
    )

    return (
        f"NSFAS application submitted successfully (MOCK). "
        f"Reference number: {reference}. "
        f"No real submission was made."
    )
