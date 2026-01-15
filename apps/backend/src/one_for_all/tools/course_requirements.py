"""
Course Requirements Tool for South African University Admissions

This module provides tools for fetching and checking course admission requirements,
including minimum APS scores and subject-specific requirements.
"""

import json
import asyncio
from typing import Optional, List, Dict, Any
from crewai.tools import tool

from one_for_all.tools.supabase_client import get_supabase_client
from one_for_all.tools.aps_calculator import get_nsc_points, is_life_orientation


@tool
def get_course_requirements(course_id: str) -> str:
    """
    Fetch minimum admission requirements for a specific course.

    Retrieves the course requirements from the database including:
    - Minimum APS score
    - Required subjects with minimum levels
    - Recommended subjects
    - Any additional requirements

    Args:
        course_id: The unique identifier of the course

    Returns:
        JSON string containing course requirements or error.
    """
    async def async_logic():
        try:
            supabase = get_supabase_client()
            if not supabase:
                return json.dumps({
                    "success": False,
                    "error": "Supabase client not configured"
                })

            # Fetch course with requirements
            result = await supabase.table("courses").select(
                "id, name, code, qualification_type, "
                "min_aps_score, subject_requirements, "
                "faculty_id, institution_id, description"
            ).eq("id", course_id).single().execute()

            if not result.data:
                return json.dumps({
                    "success": False,
                    "error": f"Course not found with ID: {course_id}"
                })

            course = result.data

            # Parse subject requirements if stored as JSON string
            subject_reqs = course.get("subject_requirements")
            if isinstance(subject_reqs, str):
                try:
                    subject_reqs = json.loads(subject_reqs)
                except json.JSONDecodeError:
                    subject_reqs = []

            return json.dumps({
                "success": True,
                "course_id": course.get("id"),
                "course_name": course.get("name"),
                "course_code": course.get("code"),
                "qualification_type": course.get("qualification_type"),
                "min_aps_score": course.get("min_aps_score"),
                "subject_requirements": subject_reqs or [],
                "description": course.get("description"),
                "faculty_id": course.get("faculty_id"),
                "institution_id": course.get("institution_id")
            }, indent=2)

        except Exception as e:
            return json.dumps({
                "success": False,
                "error": f"Failed to fetch course requirements: {str(e)}"
            })

    return asyncio.run(async_logic())


