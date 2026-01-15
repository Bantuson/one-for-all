"""
Comparative Analysis Tools

CrewAI tools for comparing applicants, generating summaries, and checking
eligibility against course requirements.
"""

import asyncio
import json
from datetime import datetime
from typing import Optional

from crewai.tools import tool

from .supabase_client import supabase


@tool
def compare_applicant(application_id: str, course_id: str) -> str:
    """
    Compare an applicant to similar accepted applicants for a course.

    This tool analyzes how an applicant's profile compares to previously
    accepted applicants for the same course, helping reviewers make
    informed decisions.

    Args:
        application_id: UUID of the application to compare
        course_id: UUID of the course

    Returns:
        JSON string with comparison data including:
        - applicant_profile: The applicant's key metrics
        - accepted_average: Average metrics of accepted applicants
        - percentile_ranking: Where this applicant falls
        - recommendation: Suggested action based on comparison

    Example:
        result = compare_applicant(
            application_id="123e4567-e89b-12d3-a456-426614174000",
            course_id="456e7890-e89b-12d3-a456-426614174001"
        )
    """

    async def async_compare():
        try:
            if not application_id:
                return "COMPARE_ERROR: application_id is required"
            if not course_id:
                return "COMPARE_ERROR: course_id is required"

            # Fetch the applicant's application
            app_result = (
                await supabase.table("applications")
                .select(
                    "id, academic_info, personal_info, status, "
                    "applicant:applicants(id, email, full_name)"
                )
                .eq("id", application_id)
                .single()
                .execute()
            )

            if not app_result.data:
                return f"COMPARE_ERROR: Application {application_id} not found"

            application = app_result.data
            academic_info = application.get("academic_info", {})
            applicant_aps = academic_info.get("total_aps", 0)
            applicant_subjects = academic_info.get("subjects", [])

            # Fetch accepted applications for this course for comparison
            # Using application_choices to find accepted applicants
            accepted_result = (
                await supabase.table("application_choices")
                .select(
                    "id, status, "
                    "application:applications(id, academic_info)"
                )
                .eq("course_id", course_id)
                .eq("status", "accepted")
                .limit(50)
                .execute()
            )

            accepted_apps = accepted_result.data or []

            # Calculate statistics from accepted applicants
            accepted_aps_scores = []
            for choice in accepted_apps:
                app_data = choice.get("application", {})
                if app_data:
                    acad = app_data.get("academic_info", {})
                    aps = acad.get("total_aps", 0)
                    if aps and isinstance(aps, (int, float)):
                        accepted_aps_scores.append(aps)

            if accepted_aps_scores:
                avg_aps = sum(accepted_aps_scores) / len(accepted_aps_scores)
                min_aps = min(accepted_aps_scores)
                max_aps = max(accepted_aps_scores)

                # Calculate percentile
                below_count = sum(1 for s in accepted_aps_scores if s < applicant_aps)
                percentile = round((below_count / len(accepted_aps_scores)) * 100, 1)
            else:
                avg_aps = 0
                min_aps = 0
                max_aps = 0
                percentile = 50  # Default to middle if no data

            # Generate recommendation
            if percentile >= 75:
                recommendation = "STRONG_CANDIDATE"
                recommendation_text = "Applicant's profile is above average compared to accepted students."
            elif percentile >= 50:
                recommendation = "GOOD_CANDIDATE"
                recommendation_text = "Applicant's profile is comparable to accepted students."
            elif percentile >= 25:
                recommendation = "BORDERLINE"
                recommendation_text = "Applicant's profile is below average. Consider reviewing carefully."
            else:
                recommendation = "UNLIKELY"
                recommendation_text = "Applicant's profile is significantly below accepted students."

            return json.dumps({
                "application_id": application_id,
                "course_id": course_id,
                "applicant_profile": {
                    "name": application.get("applicant", {}).get("full_name", "Unknown"),
                    "aps_score": applicant_aps,
                    "subject_count": len(applicant_subjects),
                    "current_status": application.get("status", "unknown"),
                },
                "comparison_data": {
                    "sample_size": len(accepted_aps_scores),
                    "accepted_average_aps": round(avg_aps, 1),
                    "accepted_min_aps": min_aps,
                    "accepted_max_aps": max_aps,
                },
                "percentile_ranking": percentile,
                "recommendation": {
                    "status": recommendation,
                    "explanation": recommendation_text,
                },
            })

        except Exception as e:
            return f"COMPARE_ERROR: {str(e)}"

    return asyncio.run(async_compare())


