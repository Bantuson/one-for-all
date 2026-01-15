"""
Student Number Generator Tool

CrewAI tool for generating institution-specific student numbers via Supabase RPC.

This module provides tools for:
- Generating institution-specific student numbers on application submission
- Retrieving platform-wide student numbers (always visible)
- Retrieving institution student numbers (only visible after acceptance)
- Validating student numbers against institution format rules

In TEST_MODE, student numbers are prefixed with "TEST-" for easy cleanup.
"""

import asyncio
import re
from datetime import datetime

from crewai.tools import tool

from .supabase_client import supabase
from one_for_all.config.test_config import TEST_MODE


@tool
def generate_student_number(institution_id: str, applicant_id: str) -> str:
    """
    Generate institution-specific student number on application submission.

    Calls the Supabase RPC function generate_institution_student_number to create
    a unique student number following institution-specific format rules.
    The number is stored in applicant_accounts.institution_student_numbers JSONB
    but is NOT revealed to the applicant until their application is accepted.

    Args:
        institution_id: UUID of the institution
        applicant_id: UUID of the applicant

    Returns:
        Success message (NOT the actual number - it's only revealed after acceptance)
        or error message if generation failed
    """
    async def async_logic():
        if not supabase:
            return "ERROR: Supabase client not configured"

        try:
            # Call the RPC function to generate institution student number
            result = supabase.rpc(
                "generate_institution_student_number",
                {"p_institution_id": institution_id, "p_applicant_id": applicant_id}
            ).execute()

            if result.data is None:
                return "ERROR: Failed to generate student number - no format configured for this institution"

            student_number = result.data

            # In test mode, prefix with TEST- for cleanup identification
            if TEST_MODE and student_number and not student_number.startswith("TEST-"):
                # Get institution code to update the JSONB properly
                inst_result = supabase.table("institution_student_number_formats").select(
                    "institution_code"
                ).eq("institution_id", institution_id).eq("is_active", True).single().execute()

                if inst_result.data:
                    inst_code = inst_result.data.get("institution_code")
                    test_number = f"TEST-{student_number}"

                    # Update with test prefix
                    try:
                        supabase.table("applicant_accounts").update({
                            "institution_student_numbers": supabase.rpc(
                                "jsonb_set",
                                {
                                    "target": supabase.table("applicant_accounts")
                                        .select("institution_student_numbers")
                                        .eq("id", applicant_id)
                                        .single(),
                                    "path": [inst_code],
                                    "new_value": test_number
                                }
                            )
                        }).eq("id", applicant_id).execute()
                    except Exception:
                        # If JSONB update fails, do it the simple way
                        current = supabase.table("applicant_accounts").select(
                            "institution_student_numbers"
                        ).eq("id", applicant_id).single().execute()

                        if current.data:
                            inst_numbers = current.data.get("institution_student_numbers", {}) or {}
                            inst_numbers[inst_code] = test_number
                            supabase.table("applicant_accounts").update({
                                "institution_student_numbers": inst_numbers
                            }).eq("id", applicant_id).execute()

            # Return success message without revealing the number
            # The number is only revealed after acceptance via get_institution_student_number
            return "SUCCESS: Institution student number generated and stored. Number will be revealed upon application acceptance."

        except Exception as e:
            error_msg = str(e)
            if "function" in error_msg.lower() and "does not exist" in error_msg.lower():
                return "ERROR: generate_institution_student_number function not found in database. Run migration 016_student_numbers.sql first."
            return f"ERROR: Failed to generate student number - {error_msg}"

    return asyncio.run(async_logic())


@tool
def get_platform_student_number(applicant_id: str) -> str:
    """
    Get the platform-wide student number for an applicant.

    The platform student number (format: OFA-2kYY-NNNN) is assigned automatically
    when an applicant account is created and can always be shown to the applicant.

    Args:
        applicant_id: UUID of the applicant

    Returns:
        Platform student number or error message
    """
    async def async_logic():
        if not supabase:
            return "ERROR: Supabase client not configured"

        try:
            result = supabase.table("applicant_accounts").select(
                "platform_student_number"
            ).eq("id", applicant_id).single().execute()

            if not result.data:
                return f"ERROR: Applicant {applicant_id} not found"

            platform_number = result.data.get("platform_student_number")

            if not platform_number:
                return "NO_PLATFORM_NUMBER: Applicant does not have a platform student number assigned yet"

            return f"Platform Student Number: {platform_number}"

        except Exception as e:
            error_msg = str(e)
            if "No rows" in error_msg or "0 rows" in error_msg:
                return f"ERROR: Applicant {applicant_id} not found"
            return f"ERROR: Failed to retrieve platform student number - {error_msg}"

    return asyncio.run(async_logic())