@tool
def check_subject_requirements(academic_info: str, requirements: str) -> str:
    """
    Verify if an applicant meets subject-specific requirements.

    Checks each required subject against the applicant's results to determine
    if they meet the minimum level/percentage requirements.

    Args:
        academic_info: JSON string with applicant's subjects.
            Format: {"subjects": [{"name": "Mathematics", "percentage": 75}, ...]}
        requirements: JSON string with course subject requirements.
            Format: {"subject_requirements": [{"subject": "Mathematics", "min_level": 5}, ...]}

    Returns:
        JSON string with eligibility results per subject.
    """
    try:
        # Parse inputs
        academic_data = json.loads(academic_info)
        req_data = json.loads(requirements)

        applicant_subjects = academic_data.get("subjects", [])
        subject_requirements = req_data.get("subject_requirements", [])

        if not subject_requirements:
            return json.dumps({
                "success": True,
                "meets_all_requirements": True,
                "results": [],
                "message": "No specific subject requirements for this course"
            })

        # Build lookup of applicant's subjects (normalized names)
        applicant_lookup: Dict[str, Dict[str, Any]] = {}
        for subj in applicant_subjects:
            name = subj.get("name", "").lower().strip()
            percentage = subj.get("percentage", 0)
            if isinstance(percentage, str):
                percentage = int(float(percentage))
            points = get_nsc_points(percentage)

            applicant_lookup[name] = {
                "name": subj.get("name"),
                "percentage": percentage,
                "level": points
            }

        # Check each requirement
        results = []
        all_met = True

        for req in subject_requirements:
            required_subject = req.get("subject", "").lower().strip()
            min_level = req.get("min_level", 4)  # Default level 4 (50%)
            min_percentage = req.get("min_percentage")  # Optional
            is_mandatory = req.get("mandatory", True)

            # Handle alternative subjects (e.g., "Mathematics or Mathematical Literacy")
            alternatives = req.get("alternatives", [])
            alternatives = [alt.lower().strip() for alt in alternatives]

            # Check main subject or alternatives
            found_subject = None
            for subj_name in [required_subject] + alternatives:
                if subj_name in applicant_lookup:
                    found_subject = applicant_lookup[subj_name]
                    break

            if found_subject:
                # Check if level/percentage requirement is met
                meets_level = found_subject["level"] >= min_level
                meets_percentage = True
                if min_percentage:
                    meets_percentage = found_subject["percentage"] >= min_percentage

                is_met = meets_level and meets_percentage

                results.append({
                    "required_subject": req.get("subject"),
                    "applicant_subject": found_subject["name"],
                    "required_level": min_level,
                    "applicant_level": found_subject["level"],
                    "applicant_percentage": found_subject["percentage"],
                    "min_percentage": min_percentage,
                    "mandatory": is_mandatory,
                    "met": is_met,
                    "reason": "Meets requirement" if is_met else f"Level {found_subject['level']} below required {min_level}"
                })

                if not is_met and is_mandatory:
                    all_met = False
            else:
                # Subject not found
                results.append({
                    "required_subject": req.get("subject"),
                    "applicant_subject": None,
                    "required_level": min_level,
                    "applicant_level": None,
                    "mandatory": is_mandatory,
                    "met": False,
                    "reason": f"Required subject '{req.get('subject')}' not found in applicant's results"
                })

                if is_mandatory:
                    all_met = False

        # Summary
        mandatory_met = [r for r in results if r.get("mandatory") and r.get("met")]
        mandatory_failed = [r for r in results if r.get("mandatory") and not r.get("met")]

        return json.dumps({
            "success": True,
            "meets_all_requirements": all_met,
            "results": results,
            "summary": {
                "total_requirements": len(results),
                "mandatory_met": len(mandatory_met),
                "mandatory_failed": len(mandatory_failed),
                "failed_subjects": [r["required_subject"] for r in mandatory_failed]
            }
        }, indent=2)

    except json.JSONDecodeError as e:
        return json.dumps({
            "success": False,
            "error": f"Invalid JSON input: {str(e)}"
        })
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": f"Failed to check subject requirements: {str(e)}"
        })


@tool
def compare_to_cutoff(aps: int, course_id: str) -> str:
    """
    Compare an applicant's APS score to the course minimum cutoff.

    Retrieves the course's minimum APS requirement and compares it
    to the applicant's calculated APS score.

    Args:
        aps: The applicant's calculated APS score
        course_id: The unique identifier of the course

    Returns:
        JSON string with comparison result and eligibility status.
    """
    async def async_logic():
        try:
            supabase = get_supabase_client()
            if not supabase:
                return json.dumps({
                    "success": False,
                    "error": "Supabase client not configured"
                })

            # Fetch course minimum APS
            result = await supabase.table("courses").select(
                "id, name, min_aps_score"
            ).eq("id", course_id).single().execute()

            if not result.data:
                return json.dumps({
                    "success": False,
                    "error": f"Course not found with ID: {course_id}"
                })

            course = result.data
            min_aps = course.get("min_aps_score")

            if min_aps is None:
                return json.dumps({
                    "success": True,
                    "course_id": course_id,
                    "course_name": course.get("name"),
                    "applicant_aps": aps,
                    "min_aps_required": None,
                    "meets_cutoff": True,
                    "difference": None,
                    "message": "No minimum APS requirement specified for this course"
                })

            meets_cutoff = aps >= min_aps
            difference = aps - min_aps

            # Determine eligibility status
            if difference >= 5:
                status = "highly_eligible"
                message = f"APS {aps} exceeds minimum {min_aps} by {difference} points - Strong candidate"
            elif difference >= 0:
                status = "eligible"
                message = f"APS {aps} meets minimum {min_aps} - Meets requirement"
            elif difference >= -3:
                status = "borderline"
                message = f"APS {aps} is {abs(difference)} points below minimum {min_aps} - May be considered"
            else:
                status = "ineligible"
                message = f"APS {aps} is {abs(difference)} points below minimum {min_aps} - Does not meet requirement"

            return json.dumps({
                "success": True,
                "course_id": course_id,
                "course_name": course.get("name"),
                "applicant_aps": aps,
                "min_aps_required": min_aps,
                "meets_cutoff": meets_cutoff,
                "difference": difference,
                "eligibility_status": status,
                "message": message
            }, indent=2)

        except Exception as e:
            return json.dumps({
                "success": False,
                "error": f"Failed to compare APS to cutoff: {str(e)}"
            })

    return asyncio.run(async_logic())


