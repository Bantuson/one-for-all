"""
Application Choices Tool

CrewAI tools for managing application course choices during submission.

This module provides tools for:
- Creating application choices (first and second choice)
- Validating courses before submission
- Generating student numbers on submission
- Getting application choices summary

The application flow is:
1. Validate course status (validate_course_for_submission)
2. Create application record
3. Create application_choices for first and second choice
4. Generate institution student number
"""

import asyncio
from typing import Optional

from crewai.tools import tool

from .supabase_client import supabase
from .course_validation_tool import validate_course_for_submission
from .student_number_tool import generate_student_number


@tool
def create_application_choice(
    application_id: str,
    course_id: str,
    institution_id: str,
    priority: int,
    faculty_id: Optional[str] = None,
    campus_id: Optional[str] = None
) -> str:
    """
    Create an application choice record for a specific course.

    This links an application to a course with a priority (1 = first choice, 2 = second choice).
    Each choice has its own status tracking independent of the overall application.

    Args:
        application_id: UUID of the parent application
        course_id: UUID of the course being applied to
        institution_id: UUID of the institution offering the course
        priority: 1 for first choice, 2 for second choice
        faculty_id: Optional UUID of the faculty
        campus_id: Optional UUID of the campus

    Returns:
        Success message with choice ID or error message
    """
    async def async_logic():
        if not supabase:
            return "ERROR: Supabase client not configured"

        try:
            # Validate priority
            if priority not in (1, 2):
                return "ERROR: Priority must be 1 (first choice) or 2 (second choice)"

            # First, validate the course is open for applications
            # We do this inline to avoid double async wrapping
            course_result = supabase.table("courses").select(
                "id, name, code, computed_status"
            ).eq("id", course_id).single().execute()

            if not course_result.data:
                return f"ERROR: Course {course_id} not found"

            course = course_result.data
            status = course.get("computed_status")

            if status == "closed":
                return f"ERROR: Cannot submit - applications for '{course.get('name')}' are closed"

            if status == "coming_soon":
                return f"ERROR: Cannot submit - applications for '{course.get('name')}' are not yet open"

            # Build the choice record
            choice_data = {
                "application_id": application_id,
                "course_id": course_id,
                "institution_id": institution_id,
                "priority": priority,
                "status": "pending"
            }

            if faculty_id:
                choice_data["faculty_id"] = faculty_id
            if campus_id:
                choice_data["campus_id"] = campus_id

            # Insert the choice
            result = supabase.table("application_choices").insert(choice_data).execute()

            if not result.data:
                return "ERROR: Failed to create application choice"

            choice = result.data[0]
            choice_id = choice.get("id")

            priority_label = "first" if priority == 1 else "second"
            return f"SUCCESS: Application choice created (ID: {choice_id}) - {priority_label} choice for '{course.get('name')}'"

        except Exception as e:
            error_msg = str(e)
            # Handle unique constraint violations
            if "unique" in error_msg.lower() or "duplicate" in error_msg.lower():
                if "priority" in error_msg.lower():
                    return f"ERROR: This application already has a priority {priority} choice"
                if "course_id" in error_msg.lower():
                    return "ERROR: This application already has a choice for this course"
            return f"ERROR: Failed to create application choice - {error_msg}"

    return asyncio.run(async_logic())


