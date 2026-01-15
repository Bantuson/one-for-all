"""
APS Calculator Tool for South African University Admissions

This module provides tools for calculating Admission Point Scores (APS)
based on the standard South African grading scale used by most universities.

Standard SA APS Scale:
- 80-100%: 7 points
- 70-79%: 6 points
- 60-69%: 5 points
- 50-59%: 4 points
- 40-49%: 3 points
- 30-39%: 2 points
- 0-29%: 1 point

Life Orientation is weighted at 50% (max 3.5 points contribution)
Total APS = Sum of 6 best subjects + (Life Orientation * 0.5)
"""

import json
import asyncio
from typing import Optional
from crewai.tools import tool

from one_for_all.tools.supabase_client import get_supabase_client


def get_nsc_points(percentage: int) -> int:
    """
    Convert a percentage mark to NSC (National Senior Certificate) points.

    Uses the standard South African APS scale:
    - 80-100%: 7 points (Level 7)
    - 70-79%: 6 points (Level 6)
    - 60-69%: 5 points (Level 5)
    - 50-59%: 4 points (Level 4)
    - 40-49%: 3 points (Level 3)
    - 30-39%: 2 points (Level 2)
    - 0-29%: 1 point (Level 1)

    Args:
        percentage: The subject percentage (0-100)

    Returns:
        NSC points (1-7)
    """
    if percentage >= 80:
        return 7
    elif percentage >= 70:
        return 6
    elif percentage >= 60:
        return 5
    elif percentage >= 50:
        return 4
    elif percentage >= 40:
        return 3
    elif percentage >= 30:
        return 2
    else:
        return 1


def is_life_orientation(subject_name: str) -> bool:
    """
    Check if a subject is Life Orientation.

    Args:
        subject_name: The name of the subject

    Returns:
        True if the subject is Life Orientation
    """
    normalized = subject_name.lower().strip()
    return normalized in [
        "life orientation",
        "life-orientation",
        "lo",
        "l.o.",
        "life skills",
        "lewensorientering",  # Afrikaans
    ]


@tool
def calculate_aps(academic_info: str) -> str:
    """
    Calculate APS (Admission Point Score) from matric results.

    Calculates the total APS based on the standard SA scale:
    - Takes the 6 best subjects (excluding Life Orientation from main count)
    - Life Orientation is weighted at 50% and added separately
    - Maximum possible APS: 42 (6*7) + 3.5 (LO) = 45.5 (rounded to 45)

    Args:
        academic_info: JSON string containing matric results.
            Expected format: {"subjects": [{"name": "Mathematics", "percentage": 75}, ...]}

    Returns:
        JSON string with calculated APS and breakdown.
    """
    try:
        data = json.loads(academic_info)
        subjects = data.get("subjects", [])

        if not subjects:
            return json.dumps({
                "success": False,
                "error": "No subjects provided in academic_info"
            })

        # Separate Life Orientation from other subjects
        lo_subject = None
        other_subjects = []

        for subject in subjects:
            name = subject.get("name", "")
            percentage = subject.get("percentage", 0)

            # Ensure percentage is an integer
            if isinstance(percentage, str):
                percentage = int(float(percentage))

            points = get_nsc_points(percentage)

            if is_life_orientation(name):
                lo_subject = {
                    "name": name,
                    "percentage": percentage,
                    "points": points,
                    "weighted_points": round(points * 0.5, 1)
                }
            else:
                other_subjects.append({
                    "name": name,
                    "percentage": percentage,
                    "points": points
                })

        # Sort other subjects by points (descending) to get best 6
        other_subjects.sort(key=lambda x: x["points"], reverse=True)

        # Take top 6 subjects (or all if less than 6)
        best_six = other_subjects[:6]

        # Calculate totals
        best_six_total = sum(s["points"] for s in best_six)
        lo_weighted = lo_subject["weighted_points"] if lo_subject else 0
        total_aps = best_six_total + lo_weighted

        # Round to nearest integer for final APS
        final_aps = round(total_aps)

        # Calculate maximum possible
        max_possible = (6 * 7) + (7 * 0.5)  # 42 + 3.5 = 45.5

        result = {
            "success": True,
            "total_aps": final_aps,
            "aps_with_decimal": round(total_aps, 1),
            "best_six_subjects": best_six,
            "best_six_total": best_six_total,
            "life_orientation": lo_subject,
            "lo_contribution": lo_weighted,
            "max_possible_aps": int(max_possible),
            "subjects_counted": len(best_six),
            "calculation_breakdown": {
                "best_six_total": best_six_total,
                "lo_weighted": lo_weighted,
                "formula": f"{best_six_total} + {lo_weighted} = {total_aps}"
            }
        }

        return json.dumps(result, indent=2)

    except json.JSONDecodeError as e:
        return json.dumps({
            "success": False,
            "error": f"Invalid JSON in academic_info: {str(e)}"
        })
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": f"APS calculation failed: {str(e)}"
        })