@tool
def get_institution_student_number(applicant_id: str, institution_code: str) -> str:
    """
    Get institution student number - only if application is accepted.

    Institution-specific student numbers are generated on application submission
    but are only revealed to the applicant after their application has been accepted.
    This ensures students only see their student number when they've been admitted.

    Args:
        applicant_id: UUID of the applicant
        institution_code: Short code of the institution (e.g., UP, UCT, WITS)

    Returns:
        Student number if accepted, or NOT_REVEALED message if not yet accepted
    """
    async def async_logic():
        if not supabase:
            return "ERROR: Supabase client not configured"

        try:
            # First check if the applicant has any accepted applications for this institution
            # Query application_choices joined with applications to find accepted status
            accepted_check = supabase.table("application_choices").select(
                "id, status, application_id"
            ).eq("status", "accepted").execute()

            # If no results, we need to check via the institutions table
            institution_result = supabase.table("institutions").select(
                "id"
            ).eq("code", institution_code.upper()).single().execute()

            if not institution_result.data:
                return f"ERROR: Institution with code '{institution_code}' not found"

            institution_id = institution_result.data.get("id")

            # Get applications for this applicant at this institution
            apps_result = supabase.table("applications").select(
                "id"
            ).eq("applicant_id", applicant_id).execute()

            if not apps_result.data:
                return f"NOT_REVEALED: No applications found for this applicant"

            app_ids = [app.get("id") for app in apps_result.data]

            # Check if any application_choices for this institution are accepted
            has_accepted = False
            for app_id in app_ids:
                choice_result = supabase.table("application_choices").select(
                    "id, status"
                ).eq("application_id", app_id).eq(
                    "institution_id", institution_id
                ).eq("status", "accepted").execute()

                if choice_result.data and len(choice_result.data) > 0:
                    has_accepted = True
                    break

            if not has_accepted:
                return f"NOT_REVEALED: Student number for {institution_code} will be available after your application is accepted"

            # Application is accepted, retrieve the student number
            applicant_result = supabase.table("applicant_accounts").select(
                "institution_student_numbers"
            ).eq("id", applicant_id).single().execute()

            if not applicant_result.data:
                return f"ERROR: Applicant {applicant_id} not found"

            inst_numbers = applicant_result.data.get("institution_student_numbers", {}) or {}
            student_number = inst_numbers.get(institution_code.upper())

            if not student_number:
                return f"NO_NUMBER: No student number found for {institution_code}. Contact admissions office."

            return f"Institution Student Number ({institution_code}): {student_number}"

        except Exception as e:
            error_msg = str(e)
            if "No rows" in error_msg or "0 rows" in error_msg:
                return f"ERROR: Record not found"
            return f"ERROR: Failed to retrieve institution student number - {error_msg}"

    return asyncio.run(async_logic())


@tool
def get_applicant_student_numbers(applicant_id: str) -> str:
    """
    Retrieve all student numbers for an applicant (platform + visible institution numbers).

    This returns the platform student number and any institution student numbers
    where the applicant has an accepted application. Institution numbers for
    non-accepted applications are hidden.

    Args:
        applicant_id: UUID of the applicant

    Returns:
        JSON string with student numbers mapping or error message
    """
    async def async_logic():
        if not supabase:
            return "ERROR: Supabase client not configured"

        try:
            # Get applicant data
            result = supabase.table("applicant_accounts").select(
                "id, platform_student_number, institution_student_numbers"
            ).eq("id", applicant_id).single().execute()

            if not result.data:
                return f"ERROR: Applicant {applicant_id} not found"

            data = result.data
            platform_number = data.get("platform_student_number")
            all_inst_numbers = data.get("institution_student_numbers", {}) or {}

            # Get accepted institution codes for this applicant
            apps_result = supabase.table("applications").select("id").eq(
                "applicant_id", applicant_id
            ).execute()

            visible_inst_numbers = {}

            if apps_result.data:
                app_ids = [app.get("id") for app in apps_result.data]

                for app_id in app_ids:
                    # Get accepted choices with institution info
                    choices_result = supabase.table("application_choices").select(
                        "institution_id"
                    ).eq("application_id", app_id).eq("status", "accepted").execute()

                    if choices_result.data:
                        for choice in choices_result.data:
                            inst_id = choice.get("institution_id")
                            # Get institution code
                            inst_result = supabase.table("institutions").select(
                                "code"
                            ).eq("id", inst_id).single().execute()

                            if inst_result.data:
                                inst_code = inst_result.data.get("code")
                                if inst_code and inst_code in all_inst_numbers:
                                    visible_inst_numbers[inst_code] = all_inst_numbers[inst_code]

            if not platform_number and not visible_inst_numbers:
                return "NO_STUDENT_NUMBERS: No student numbers available yet"

            return str({
                "applicant_id": applicant_id,
                "platform_student_number": platform_number,
                "institution_student_numbers": visible_inst_numbers,
                "note": "Only institution numbers for accepted applications are shown"
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
    student_number: str
) -> str:
    """
    Manually assign a student number to an applicant for a specific institution.

    Use this when student numbers are provided externally (e.g., from university API
    response after successful submission). This updates the institution_student_numbers
    JSONB field in applicant_accounts.

    Args:
        applicant_id: UUID of the applicant
        institution_code: Short code of the institution (e.g., UP, UCT, WITS)
        student_number: The student number to assign

    Returns:
        Success confirmation or error message
    """
    async def async_logic():
        if not supabase:
            return "ERROR: Supabase client not configured"

        try:
            # Get current institution student numbers
            current = supabase.table("applicant_accounts").select(
                "institution_student_numbers"
            ).eq("id", applicant_id).single().execute()

            if not current.data:
                return f"ERROR: Applicant {applicant_id} not found"

            inst_numbers = current.data.get("institution_student_numbers", {}) or {}
            inst_numbers[institution_code.upper()] = student_number

            # Update the record
            result = supabase.table("applicant_accounts").update({
                "institution_student_numbers": inst_numbers
            }).eq("id", applicant_id).execute()

            if result.data:
                return f"SUCCESS: Student number '{student_number}' assigned for {institution_code}"
            else:
                return "ERROR: Failed to update applicant record"

        except Exception as e:
            return f"ERROR: Failed to assign student number - {str(e)}"

    return asyncio.run(async_logic())