@tool
def submit_application_with_choices(
    application_id: str,
    applicant_id: str,
    first_choice_course_id: str,
    first_choice_institution_id: str,
    second_choice_course_id: Optional[str] = None,
    second_choice_institution_id: Optional[str] = None,
    first_choice_faculty_id: Optional[str] = None,
    first_choice_campus_id: Optional[str] = None,
    second_choice_faculty_id: Optional[str] = None,
    second_choice_campus_id: Optional[str] = None
) -> str:
    """
    Submit an application with course choices and generate student numbers.

    This is the main submission tool that:
    1. Validates both course choices are open
    2. Creates application_choices records
    3. Generates institution student number(s) for the applicant
    4. Updates application status to 'submitted'

    Args:
        application_id: UUID of the application to submit
        applicant_id: UUID of the applicant
        first_choice_course_id: UUID of the first choice course (required)
        first_choice_institution_id: UUID of the first choice institution
        second_choice_course_id: UUID of the second choice course (optional)
        second_choice_institution_id: UUID of the second choice institution (required if second_choice_course_id provided)
        first_choice_faculty_id: Optional faculty for first choice
        first_choice_campus_id: Optional campus for first choice
        second_choice_faculty_id: Optional faculty for second choice
        second_choice_campus_id: Optional campus for second choice

    Returns:
        Success message with submission details or error message
    """
    async def async_logic():
        if not supabase:
            return "ERROR: Supabase client not configured"

        try:
            errors = []
            created_choices = []
            student_numbers_generated = []

            # Validate first choice course
            first_course_result = supabase.table("courses").select(
                "id, name, code, computed_status"
            ).eq("id", first_choice_course_id).single().execute()

            if not first_course_result.data:
                return f"ERROR: First choice course {first_choice_course_id} not found"

            first_course = first_course_result.data
            if first_course.get("computed_status") == "closed":
                return f"ERROR: First choice '{first_course.get('name')}' is closed for applications"
            if first_course.get("computed_status") == "coming_soon":
                return f"ERROR: First choice '{first_course.get('name')}' is not yet accepting applications"

            # Validate second choice if provided
            if second_choice_course_id:
                if not second_choice_institution_id:
                    return "ERROR: second_choice_institution_id is required when second_choice_course_id is provided"

                second_course_result = supabase.table("courses").select(
                    "id, name, code, computed_status"
                ).eq("id", second_choice_course_id).single().execute()

                if not second_course_result.data:
                    return f"ERROR: Second choice course {second_choice_course_id} not found"

                second_course = second_course_result.data
                if second_course.get("computed_status") == "closed":
                    errors.append(f"Second choice '{second_course.get('name')}' is closed - skipping")
                elif second_course.get("computed_status") == "coming_soon":
                    errors.append(f"Second choice '{second_course.get('name')}' not yet open - skipping")

            # Create first choice
            first_choice_data = {
                "application_id": application_id,
                "course_id": first_choice_course_id,
                "institution_id": first_choice_institution_id,
                "priority": 1,
                "status": "pending"
            }
            if first_choice_faculty_id:
                first_choice_data["faculty_id"] = first_choice_faculty_id
            if first_choice_campus_id:
                first_choice_data["campus_id"] = first_choice_campus_id

            first_result = supabase.table("application_choices").insert(first_choice_data).execute()

            if first_result.data:
                created_choices.append({
                    "priority": 1,
                    "course": first_course.get("name"),
                    "choice_id": first_result.data[0].get("id")
                })
            else:
                return "ERROR: Failed to create first choice record"

            # Generate student number for first choice institution
            try:
                gen_result = supabase.rpc(
                    "generate_institution_student_number",
                    {"p_institution_id": first_choice_institution_id, "p_applicant_id": applicant_id}
                ).execute()
                if gen_result.data:
                    student_numbers_generated.append(first_choice_institution_id)
            except Exception as gen_error:
                errors.append(f"Could not generate student number for first choice institution: {str(gen_error)}")

            # Create second choice if valid
            if second_choice_course_id and second_choice_institution_id:
                second_course = second_course_result.data if second_course_result else None
                if second_course and second_course.get("computed_status") not in ("closed", "coming_soon"):
                    second_choice_data = {
                        "application_id": application_id,
                        "course_id": second_choice_course_id,
                        "institution_id": second_choice_institution_id,
                        "priority": 2,
                        "status": "pending"
                    }
                    if second_choice_faculty_id:
                        second_choice_data["faculty_id"] = second_choice_faculty_id
                    if second_choice_campus_id:
                        second_choice_data["campus_id"] = second_choice_campus_id

                    second_result = supabase.table("application_choices").insert(second_choice_data).execute()

                    if second_result.data:
                        created_choices.append({
                            "priority": 2,
                            "course": second_course.get("name"),
                            "choice_id": second_result.data[0].get("id")
                        })

                        # Generate student number for second choice institution if different
                        if second_choice_institution_id != first_choice_institution_id:
                            try:
                                gen_result = supabase.rpc(
                                    "generate_institution_student_number",
                                    {"p_institution_id": second_choice_institution_id, "p_applicant_id": applicant_id}
                                ).execute()
                                if gen_result.data:
                                    student_numbers_generated.append(second_choice_institution_id)
                            except Exception as gen_error:
                                errors.append(f"Could not generate student number for second choice institution: {str(gen_error)}")
                    else:
                        errors.append("Failed to create second choice record")

            # Update application status to submitted
            supabase.table("applications").update({
                "status": "submitted"
            }).eq("id", application_id).execute()

            # Build response
            response = {
                "status": "SUCCESS",
                "application_id": application_id,
                "choices_created": len(created_choices),
                "choices": created_choices,
                "student_numbers_generated": len(student_numbers_generated)
            }

            if errors:
                response["warnings"] = errors

            return str(response)

        except Exception as e:
            error_msg = str(e)
            if "unique" in error_msg.lower() or "duplicate" in error_msg.lower():
                return "ERROR: Application choices already exist for this application"
            return f"ERROR: Failed to submit application - {error_msg}"

    return asyncio.run(async_logic())