@tool
def get_eligible_courses(aps: int, institution_id: str) -> str:
    """
    Get all courses at an institution the applicant is eligible for based on APS.

    Filters courses where the applicant's APS meets or exceeds the minimum requirement.

    Args:
        aps: The applicant's calculated APS score
        institution_id: The institution to search courses in

    Returns:
        JSON string with list of eligible courses.
    """
    async def async_logic():
        try:
            supabase = get_supabase_client()
            if not supabase:
                return json.dumps({
                    "success": False,
                    "error": "Supabase client not configured"
                })

            # Fetch all courses for institution where APS meets or exceeds minimum
            result = await supabase.table("courses").select(
                "id, name, code, min_aps_score, qualification_type, faculty_id"
            ).eq(
                "institution_id", institution_id
            ).or_(
                f"min_aps_score.lte.{aps},min_aps_score.is.null"
            ).order("min_aps_score", desc=True).execute()

            courses = result.data or []

            # Group by eligibility level
            highly_eligible = []
            eligible = []
            no_requirement = []

            for course in courses:
                min_aps = course.get("min_aps_score")
                if min_aps is None:
                    no_requirement.append(course)
                elif aps >= min_aps + 5:
                    highly_eligible.append(course)
                else:
                    eligible.append(course)

            return json.dumps({
                "success": True,
                "applicant_aps": aps,
                "institution_id": institution_id,
                "total_eligible_courses": len(courses),
                "highly_eligible": highly_eligible,
                "eligible": eligible,
                "no_aps_requirement": no_requirement,
                "summary": {
                    "highly_eligible_count": len(highly_eligible),
                    "eligible_count": len(eligible),
                    "no_requirement_count": len(no_requirement)
                }
            }, indent=2)

        except Exception as e:
            return json.dumps({
                "success": False,
                "error": f"Failed to get eligible courses: {str(e)}"
            })

    return asyncio.run(async_logic())