@tool
def get_application_summary(application_id: str) -> str:
    """
    Generate a comprehensive summary of an application.

    This tool creates a structured summary of all application data,
    documents, choices, and notes to help reviewers quickly understand
    the application status.

    Args:
        application_id: UUID of the application

    Returns:
        JSON string with complete application summary including:
        - applicant_info: Personal and contact details
        - academic_info: Grades, APS, subjects
        - course_choices: Selected courses and their status
        - documents: Document status and any flags
        - notes: Reviewer notes history
        - timeline: Key dates and events

    Example:
        result = get_application_summary(
            application_id="123e4567-e89b-12d3-a456-426614174000"
        )
    """

    async def async_get_summary():
        try:
            if not application_id:
                return "SUMMARY_ERROR: application_id is required"

            # Fetch complete application data
            app_result = (
                await supabase.table("applications")
                .select(
                    "id, status, personal_info, academic_info, created_at, updated_at, "
                    "applicant:applicants(id, email, full_name, phone), "
                    "institution:institutions(id, name, slug)"
                )
                .eq("id", application_id)
                .single()
                .execute()
            )

            if not app_result.data:
                return f"SUMMARY_ERROR: Application {application_id} not found"

            application = app_result.data

            # Fetch course choices
            choices_result = (
                await supabase.table("application_choices")
                .select(
                    "id, priority, status, "
                    "course:courses(id, name, code, faculty:faculties(name))"
                )
                .eq("application_id", application_id)
                .order("priority")
                .execute()
            )

            choices = choices_result.data or []

            # Fetch documents
            docs_result = (
                await supabase.table("application_documents")
                .select(
                    "id, document_type, file_name, review_status, "
                    "flag_reason, uploaded_at"
                )
                .eq("application_id", application_id)
                .execute()
            )

            documents = docs_result.data or []

            # Fetch notes
            notes_result = (
                await supabase.table("application_notes")
                .select("id, content, created_at, created_by")
                .eq("application_id", application_id)
                .order("created_at", desc=True)
                .limit(10)
                .execute()
            )

            notes = notes_result.data or []

            # Build summary
            personal = application.get("personal_info", {})
            academic = application.get("academic_info", {})
            applicant = application.get("applicant", {})

            # Document status summary
            doc_pending = sum(1 for d in documents if d.get("review_status") == "pending")
            doc_approved = sum(1 for d in documents if d.get("review_status") == "approved")
            doc_flagged = sum(1 for d in documents if d.get("review_status") == "flagged")

            # Format choices
            formatted_choices = []
            for choice in choices:
                course = choice.get("course", {})
                faculty = course.get("faculty", {}) if course else {}
                formatted_choices.append({
                    "priority": choice.get("priority"),
                    "course_name": course.get("name", "Unknown") if course else "Unknown",
                    "course_code": course.get("code", "") if course else "",
                    "faculty": faculty.get("name", "Unknown") if faculty else "Unknown",
                    "status": choice.get("status", "pending"),
                })

            summary = {
                "application_id": application_id,
                "overall_status": application.get("status", "unknown"),
                "institution": application.get("institution", {}).get("name", "Unknown"),
                "applicant_info": {
                    "name": applicant.get("full_name", personal.get("full_name", "Unknown")),
                    "email": applicant.get("email", personal.get("email", "")),
                    "phone": applicant.get("phone", personal.get("phone", "")),
                    "id_number": personal.get("id_number", "Not provided"),
                },
                "academic_info": {
                    "total_aps": academic.get("total_aps", "Not calculated"),
                    "matric_year": academic.get("matric_year", "Unknown"),
                    "subject_count": len(academic.get("subjects", [])),
                    "highlights": academic.get("highlights", []),
                },
                "course_choices": formatted_choices,
                "documents": {
                    "total": len(documents),
                    "pending_review": doc_pending,
                    "approved": doc_approved,
                    "flagged": doc_flagged,
                    "flagged_details": [
                        {
                            "type": d.get("document_type"),
                            "reason": d.get("flag_reason"),
                        }
                        for d in documents
                        if d.get("review_status") == "flagged"
                    ],
                },
                "notes_count": len(notes),
                "recent_notes": [
                    {
                        "content": n.get("content", "")[:200],
                        "date": n.get("created_at"),
                    }
                    for n in notes[:3]
                ],
                "timeline": {
                    "created": application.get("created_at"),
                    "last_updated": application.get("updated_at"),
                },
            }

            return json.dumps(summary)

        except Exception as e:
            return f"SUMMARY_ERROR: {str(e)}"

    return asyncio.run(async_get_summary())


