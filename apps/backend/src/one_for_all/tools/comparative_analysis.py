"""
Comparative Analysis Tools

CrewAI tools for comparing applicants, generating summaries, and checking
eligibility against course requirements.

Performance Optimized: Uses materialized view for rankings with in-memory caching.
"""

import asyncio
import json
import os
import time
from datetime import datetime
from typing import Any, Optional

from crewai.tools import tool

from .supabase_client import supabase
from ..utils.db_audit import audit_service_role_access

# =============================================================================
# FEATURE FLAGS AND CONFIGURATION
# =============================================================================

# Feature flag: Use materialized view for rankings (vs N+1 queries)
USE_MATERIALIZED_RANKINGS = os.getenv("USE_MATERIALIZED_RANKINGS", "true").lower() == "true"

# Refresh interval: How old can the view be before triggering refresh (seconds)
RANKINGS_REFRESH_INTERVAL = int(os.getenv("RANKINGS_REFRESH_INTERVAL", "900"))  # 15 minutes

# Cache TTL: How long to cache view results in memory (seconds)
RANKINGS_CACHE_TTL = int(os.getenv("RANKINGS_CACHE_TTL", "30"))

# =============================================================================
# IN-MEMORY CACHE FOR RANKINGS
# =============================================================================


class RankingsCache:
    """
    Simple in-memory cache for rankings data with TTL expiration.

    Thread-safe for single-process async usage. For multi-process deployments,
    consider Redis or similar distributed cache.
    """

    def __init__(self, ttl_seconds: int = 30):
        self._cache: dict[str, dict[str, Any]] = {}
        self._ttl = ttl_seconds

    def get(self, key: str) -> Optional[dict[str, Any]]:
        """Get cached value if not expired."""
        if key not in self._cache:
            return None

        entry = self._cache[key]
        if time.time() - entry["timestamp"] > self._ttl:
            del self._cache[key]
            return None

        return entry["data"]

    def set(self, key: str, data: dict[str, Any]) -> None:
        """Store value with current timestamp."""
        self._cache[key] = {
            "data": data,
            "timestamp": time.time(),
        }

    def invalidate(self, key: str) -> None:
        """Remove specific key from cache."""
        self._cache.pop(key, None)

    def clear(self) -> None:
        """Clear all cached data."""
        self._cache.clear()


# Global cache instance
_rankings_cache = RankingsCache(ttl_seconds=RANKINGS_CACHE_TTL)


# =============================================================================
# HELPER FUNCTIONS FOR MATERIALIZED VIEW OPERATIONS
# =============================================================================


async def _check_and_refresh_rankings_if_stale() -> dict[str, Any]:
    """
    Check if rankings view is stale and trigger refresh if needed.

    Returns status information about the refresh state.
    """
    try:
        # Check staleness via RPC
        result = await supabase.rpc("get_rankings_refresh_status").execute()

        if not result.data or len(result.data) == 0:
            # No status record, view may not have been refreshed yet
            return {"is_stale": True, "staleness_seconds": None, "refresh_triggered": False}

        status = result.data[0]
        staleness_seconds = status.get("staleness_seconds", 0)
        is_stale = status.get("is_stale", False)

        # Trigger refresh if stale beyond threshold
        if is_stale or staleness_seconds > RANKINGS_REFRESH_INTERVAL:
            refresh_result = await supabase.rpc("execute_rankings_refresh").execute()
            refresh_data = refresh_result.data[0] if refresh_result.data else {}
            return {
                "is_stale": is_stale,
                "staleness_seconds": staleness_seconds,
                "refresh_triggered": True,
                "refresh_success": refresh_data.get("success", False),
                "refresh_duration_ms": refresh_data.get("duration_ms", 0),
                "refresh_message": refresh_data.get("message", ""),
            }

        return {
            "is_stale": False,
            "staleness_seconds": staleness_seconds,
            "refresh_triggered": False,
        }

    except Exception as e:
        # Log but don't fail - fallback to possibly stale data
        return {"is_stale": None, "error": str(e), "refresh_triggered": False}