@tool
def check_full_eligibility(academic_info: str, course_id: str) -> str:
    """
    Perform complete eligibility check for a course.

    Combines APS calculation, subject requirements check, and cutoff comparison
    into a single comprehensive eligibility assessment.

    Args:
        academic_info: JSON string with applicant's subjects.
            Format: {"subjects": [{"name": "Mathematics", "percentage": 75}, ...]}
        course_id: The unique identifier of the course

    Returns:
        JSON string with comprehensive eligibility result.
    """
    async def async_logic():
        try:
            supabase = get_supabase_client()
            if not supabase:
                return json.dumps({
                    "success": False,
                    "error": "Supabase client not configured"
                })

            # Parse academic info
            academic_data = json.loads(academic_info)
            subjects = academic_data.get("subjects", [])

            if not subjects:
                return json.dumps({
                    "success": False,
                    "error": "No subjects provided in academic_info"
                })

            # Import calculate_aps function locally to avoid circular import issues
            from one_for_all.tools.aps_calculator import calculate_aps

            # Calculate APS
            aps_result_str = calculate_aps._run(academic_info)
            aps_result = json.loads(aps_result_str)

            if not aps_result.get("success"):
                return json.dumps({
                    "success": False,
                    "error": f"APS calculation failed: {aps_result.get('error')}"
                })

            total_aps = aps_result.get("total_aps")

            # Fetch course requirements
            course_result = await supabase.table("courses").select(
                "id, name, code, min_aps_score, subject_requirements, "
                "qualification_type, faculty_id, institution_id"
            ).eq("id", course_id).single().execute()

            if not course_result.data:
                return json.dumps({
                    "success": False,
                    "error": f"Course not found with ID: {course_id}"
                })

            course = course_result.data

            # Check APS cutoff
            min_aps = course.get("min_aps_score")
            aps_eligible = True
            aps_difference = None
            aps_message = "No minimum APS requirement"

            if min_aps is not None:
                aps_eligible = total_aps >= min_aps
                aps_difference = total_aps - min_aps
                if aps_eligible:
                    aps_message = f"APS {total_aps} meets minimum {min_aps}"
                else:
                    aps_message = f"APS {total_aps} below minimum {min_aps}"

            # Check subject requirements
            subject_reqs = course.get("subject_requirements")
            if isinstance(subject_reqs, str):
                try:
                    subject_reqs = json.loads(subject_reqs)
                except json.JSONDecodeError:
                    subject_reqs = []

            subjects_eligible = True
            subject_results = []
            failed_subjects = []

            if subject_reqs:
                req_check_str = check_subject_requirements._run(
                    academic_info,
                    json.dumps({"subject_requirements": subject_reqs})
                )
                req_check = json.loads(req_check_str)

                if req_check.get("success"):
                    subjects_eligible = req_check.get("meets_all_requirements", True)
                    subject_results = req_check.get("results", [])
                    failed_subjects = req_check.get("summary", {}).get("failed_subjects", [])

            # Overall eligibility
            is_eligible = aps_eligible and subjects_eligible

            # Determine status
            if is_eligible:
                if aps_difference and aps_difference >= 5:
                    status = "highly_eligible"
                else:
                    status = "eligible"
            elif aps_eligible and not subjects_eligible:
                status = "ineligible_subjects"
            elif not aps_eligible and subjects_eligible:
                if aps_difference and aps_difference >= -3:
                    status = "borderline_aps"
                else:
                    status = "ineligible_aps"
            else:
                status = "ineligible"

            return json.dumps({
                "success": True,
                "course_id": course_id,
                "course_name": course.get("name"),
                "course_code": course.get("code"),
                "is_eligible": is_eligible,
                "eligibility_status": status,
                "aps_assessment": {
                    "applicant_aps": total_aps,
                    "min_required": min_aps,
                    "meets_requirement": aps_eligible,
                    "difference": aps_difference,
                    "message": aps_message
                },
                "subject_assessment": {
                    "meets_all_requirements": subjects_eligible,
                    "results": subject_results,
                    "failed_subjects": failed_subjects
                },
                "aps_breakdown": {
                    "best_six_total": aps_result.get("best_six_total"),
                    "lo_contribution": aps_result.get("lo_contribution"),
                    "subjects_counted": aps_result.get("subjects_counted")
                },
                "recommendation": _get_recommendation(status, course.get("name"), aps_difference, failed_subjects)
            }, indent=2)

        except json.JSONDecodeError as e:
            return json.dumps({
                "success": False,
                "error": f"Invalid JSON input: {str(e)}"
            })
        except Exception as e:
            return json.dumps({
                "success": False,
                "error": f"Full eligibility check failed: {str(e)}"
            })

    return asyncio.run(async_logic())


def _get_recommendation(status: str, course_name: str, aps_diff: Optional[int], failed_subjects: List[str]) -> str:
    """Generate a recommendation based on eligibility status."""
    if status == "highly_eligible":
        return f"Strong candidate for {course_name}. Consider applying with confidence."
    elif status == "eligible":
        return f"Meets requirements for {course_name}. Application recommended."
    elif status == "borderline_aps":
        return f"APS is slightly below requirement. Consider applying but have backup options."
    elif status == "ineligible_subjects":
        subjects = ", ".join(failed_subjects)
        return f"Does not meet subject requirements ({subjects}). Consider alternative programmes."
    elif status == "ineligible_aps":
        return f"APS significantly below requirement. Recommend considering alternative courses."
    else:
        return f"Does not meet requirements. Recommend exploring other programmes."