@tool
def get_application_choices(application_id: str) -> str:
    """
    Get all course choices for an application with full details.

    Args:
        application_id: UUID of the application

    Returns:
        JSON string with all choices and their statuses
    """
    async def async_logic():
        if not supabase:
            return "ERROR: Supabase client not configured"

        try:
            # Use the RPC function for detailed choice summary
            result = supabase.rpc(
                "get_application_choices_summary",
                {"p_application_id": application_id}
            ).execute()

            if not result.data:
                # Fallback to direct query if RPC not available
                choices_result = supabase.table("application_choices").select(
                    "id, priority, status, status_reason, course_id, institution_id, reviewed_at"
                ).eq("application_id", application_id).order("priority").execute()

                if not choices_result.data:
                    return f"No choices found for application {application_id}"

                return str({
                    "application_id": application_id,
                    "choices": choices_result.data
                })

            return str({
                "application_id": application_id,
                "choices": result.data
            })

        except Exception as e:
            error_msg = str(e)
            if "function" in error_msg.lower() and "does not exist" in error_msg.lower():
                # Fallback if RPC doesn't exist
                try:
                    choices_result = supabase.table("application_choices").select(
                        "id, priority, status, status_reason, course_id, institution_id, reviewed_at"
                    ).eq("application_id", application_id).order("priority").execute()

                    if not choices_result.data:
                        return f"No choices found for application {application_id}"

                    return str({
                        "application_id": application_id,
                        "choices": choices_result.data
                    })
                except Exception as fallback_error:
                    return f"ERROR: Failed to get application choices - {str(fallback_error)}"
            return f"ERROR: Failed to get application choices - {error_msg}"

    return asyncio.run(async_logic())


@tool
def update_choice_status(
    choice_id: str,
    new_status: str,
    status_reason: Optional[str] = None
) -> str:
    """
    Update the status of an application choice.

    Valid statuses: pending, under_review, conditionally_accepted, accepted, rejected, waitlisted, withdrawn

    Args:
        choice_id: UUID of the application choice
        new_status: New status value
        status_reason: Optional reason for the status change

    Returns:
        Success message or error
    """
    async def async_logic():
        if not supabase:
            return "ERROR: Supabase client not configured"

        valid_statuses = [
            "pending", "under_review", "conditionally_accepted",
            "accepted", "rejected", "waitlisted", "withdrawn"
        ]

        if new_status not in valid_statuses:
            return f"ERROR: Invalid status. Must be one of: {', '.join(valid_statuses)}"

        try:
            update_data = {
                "status": new_status
            }

            if status_reason:
                update_data["status_reason"] = status_reason

            # Add review timestamp if status is a decision
            if new_status in ("accepted", "rejected", "conditionally_accepted", "waitlisted"):
                update_data["reviewed_at"] = "now()"

            result = supabase.table("application_choices").update(
                update_data
            ).eq("id", choice_id).execute()

            if not result.data:
                return f"ERROR: Choice {choice_id} not found or update failed"

            return f"SUCCESS: Choice status updated to '{new_status}'"

        except Exception as e:
            return f"ERROR: Failed to update choice status - {str(e)}"

    return asyncio.run(async_logic())