async def _get_ranking_from_view(application_id: str, course_id: str) -> Optional[dict[str, Any]]:
    """
    Fetch ranking data from materialized view with single query.

    Returns pre-computed ranking data including percentile and recommendation.
    """
    cache_key = f"ranking:{application_id}:{course_id}"

    # Check cache first
    cached = _rankings_cache.get(cache_key)
    if cached is not None:
        return cached

    # Query materialized view
    result = (
        await supabase.table("application_rankings")
        .select(
            "choice_id, application_id, course_id, course_name, "
            "aps_score, course_min_aps, rank_position, recommendation, "
            "intake_limit"
        )
        .eq("application_id", application_id)
        .eq("course_id", course_id)
        .limit(1)
        .execute()
    )

    if not result.data or len(result.data) == 0:
        return None

    ranking = result.data[0]

    # Cache the result
    _rankings_cache.set(cache_key, ranking)

    return ranking


async def _get_course_statistics_from_view(course_id: str) -> dict[str, Any]:
    """
    Get aggregate statistics for a course from the rankings view.

    Single query to get min/max/avg APS and total applicant count.
    """
    cache_key = f"course_stats:{course_id}"

    # Check cache first
    cached = _rankings_cache.get(cache_key)
    if cached is not None:
        return cached

    # Get all rankings for this course to compute statistics
    result = (
        await supabase.table("application_rankings")
        .select("aps_score, rank_position, recommendation")
        .eq("course_id", course_id)
        .order("rank_position")
        .execute()
    )

    rankings = result.data or []

    if not rankings:
        stats = {
            "sample_size": 0,
            "avg_aps": 0,
            "min_aps": 0,
            "max_aps": 0,
        }
    else:
        aps_scores = [
            r["aps_score"]
            for r in rankings
            if r.get("aps_score") is not None
        ]
        stats = {
            "sample_size": len(rankings),
            "avg_aps": round(sum(aps_scores) / len(aps_scores), 1) if aps_scores else 0,
            "min_aps": min(aps_scores) if aps_scores else 0,
            "max_aps": max(aps_scores) if aps_scores else 0,
        }

    # Cache the result
    _rankings_cache.set(cache_key, stats)

    return stats


# =============================================================================
# COMPARE APPLICANT TOOL
# =============================================================================