@tool
def check_eligibility(application_id: str, course_id: str) -> str:
    """
    Check if an applicant meets eligibility requirements for a course.

    This tool performs a detailed eligibility check comparing the
    applicant's academic profile against course requirements.

    Args:
        application_id: UUID of the application
        course_id: UUID of the course to check eligibility for

    Returns:
        JSON string with eligibility assessment including:
        - eligible: Boolean overall eligibility
        - aps_check: APS score comparison
        - subject_checks: Required subject verification
        - missing_requirements: List of unmet requirements
        - conditional_factors: Factors that could enable conditional acceptance

    Example:
        result = check_eligibility(
            application_id="123e4567-e89b-12d3-a456-426614174000",
            course_id="456e7890-e89b-12d3-a456-426614174001"
        )
    """

    async def async_check_eligibility():
        try:
            if not application_id:
                return "ELIGIBILITY_ERROR: application_id is required"
            if not course_id:
                return "ELIGIBILITY_ERROR: course_id is required"

            # Fetch application academic info
            app_result = (
                await supabase.table("applications")
                .select("id, academic_info, personal_info")
                .eq("id", application_id)
                .single()
                .execute()
            )

            if not app_result.data:
                return f"ELIGIBILITY_ERROR: Application {application_id} not found"

            # Fetch course requirements
            course_result = (
                await supabase.table("courses")
                .select("id, name, code, requirements")
                .eq("id", course_id)
                .single()
                .execute()
            )

            if not course_result.data:
                return f"ELIGIBILITY_ERROR: Course {course_id} not found"

            application = app_result.data
            course = course_result.data
            academic = application.get("academic_info", {})
            requirements = course.get("requirements", {})

            # Extract values
            applicant_aps = academic.get("total_aps", 0)
            applicant_subjects = {
                s.get("name", "").lower(): s
                for s in academic.get("subjects", [])
            }

            min_aps = requirements.get("min_aps", 0)
            required_subjects = requirements.get("required_subjects", [])
            minimum_levels = requirements.get("minimum_levels", {})

            # Perform checks
            issues = []
            conditional_factors = []

            # APS Check
            aps_passed = True
            aps_margin = 0
            if isinstance(applicant_aps, (int, float)) and isinstance(min_aps, (int, float)):
                aps_margin = applicant_aps - min_aps
                if applicant_aps < min_aps:
                    aps_passed = False
                    issues.append(f"APS score ({applicant_aps}) below minimum ({min_aps})")
                    if aps_margin >= -3:
                        conditional_factors.append(
                            "APS within 3 points of minimum - may qualify for conditional acceptance"
                        )

            # Subject checks
            subject_checks = []
            subjects_passed = True

            for req_subject in required_subjects:
                subject_name = req_subject if isinstance(req_subject, str) else req_subject.get("name", "")
                subject_lower = subject_name.lower()

                found = subject_lower in applicant_subjects
                level_met = True

                if found:
                    student_subject = applicant_subjects[subject_lower]
                    student_level = student_subject.get("level", 0)
                    required_level = minimum_levels.get(subject_lower, 0)

                    if required_level and student_level < required_level:
                        level_met = False
                        issues.append(
                            f"{subject_name}: Level {student_level} below required {required_level}"
                        )
                        subjects_passed = False

                    subject_checks.append({
                        "subject": subject_name,
                        "found": True,
                        "level": student_level,
                        "required_level": required_level,
                        "passed": level_met,
                    })
                else:
                    subjects_passed = False
                    issues.append(f"Required subject missing: {subject_name}")
                    subject_checks.append({
                        "subject": subject_name,
                        "found": False,
                        "level": None,
                        "required_level": minimum_levels.get(subject_lower, 0),
                        "passed": False,
                    })

            # Check for Maths vs Maths Literacy issue
            if "mathematics" in [s.lower() for s in required_subjects]:
                if "maths literacy" in applicant_subjects and "mathematics" not in applicant_subjects:
                    issues.append(
                        "CRITICAL: Programme requires Mathematics, but applicant has Maths Literacy"
                    )
                    subjects_passed = False

            # Overall eligibility
            is_eligible = aps_passed and subjects_passed

            # Determine conditional eligibility
            conditional_eligible = False
            if not is_eligible and len(issues) <= 2 and len(conditional_factors) > 0:
                conditional_eligible = True

            return json.dumps({
                "application_id": application_id,
                "course_id": course_id,
                "course_name": course.get("name"),
                "course_code": course.get("code"),
                "eligibility": {
                    "eligible": is_eligible,
                    "conditional_eligible": conditional_eligible,
                },
                "aps_check": {
                    "applicant_aps": applicant_aps,
                    "required_aps": min_aps,
                    "margin": aps_margin,
                    "passed": aps_passed,
                },
                "subject_checks": subject_checks,
                "issues": issues,
                "conditional_factors": conditional_factors,
                "recommendation": (
                    "ACCEPT" if is_eligible
                    else "CONDITIONAL" if conditional_eligible
                    else "REJECT"
                ),
            })

        except Exception as e:
            return f"ELIGIBILITY_ERROR: {str(e)}"

    return asyncio.run(async_check_eligibility())


