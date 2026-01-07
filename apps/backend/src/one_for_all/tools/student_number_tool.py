"""
Student Number Generator Tool

CrewAI tool for generating institution-specific student numbers via Supabase RPC.
"""

import asyncio
from datetime import datetime

from crewai.tools import tool

from .supabase_client import supabase


@tool
def generate_student_number(institution_id: str, applicant_id: str) -> str:
    """
    Generate a unique student number for an applicant at a specific institution.

    Calls the Supabase RPC function to generate an institution-specific student number
    following the format rules (e.g., UP: u24012345, UCT: SMITH12345).
    Updates the applicant_accounts table with the generated student number.

    Args:
        institution_id: UUID of the institution
        applicant_id: UUID of the applicant

    Returns:
        Generated student number or error message
    """
    async def async_logic():
        if not supabase:
            return "ERROR: Supabase client not configured"

        try:
            # Call the RPC function to generate student number
            result = supabase.rpc(
                "generate_student_number",
                {"p_institution_id": institution_id, "p_applicant_id": applicant_id}
            ).execute()

            if not result.data:
                return "ERROR: Failed to generate student number - no data returned"

            student_number = result.data

            # The RPC function handles updating the applicant record
            # Return the generated student number
            return f"Student number generated: {student_number}"

        except Exception as e:
            error_msg = str(e)
            if "function" in error_msg.lower() and "does not exist" in error_msg.lower():
                return "ERROR: generate_student_number function not found in database. Run the migration first."
            return f"ERROR: Failed to generate student number - {error_msg}"

    return asyncio.run(async_logic())


@tool
def get_applicant_student_numbers(applicant_id: str) -> str:
    """
    Retrieve all student numbers for an applicant across institutions.

    Args:
        applicant_id: UUID of the applicant

    Returns:
        JSON string with student numbers mapping or error message
    """
    async def async_logic():
        if not supabase:
            return "ERROR: Supabase client not configured"

        try:
            result = supabase.table("applicant_accounts").select(
                "id, student_numbers, primary_student_number, student_number_generated_at"
            ).eq("id", applicant_id).single().execute()

            if not result.data:
                return f"ERROR: Applicant {applicant_id} not found"

            data = result.data
            student_numbers = data.get("student_numbers", {})
            primary = data.get("primary_student_number")
            generated_at = data.get("student_number_generated_at")

            if not student_numbers and not primary:
                return "NO_STUDENT_NUMBERS: Applicant has no student numbers assigned yet"

            return str({
                "applicant_id": applicant_id,
                "student_numbers": student_numbers,
                "primary_student_number": primary,
                "generated_at": generated_at
            })

        except Exception as e:
            return f"ERROR: Failed to retrieve student numbers - {str(e)}"

    return asyncio.run(async_logic())


@tool
def validate_student_number(institution_code: str, student_number: str) -> str:
    """
    Validate a student number against the institution's format rules.

    Args:
        institution_code: Short code of the institution (e.g., UP, UCT, WITS)
        student_number: The student number to validate

    Returns:
        Validation result (VALID, INVALID with reason, or error message)
    """
    async def async_logic():
        if not supabase:
            return "ERROR: Supabase client not configured"

        try:
            # Get the format rules for this institution
            result = supabase.table("institution_student_number_formats").select(
                "format_regex, format_pattern, example"
            ).eq("institution_code", institution_code.upper()).eq("is_active", True).single().execute()

            if not result.data:
                return f"ERROR: No format rules found for institution {institution_code}"

            import re
            format_data = result.data
            regex_pattern = format_data.get("format_regex", "")

            if not regex_pattern:
                return "ERROR: No regex pattern defined for this institution"

            if re.match(regex_pattern, student_number):
                return f"VALID: Student number '{student_number}' matches {institution_code} format"
            else:
                example = format_data.get("example", "N/A")
                pattern = format_data.get("format_pattern", "N/A")
                return f"INVALID: Student number '{student_number}' does not match {institution_code} format. Expected pattern: {pattern}, Example: {example}"

        except Exception as e:
            error_msg = str(e)
            if "No rows" in error_msg or "0 rows" in error_msg:
                return f"ERROR: No format rules found for institution {institution_code}"
            return f"ERROR: Failed to validate student number - {error_msg}"

    return asyncio.run(async_logic())


@tool
def assign_student_number_manually(
    applicant_id: str,
    institution_code: str,
    student_number: str,
    set_as_primary: bool = False
) -> str:
    """
    Manually assign a student number to an applicant for a specific institution.

    Use this when student numbers are provided externally (e.g., from university API).

    Args:
        applicant_id: UUID of the applicant
        institution_code: Short code of the institution (e.g., UP, UCT)
        student_number: The student number to assign
        set_as_primary: Whether to set this as the primary student number

    Returns:
        Success confirmation or error message
    """
    async def async_logic():
        if not supabase:
            return "ERROR: Supabase client not configured"

        try:
            # Get current student numbers
            current = supabase.table("applicant_accounts").select(
                "student_numbers"
            ).eq("id", applicant_id).single().execute()

            if not current.data:
                return f"ERROR: Applicant {applicant_id} not found"

            student_numbers = current.data.get("student_numbers", {}) or {}
            student_numbers[institution_code.upper()] = student_number

            # Prepare update data
            update_data = {
                "student_numbers": student_numbers,
                "student_number_generated_at": datetime.utcnow().isoformat()
            }

            if set_as_primary:
                update_data["primary_student_number"] = student_number

            # Update the record
            result = supabase.table("applicant_accounts").update(
                update_data
            ).eq("id", applicant_id).execute()

            if result.data:
                primary_msg = " (set as primary)" if set_as_primary else ""
                return f"Student number '{student_number}' assigned to applicant for {institution_code}{primary_msg}"
            else:
                return "ERROR: Failed to update applicant record"

        except Exception as e:
            return f"ERROR: Failed to assign student number - {str(e)}"

    return asyncio.run(async_logic())