@audit_service_role_access(table="applications", operation="select")
@tool
def compare_applicant(application_id: str, course_id: str) -> str:
    """
    Compare an applicant to similar applicants for a course.

    This tool analyzes how an applicant's profile compares to other
    applicants for the same course, using pre-computed rankings for
    optimal performance.

    Args:
        application_id: UUID of the application to compare
        course_id: UUID of the course

    Returns:
        JSON string with comparison data including:
        - applicant_profile: The applicant's key metrics
        - comparison_data: Statistics from other applicants
        - percentile_ranking: Where this applicant falls
        - recommendation: Suggested action based on comparison
        - performance_metrics: Query timing information

    Example:
        result = compare_applicant(
            application_id="123e4567-e89b-12d3-a456-426614174000",
            course_id="456e7890-e89b-12d3-a456-426614174001"
        )
    """

    async def async_compare():
        start_time = time.time()
        try:
            if not application_id:
                return "COMPARE_ERROR: application_id is required"
            if not course_id:
                return "COMPARE_ERROR: course_id is required"

            # Track which path we use for metrics
            used_materialized_view = False
            refresh_status = {}

            if USE_MATERIALIZED_RANKINGS:
                # Check and refresh if stale
                refresh_status = await _check_and_refresh_rankings_if_stale()

                # Try materialized view lookup first
                ranking = await _get_ranking_from_view(application_id, course_id)

                if ranking is not None:
                    used_materialized_view = True

                    # Get course statistics from view
                    stats = await _get_course_statistics_from_view(course_id)

                    # Fetch applicant name (minimal query)
                    app_result = (
                        await supabase.table("applications")
                        .select("applicant:applicants(full_name), status")
                        .eq("id", application_id)
                        .single()
                        .execute()
                    )

                    applicant_name = "Unknown"
                    app_status = "unknown"
                    if app_result.data:
                        applicant = app_result.data.get("applicant", {})
                        applicant_name = applicant.get("full_name", "Unknown") if applicant else "Unknown"
                        app_status = app_result.data.get("status", "unknown")

                    # Calculate percentile from rank position
                    total_applicants = stats["sample_size"]
                    rank_position = ranking.get("rank_position", 1)

                    if total_applicants > 0:
                        # Percentile: what percentage of applicants are below this one
                        percentile = round(
                            ((total_applicants - rank_position) / total_applicants) * 100, 1
                        )
                    else:
                        percentile = 50.0

                    # Map recommendation from view to tool format
                    view_recommendation = ranking.get("recommendation", "manual_review")
                    recommendation_map = {
                        "auto_accept_recommended": ("STRONG_CANDIDATE", "Applicant ranks highly and is recommended for acceptance."),
                        "conditional_recommended": ("GOOD_CANDIDATE", "Applicant meets requirements and is in competitive range."),
                        "waitlist_recommended": ("BORDERLINE", "Applicant is below typical acceptance threshold. Consider waitlist."),
                        "rejection_flagged": ("UNLIKELY", "Applicant ranks significantly below typical accepted students."),
                        "manual_review": ("REVIEW_NEEDED", "Insufficient data for automated recommendation. Manual review required."),
                    }
                    rec_status, rec_text = recommendation_map.get(
                        view_recommendation,
                        ("REVIEW_NEEDED", "Manual review required.")
                    )

                    elapsed_ms = round((time.time() - start_time) * 1000, 2)

                    return json.dumps({
                        "application_id": application_id,
                        "course_id": course_id,
                        "applicant_profile": {
                            "name": applicant_name,
                            "aps_score": ranking.get("aps_score", 0),
                            "rank_position": rank_position,
                            "current_status": app_status,
                        },
                        "comparison_data": {
                            "sample_size": total_applicants,
                            "accepted_average_aps": stats["avg_aps"],
                            "accepted_min_aps": stats["min_aps"],
                            "accepted_max_aps": stats["max_aps"],
                            "course_min_aps": ranking.get("course_min_aps"),
                            "intake_limit": ranking.get("intake_limit"),
                        },
                        "percentile_ranking": percentile,
                        "recommendation": {
                            "status": rec_status,
                            "explanation": rec_text,
                            "view_recommendation": view_recommendation,
                        },
                        "performance_metrics": {
                            "query_time_ms": elapsed_ms,
                            "used_materialized_view": True,
                            "cache_hit": _rankings_cache.get(f"ranking:{application_id}:{course_id}") is not None,
                            "refresh_triggered": refresh_status.get("refresh_triggered", False),
                            "view_staleness_seconds": refresh_status.get("staleness_seconds"),
                        },
                    })

            # Fallback: Original N+1 query pattern
            # Used when USE_MATERIALIZED_RANKINGS=false or view lookup fails
            return await _compare_applicant_legacy(application_id, course_id, start_time)

        except Exception as e:
            return f"COMPARE_ERROR: {str(e)}"

    return asyncio.run(async_compare())


async def _compare_applicant_legacy(
    application_id: str,
    course_id: str,
    start_time: float
) -> str:
    """
    Legacy comparison using N+1 query pattern.

    Preserved for fallback when materialized view is unavailable or disabled.
    """
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

    elapsed_ms = round((time.time() - start_time) * 1000, 2)

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
        "performance_metrics": {
            "query_time_ms": elapsed_ms,
            "used_materialized_view": False,
            "cache_hit": False,
            "refresh_triggered": False,
            "view_staleness_seconds": None,
        },
    })


# =============================================================================
# APPLICATION SUMMARY TOOL
# =============================================================================


@audit_service_role_access(table="applications", operation="select")
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


# =============================================================================
# ELIGIBILITY CHECK TOOL
# =============================================================================


@audit_service_role_access(table="applications", operation="select")
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


# =============================================================================
# MISSING DOCUMENTS TOOL
# =============================================================================


@audit_service_role_access(table="application_documents", operation="select")
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


# =============================================================================
# CACHE MANAGEMENT UTILITIES
# =============================================================================


def invalidate_rankings_cache() -> None:
    """
    Invalidate all rankings cache entries.

    Call this when you know the rankings data has changed significantly
    and you want to force fresh queries.
    """
    _rankings_cache.clear()


def get_rankings_cache_stats() -> dict[str, Any]:
    """
    Get statistics about the rankings cache.

    Returns cache configuration and current state for monitoring.
    """
    return {
        "ttl_seconds": RANKINGS_CACHE_TTL,
        "use_materialized_rankings": USE_MATERIALIZED_RANKINGS,
        "refresh_interval_seconds": RANKINGS_REFRESH_INTERVAL,
        "cache_entries": len(_rankings_cache._cache),
    }