@tool
def get_subject_points(subject_name: str, percentage: int) -> str:
    """
    Get NSC points for a single subject.

    Converts a percentage mark to the standard SA APS points scale.

    Args:
        subject_name: Name of the subject
        percentage: The percentage mark (0-100)

    Returns:
        JSON string with subject name, percentage, and points.
    """
    try:
        points = get_nsc_points(percentage)
        is_lo = is_life_orientation(subject_name)

        result = {
            "success": True,
            "subject": subject_name,
            "percentage": percentage,
            "points": points,
            "is_life_orientation": is_lo,
            "weighted_points": round(points * 0.5, 1) if is_lo else points,
            "level": f"Level {points}"
        }

        return json.dumps(result)

    except Exception as e:
        return json.dumps({
            "success": False,
            "error": f"Failed to calculate points: {str(e)}"
        })


@tool
def validate_aps_score(aps_score: int) -> str:
    """
    Validate an APS score is within acceptable range.

    Checks if the provided APS score is mathematically possible.
    Maximum APS: 45 (6*7 + 3.5 rounded)
    Minimum APS: 6 (6*1 + 0.5)

    Args:
        aps_score: The APS score to validate

    Returns:
        JSON string with validation result.
    """
    try:
        min_aps = 6  # 6 subjects * 1 point each + 0.5 LO
        max_aps = 45  # 6 subjects * 7 points + 3.5 LO

        is_valid = min_aps <= aps_score <= max_aps

        result = {
            "success": True,
            "aps_score": aps_score,
            "is_valid": is_valid,
            "min_possible": min_aps,
            "max_possible": max_aps,
            "message": "Valid APS score" if is_valid else f"APS must be between {min_aps} and {max_aps}"
        }

        return json.dumps(result)

    except Exception as e:
        return json.dumps({
            "success": False,
            "error": f"Validation failed: {str(e)}"
        })


@tool
def store_aps_calculation(application_id: str, aps_result: str) -> str:
    """
    Store APS calculation result in the database.

    Records the APS calculation as an agent decision in the agent_decisions table.

    Args:
        application_id: The application ID to associate the APS with
        aps_result: JSON string from calculate_aps containing the APS breakdown

    Returns:
        JSON string confirming storage or error.
    """
    async def async_logic():
        try:
            supabase = get_supabase_client()
            if not supabase:
                return json.dumps({
                    "success": False,
                    "error": "Supabase client not configured"
                })

            aps_data = json.loads(aps_result)

            if not aps_data.get("success"):
                return json.dumps({
                    "success": False,
                    "error": "Cannot store invalid APS calculation"
                })

            # Create agent decision record
            decision_record = {
                "application_id": application_id,
                "decision_type": "aps_score_calculated",
                "decision_value": {
                    "total_aps": aps_data.get("total_aps"),
                    "aps_with_decimal": aps_data.get("aps_with_decimal"),
                    "best_six_total": aps_data.get("best_six_total"),
                    "lo_contribution": aps_data.get("lo_contribution"),
                    "subjects_counted": aps_data.get("subjects_counted"),
                    "breakdown": aps_data.get("calculation_breakdown")
                },
                "confidence_score": 1.0,  # APS calculation is deterministic
                "reasoning": f"Calculated APS score of {aps_data.get('total_aps')} from {aps_data.get('subjects_counted')} subjects plus Life Orientation"
            }

            result = await supabase.table("agent_decisions").insert(decision_record).execute()

            if result.data:
                return json.dumps({
                    "success": True,
                    "decision_id": result.data[0].get("id"),
                    "application_id": application_id,
                    "aps_stored": aps_data.get("total_aps")
                })
            else:
                return json.dumps({
                    "success": False,
                    "error": "Failed to insert agent decision"
                })

        except Exception as e:
            return json.dumps({
                "success": False,
                "error": f"Failed to store APS: {str(e)}"
            })

    return asyncio.run(async_logic())
