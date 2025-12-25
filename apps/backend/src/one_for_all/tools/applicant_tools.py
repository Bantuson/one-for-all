"""
Applicant API Tools

CrewAI tools for applicant account operations via the internal API.
Replaces direct Supabase access with validated API calls.
"""

from typing import Optional

from crewai.tools import tool

from .api_client import api_get, api_post


@tool
def store_applicant(email: str, cellphone: str, username: Optional[str] = None) -> str:
    """
    Create a new applicant account after OTP verification.

    Args:
        email: Applicant's email address
        cellphone: South African phone number (e.g., +27821234567 or 0821234567)
        username: Optional username for the applicant

    Returns:
        JSON string with created applicant data or error message

    Example:
        result = store_applicant(
            email="student@example.com",
            cellphone="+27821234567",
            username="john_doe"
        )
    """
    data = {
        "email": email,
        "cellphone": cellphone,
    }

    if username:
        data["username"] = username

    result = api_post("/api/v1/applicants", data)

    if result.get("error"):
        return f"ERROR: {result.get('detail', 'Unknown error')}"

    return str(result)


@tool
def lookup_applicant(email: Optional[str] = None, cellphone: Optional[str] = None) -> str:
    """
    Look up an existing applicant by email or cellphone.

    Use this to check if a user is returning or new.
    At least one of email or cellphone must be provided.

    Args:
        email: Email address to search for
        cellphone: Phone number to search for

    Returns:
        JSON string with applicant data, "NOT_FOUND" if no match, or error message

    Example:
        # Check by email
        result = lookup_applicant(email="student@example.com")

        # Check by phone
        result = lookup_applicant(cellphone="+27821234567")
    """
    if not email and not cellphone:
        return "ERROR: Either email or cellphone must be provided"

    params = {}
    if email:
        params["email"] = email
    if cellphone:
        params["cellphone"] = cellphone

    result = api_get("/api/v1/applicants/lookup", params=params)

    if result.get("not_found"):
        return "NOT_FOUND"

    if result.get("error"):
        return f"ERROR: {result.get('detail', 'Unknown error')}"

    if result is None:
        return "NOT_FOUND"

    return str(result)


@tool
def get_applicant(applicant_id: str) -> str:
    """
    Get an applicant by their ID.

    Args:
        applicant_id: UUID of the applicant

    Returns:
        JSON string with applicant data or error message

    Example:
        result = get_applicant("123e4567-e89b-12d3-a456-426614174000")
    """
    result = api_get(f"/api/v1/applicants/{applicant_id}")

    if result.get("not_found"):
        return f"ERROR: Applicant {applicant_id} not found"

    if result.get("error"):
        return f"ERROR: {result.get('detail', 'Unknown error')}"

    return str(result)
