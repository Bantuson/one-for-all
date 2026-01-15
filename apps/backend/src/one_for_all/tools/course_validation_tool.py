"""
Course Validation Tool

CrewAI tool for validating course availability before application submission.

This module provides tools for:
- Checking if a course is open for applications
- Getting course opening/closing dates
- Validating multiple courses for batch submissions
"""

import asyncio
from typing import Optional

from crewai.tools import tool

from .supabase_client import supabase


@tool
def validate_course_for_submission(course_id: str) -> str:
    """
    Check if a course is open for applications before submission.

    Validates the course's computed_status based on opening/closing dates.
    This should be called before creating an application to ensure the
    course is accepting applications.

    Args:
        course_id: UUID of the course to validate

    Returns:
        OK if course is accepting applications, ERROR message if closed or coming soon
    """
    async def async_logic():
        if not supabase:
            return "ERROR: Supabase client not configured"

        try:
            result = supabase.table("courses").select(
                "id, name, code, computed_status, opening_date, closing_date"
            ).eq("id", course_id).single().execute()

            if not result.data:
                return f"ERROR: Course {course_id} not found"

            course = result.data
            status = course.get("computed_status")
            name = course.get("name", "Unknown")
            code = course.get("code", "")

            if status == "closed":
                closing_date = course.get("closing_date", "unknown date")
                return f"ERROR: Applications for '{name}' ({code}) are closed. Applications closed on {closing_date}."

            if status == "coming_soon":
                opening_date = course.get("opening_date", "unknown date")
                return f"ERROR: Applications for '{name}' ({code}) are not yet open. Applications open on {opening_date}."

            # status is 'open' or NULL (no dates set - assume open)
            return f"OK: Course '{name}' ({code}) is accepting applications"

        except Exception as e:
            error_msg = str(e)
            if "No rows" in error_msg or "0 rows" in error_msg:
                return f"ERROR: Course {course_id} not found"
            return f"ERROR: Failed to validate course - {error_msg}"

    return asyncio.run(async_logic())


@tool
def get_course_application_dates(course_id: str) -> str:
    """
    Get the opening and closing dates for a course's applications.

    Args:
        course_id: UUID of the course

    Returns:
        Course application dates and current status
    """
    async def async_logic():
        if not supabase:
            return "ERROR: Supabase client not configured"

        try:
            result = supabase.table("courses").select(
                "id, name, code, computed_status, opening_date, closing_date"
            ).eq("id", course_id).single().execute()

            if not result.data:
                return f"ERROR: Course {course_id} not found"

            course = result.data
            name = course.get("name", "Unknown")
            code = course.get("code", "")
            status = course.get("computed_status", "unknown")
            opening = course.get("opening_date")
            closing = course.get("closing_date")

            return str({
                "course_id": course_id,
                "name": name,
                "code": code,
                "status": status or "open (no dates set)",
                "opening_date": opening or "not set",
                "closing_date": closing or "not set"
            })

        except Exception as e:
            error_msg = str(e)
            if "No rows" in error_msg or "0 rows" in error_msg:
                return f"ERROR: Course {course_id} not found"
            return f"ERROR: Failed to get course dates - {error_msg}"

    return asyncio.run(async_logic())


@tool
def validate_courses_batch(course_ids: str) -> str:
    """
    Validate multiple courses for submission in a single call.

    Args:
        course_ids: Comma-separated list of course UUIDs to validate

    Returns:
        JSON string with validation results for each course
    """
    async def async_logic():
        if not supabase:
            return "ERROR: Supabase client not configured"

        try:
            # Parse comma-separated course IDs
            ids = [cid.strip() for cid in course_ids.split(",") if cid.strip()]

            if not ids:
                return "ERROR: No course IDs provided"

            # Fetch all courses in one query
            result = supabase.table("courses").select(
                "id, name, code, computed_status, opening_date, closing_date"
            ).in_("id", ids).execute()

            if not result.data:
                return "ERROR: No courses found for the provided IDs"

            results = []
            found_ids = set()

            for course in result.data:
                course_id = course.get("id")
                found_ids.add(course_id)
                name = course.get("name", "Unknown")
                code = course.get("code", "")
                status = course.get("computed_status")

                if status == "closed":
                    results.append({
                        "course_id": course_id,
                        "name": name,
                        "code": code,
                        "valid": False,
                        "reason": f"Applications closed on {course.get('closing_date')}"
                    })
                elif status == "coming_soon":
                    results.append({
                        "course_id": course_id,
                        "name": name,
                        "code": code,
                        "valid": False,
                        "reason": f"Applications open on {course.get('opening_date')}"
                    })
                else:
                    results.append({
                        "course_id": course_id,
                        "name": name,
                        "code": code,
                        "valid": True,
                        "reason": "Accepting applications"
                    })

            # Check for missing courses
            for cid in ids:
                if cid not in found_ids:
                    results.append({
                        "course_id": cid,
                        "name": "Unknown",
                        "code": "",
                        "valid": False,
                        "reason": "Course not found"
                    })

            # Summary
            valid_count = sum(1 for r in results if r.get("valid"))
            invalid_count = len(results) - valid_count

            return str({
                "total": len(results),
                "valid": valid_count,
                "invalid": invalid_count,
                "all_valid": invalid_count == 0,
                "courses": results
            })

        except Exception as e:
            return f"ERROR: Failed to validate courses - {str(e)}"

    return asyncio.run(async_logic())


@tool
def list_open_courses(institution_id: Optional[str] = None) -> str:
    """
    List courses that are currently open for applications.

    Args:
        institution_id: Optional UUID to filter courses by institution

    Returns:
        List of open courses with their details
    """
    async def async_logic():
        if not supabase:
            return "ERROR: Supabase client not configured"

        try:
            query = supabase.table("courses").select(
                "id, name, code, computed_status, opening_date, closing_date, institution_id"
            )

            # Filter by status (open or NULL)
            # We need to handle NULL computed_status as "open"
            if institution_id:
                query = query.eq("institution_id", institution_id)

            result = query.execute()

            if not result.data:
                return "No courses found"

            # Filter to only open courses (status = 'open' or status is NULL)
            open_courses = [
                {
                    "course_id": c.get("id"),
                    "name": c.get("name"),
                    "code": c.get("code"),
                    "closing_date": c.get("closing_date") or "not set"
                }
                for c in result.data
                if c.get("computed_status") in ("open", None)
            ]

            if not open_courses:
                return "No courses currently accepting applications"

            return str({
                "count": len(open_courses),
                "courses": open_courses
            })

        except Exception as e:
            return f"ERROR: Failed to list open courses - {str(e)}"

    return asyncio.run(async_logic())