@tool
def get_missing_documents(application_id: str) -> str:
    """
    Identify missing or flagged documents for an application.

    This tool checks which required documents are missing or need
    attention, helping reviewers quickly identify documentation gaps.

    Args:
        application_id: UUID of the application

    Returns:
        JSON string with document status including:
        - required_documents: List of required document types
        - uploaded: Documents that have been uploaded
        - missing: Documents that are required but not uploaded
        - flagged: Documents that need resubmission
        - complete: Boolean indicating all documents are approved

    Example:
        result = get_missing_documents(
            application_id="123e4567-e89b-12d3-a456-426614174000"
        )
    """

    async def async_get_missing():
        try:
            if not application_id:
                return "DOCS_ERROR: application_id is required"

            # Standard required documents for SA university applications
            required_document_types = [
                "id_document",
                "matric_certificate",
                "proof_of_residence",
            ]

            # Fetch uploaded documents
            docs_result = (
                await supabase.table("application_documents")
                .select(
                    "id, document_type, file_name, review_status, "
                    "flag_reason, uploaded_at"
                )
                .eq("application_id", application_id)
                .execute()
            )

            documents = docs_result.data or []

            # Build status map
            uploaded_types = {}
            for doc in documents:
                doc_type = doc.get("document_type")
                if doc_type:
                    if doc_type not in uploaded_types:
                        uploaded_types[doc_type] = []
                    uploaded_types[doc_type].append({
                        "id": doc.get("id"),
                        "file_name": doc.get("file_name"),
                        "status": doc.get("review_status", "pending"),
                        "flag_reason": doc.get("flag_reason"),
                        "uploaded_at": doc.get("uploaded_at"),
                    })

            # Identify missing and flagged
            missing = []
            flagged = []
            uploaded = []
            approved = []

            for req_type in required_document_types:
                if req_type in uploaded_types:
                    docs = uploaded_types[req_type]
                    for d in docs:
                        uploaded.append({
                            "type": req_type,
                            "status": d["status"],
                            "file_name": d["file_name"],
                        })
                        if d["status"] == "flagged":
                            flagged.append({
                                "type": req_type,
                                "reason": d["flag_reason"],
                                "file_name": d["file_name"],
                            })
                        elif d["status"] == "approved":
                            approved.append(req_type)
                else:
                    missing.append(req_type)

            # Check if complete
            all_complete = (
                len(missing) == 0 and
                len(flagged) == 0 and
                len(approved) == len(required_document_types)
            )

            return json.dumps({
                "application_id": application_id,
                "required_documents": required_document_types,
                "uploaded": uploaded,
                "missing": missing,
                "flagged": flagged,
                "approved": approved,
                "complete": all_complete,
                "summary": {
                    "total_required": len(required_document_types),
                    "total_uploaded": len(uploaded),
                    "total_missing": len(missing),
                    "total_flagged": len(flagged),
                    "total_approved": len(approved),
                },
            })

        except Exception as e:
            return f"DOCS_ERROR: {str(e)}"

    return asyncio.run(async_get_missing())
