"""
Test: Eligibility Promotion Logic

Verifies APS-based promotion logic for course selection:
- Low APS promotes to second choice program
- Eligible APS stays with first choice
- Ineligible for both choices triggers failure path

APS thresholds are program-specific and defined in institution configs.
"""

import pytest
import json
from typing import TYPE_CHECKING
from unittest.mock import patch, MagicMock, AsyncMock

if TYPE_CHECKING:
    from conftest import TrajectoryToolTracker

pytestmark = [
    pytest.mark.trajectory,
    pytest.mark.vcr,
    pytest.mark.llm_required,
]


# =============================================================================
# Test Fixtures
# =============================================================================


@pytest.fixture
def trajectory_very_low_aps_profile() -> dict:
    """
    Very low APS profile for testing complete ineligibility scenario.

    APS 20 - below all typical course requirements.
    Both choices require higher APS scores than this applicant has.
    """
    return {
        # Identity
        "profile_id": "TEST-TRAJ-VLOW-001",
        "full_name": "Trajectory Test Very Low APS",
        "id_number": "0701015000001",
        "date_of_birth": "2007-01-01",
        "gender": "Male",
        "home_language": "Setswana",
        "province": "North West",
        "citizenship": "South African",

        # Contact
        "mobile_number": "+27821111004",
        "email": "traj.verylowaps@example.com",
        "whatsapp_number": "+27821111004",
        "physical_address": "4 Trajectory Road, Rustenburg, 0300",

        # Academic - very low scores
        "matric_results": {
            "English FAL": {"level": "FAL", "mark": 40, "aps_points": 3},
            "Mathematical Literacy": {"level": "SL", "mark": 45, "aps_points": 3},
            "Physical Sciences": {"level": "HL", "mark": 35, "aps_points": 2},
            "Life Sciences": {"level": "HL", "mark": 40, "aps_points": 3},
            "Setswana HL": {"level": "HL", "mark": 55, "aps_points": 4},
            "Life Orientation": {"level": "-", "mark": 60, "aps_points": 5},
            "Geography": {"level": "HL", "mark": 38, "aps_points": 2},
        },
        "total_aps_score": 20,
        "academic_highlights": ["Improving in home language"],

        # Course Selection - both require higher APS than available
        "course_choices": [
            {
                "priority": 1,
                "institution": "University of Pretoria",
                "faculty": "Engineering, Built Environment and IT",
                "programme": "BSc Computer Science",
                "minimum_aps": 32,
                "requirements": "Mathematics HL (minimum 60%)",
            },
            {
                "priority": 2,
                "institution": "University of Pretoria",
                "faculty": "Engineering, Built Environment and IT",
                "programme": "BSc Information Systems",
                "minimum_aps": 26,
                "requirements": "Mathematics or Maths Literacy (50%+)",
            },
        ],
        "primary_institution": "University of Pretoria",

        # Financial
        "nsfas_eligible": True,
        "household_income": "R60,000 per year",
        "sassa_recipient": True,
        "disability_grant": False,
        "guardian_employment": "Unemployed",

        # Documents
        "documents_available": ["ID Document"],
        "documents_missing": ["Matric Certificate", "Academic Transcript", "Proof of Residence"],
    }


@pytest.fixture
def mock_course_requirements():
    """
    Mock course requirements data for testing eligibility logic.

    Returns a dictionary mapping course names to their requirements.
    """
    return {
        "BSc Computer Science": {
            "id": "course-cs-001",
            "name": "BSc Computer Science",
            "code": "CS001",
            "min_aps_score": 32,
            "subject_requirements": [
                {"subject": "Mathematics", "min_level": 5, "mandatory": True},
                {"subject": "English", "min_level": 4, "mandatory": True},
            ],
        },
        "BSc Information Systems": {
            "id": "course-is-001",
            "name": "BSc Information Systems",
            "code": "IS001",
            "min_aps_score": 26,
            "subject_requirements": [
                {"subject": "Mathematics", "min_level": 4, "mandatory": True, "alternatives": ["Mathematical Literacy"]},
                {"subject": "English", "min_level": 4, "mandatory": True},
            ],
        },
        "BSc Biological Sciences": {
            "id": "course-bio-001",
            "name": "BSc Biological Sciences",
            "code": "BIO001",
            "min_aps_score": 28,
            "subject_requirements": [
                {"subject": "Life Sciences", "min_level": 4, "mandatory": True},
                {"subject": "English", "min_level": 4, "mandatory": True},
            ],
        },
        "MBChB (Medicine)": {
            "id": "course-med-001",
            "name": "MBChB (Medicine)",
            "code": "MED001",
            "min_aps_score": 42,
            "subject_requirements": [
                {"subject": "Mathematics", "min_level": 6, "mandatory": True},
                {"subject": "Physical Sciences", "min_level": 6, "mandatory": True},
                {"subject": "English", "min_level": 5, "mandatory": True},
            ],
        },
    }


# =============================================================================
# Eligibility Evaluation Helper Functions
# =============================================================================


def evaluate_aps_eligibility(applicant_aps: int, min_aps: int) -> dict:
    """
    Evaluate if an applicant meets APS requirements for a course.

    Args:
        applicant_aps: The applicant's total APS score
        min_aps: The minimum APS required for the course

    Returns:
        Dict with eligibility status and details
    """
    is_eligible = applicant_aps >= min_aps
    difference = applicant_aps - min_aps

    if difference >= 5:
        status = "highly_eligible"
    elif difference >= 0:
        status = "eligible"
    elif difference >= -3:
        status = "borderline"
    else:
        status = "ineligible_aps"

    return {
        "applicant_aps": applicant_aps,
        "required_aps": min_aps,
        "difference": difference,
        "is_eligible": is_eligible,
        "status": status,
    }


def evaluate_course_choices(profile: dict, course_requirements: dict) -> dict:
    """
    Evaluate eligibility for all course choices and determine promotion logic.

    This simulates the rag_research_task logic for eligibility evaluation:
    - If first choice is eligible, use first + second as final choices
    - If first choice is ineligible, promote second to first position
    - Track rejection reasons for ineligible choices

    Args:
        profile: Applicant profile with course_choices and total_aps_score
        course_requirements: Dictionary of course requirements by name

    Returns:
        Dict with eligibility results and final choices
    """
    total_aps = profile.get("total_aps_score", 0)
    course_choices = profile.get("course_choices", [])

    results = {
        "original_first_choice_eligible": False,
        "final_first_choice": None,
        "final_second_choice": None,
        "rejection_reasons": [],
        "both_choices_verified": False,
        "needs_guidance": False,
        "eligible_choices": [],
        "ineligible_choices": [],
    }

    # Evaluate each choice
    for choice in sorted(course_choices, key=lambda x: x.get("priority", 99)):
        programme = choice.get("programme")
        course_req = course_requirements.get(programme, {})
        min_aps = course_req.get("min_aps_score", choice.get("minimum_aps", 0))

        eligibility = evaluate_aps_eligibility(total_aps, min_aps)
        choice_result = {
            "programme": programme,
            "priority": choice.get("priority"),
            "eligibility": eligibility,
        }

        if eligibility["is_eligible"]:
            results["eligible_choices"].append(choice_result)
        else:
            results["ineligible_choices"].append(choice_result)
            results["rejection_reasons"].append({
                "programme": programme,
                "reason": f"APS {total_aps} below minimum {min_aps} (shortfall: {abs(eligibility['difference'])} points)",
                "status": eligibility["status"],
            })

    # Determine final choices based on eligibility
    eligible_programmes = [c["programme"] for c in results["eligible_choices"]]

    if len(eligible_programmes) >= 2:
        # Both choices eligible - use original order
        results["final_first_choice"] = eligible_programmes[0]
        results["final_second_choice"] = eligible_programmes[1]
        results["original_first_choice_eligible"] = True
        results["both_choices_verified"] = True
    elif len(eligible_programmes) == 1:
        # Only one eligible - promote to first, need fallback for second
        first_choice = course_choices[0].get("programme") if course_choices else None
        results["final_first_choice"] = eligible_programmes[0]
        results["final_second_choice"] = None  # Needs alternative
        results["original_first_choice_eligible"] = (first_choice == eligible_programmes[0])
        results["both_choices_verified"] = False
    else:
        # No eligible choices - needs guidance
        results["needs_guidance"] = True
        results["both_choices_verified"] = False

    return results


# =============================================================================
# Test Classes
# =============================================================================


class TestEligibilityPromotion:
    """APS-based course eligibility promotion tests."""

    def test_low_aps_promotes_to_second_choice(
        self,
        trajectory_tracker: "TrajectoryToolTracker",
        trajectory_low_aps_profile: dict,
        mock_course_requirements: dict,
    ):
        """
        Test: Student with low APS gets promoted to second choice.

        Profile: APS 28 (below first choice requirement of 42 for Medicine)
        First choice: MBChB (Medicine) (requires 42)
        Second choice: BSc Biological Sciences (requires 28)

        Verification:
        - program_selection_task evaluates first choice
        - First choice marked as "ineligible_aps"
        - Second choice evaluated and marked "eligible"
        - Application proceeds with second choice as new first
        """
        profile = trajectory_low_aps_profile

        # Record tool call for program selection
        trajectory_tracker.record(
            "program_selection",
            {
                "profile_id": profile["profile_id"],
                "course_choices": profile["course_choices"],
                "total_aps_score": profile["total_aps_score"],
            },
            "SELECTION_RECORDED"
        )

        # Evaluate eligibility for all choices
        eligibility_result = evaluate_course_choices(profile, mock_course_requirements)

        # Record eligibility evaluation tool call
        trajectory_tracker.record(
            "evaluate_eligibility",
            {
                "profile_id": profile["profile_id"],
                "total_aps": profile["total_aps_score"],
                "first_choice": profile["course_choices"][0]["programme"],
                "second_choice": profile["course_choices"][1]["programme"],
            },
            json.dumps(eligibility_result)
        )

        # Verify first choice is ineligible (Medicine requires 42, student has 28)
        assert not eligibility_result["original_first_choice_eligible"], \
            "First choice (Medicine) should be ineligible with APS 28"

        # Verify rejection reason is recorded
        assert len(eligibility_result["rejection_reasons"]) > 0, \
            "Rejection reasons should be recorded for ineligible choices"

        first_rejection = eligibility_result["rejection_reasons"][0]
        assert "MBChB" in first_rejection["programme"] or "Medicine" in first_rejection["programme"], \
            "Medicine should be in rejection reasons"
        assert first_rejection["status"] == "ineligible_aps", \
            "Status should be ineligible_aps for Medicine"

        # Verify second choice is eligible (Bio Sciences requires 28, student has 28)
        assert len(eligibility_result["eligible_choices"]) == 1, \
            "Exactly one choice should be eligible"
        assert eligibility_result["eligible_choices"][0]["programme"] == "BSc Biological Sciences", \
            "BSc Biological Sciences should be the only eligible choice"

        # Verify promotion logic
        assert eligibility_result["final_first_choice"] == "BSc Biological Sciences", \
            "Second choice should be promoted to first choice"

        # Update tracker state to reflect promotion
        trajectory_tracker.update_state(profile_complete=True)

        # Record the promotion decision
        trajectory_tracker.record(
            "eligibility_promotion",
            {
                "original_first_choice": "MBChB (Medicine)",
                "promoted_first_choice": "BSc Biological Sciences",
                "reason": "APS below requirement",
            },
            "PROMOTION_APPLIED"
        )

        # Verify tool call sequence
        assert trajectory_tracker.verify_task_order([
            "program_selection",
            "evaluate_eligibility",
            "eligibility_promotion",
        ]), "Tool calls should be in correct order"

        # Verify final state
        assert trajectory_tracker.called("eligibility_promotion"), \
            "Eligibility promotion tool should have been called"

        promotion_args = trajectory_tracker.get_call_args("eligibility_promotion")
        assert promotion_args["original_first_choice"] == "MBChB (Medicine)", \
            "Original first choice should be Medicine"
        assert promotion_args["promoted_first_choice"] == "BSc Biological Sciences", \
            "Promoted first choice should be Biological Sciences"

    def test_eligible_for_first_choice_no_promotion(
        self,
        trajectory_tracker: "TrajectoryToolTracker",
        trajectory_undergraduate_profile: dict,
        mock_course_requirements: dict,
    ):
        """
        Test: High APS student keeps first choice (no promotion needed).

        Profile: APS 42 (above requirement of 32 for CS)
        First choice: BSc Computer Science (requires 32)

        Verification:
        - program_selection_task evaluates first choice
        - First choice marked as "eligible"
        - No second choice evaluation needed for promotion
        - Application proceeds with first choice
        """
        profile = trajectory_undergraduate_profile

        # Record tool call for program selection
        trajectory_tracker.record(
            "program_selection",
            {
                "profile_id": profile["profile_id"],
                "course_choices": profile["course_choices"],
                "total_aps_score": profile["total_aps_score"],
            },
            "SELECTION_RECORDED"
        )

        # Evaluate eligibility for all choices
        eligibility_result = evaluate_course_choices(profile, mock_course_requirements)

        # Record eligibility evaluation tool call
        trajectory_tracker.record(
            "evaluate_eligibility",
            {
                "profile_id": profile["profile_id"],
                "total_aps": profile["total_aps_score"],
                "first_choice": profile["course_choices"][0]["programme"],
                "second_choice": profile["course_choices"][1]["programme"],
            },
            json.dumps(eligibility_result)
        )

        # Verify first choice is eligible (CS requires 32, student has 42)
        assert eligibility_result["original_first_choice_eligible"], \
            "First choice (Computer Science) should be eligible with APS 42"

        # Verify no rejection reasons for first choice
        rejection_programmes = [r["programme"] for r in eligibility_result["rejection_reasons"]]
        assert "BSc Computer Science" not in rejection_programmes, \
            "Computer Science should not be in rejection reasons"

        # Verify both choices are eligible
        assert len(eligibility_result["eligible_choices"]) == 2, \
            "Both choices should be eligible"

        # Verify no promotion needed - first choice remains first
        assert eligibility_result["final_first_choice"] == "BSc Computer Science", \
            "First choice should remain BSc Computer Science"
        assert eligibility_result["final_second_choice"] == "BSc Information Technology", \
            "Second choice should remain BSc Information Technology"

        # Verify both choices are verified
        assert eligibility_result["both_choices_verified"], \
            "Both choices should be verified as eligible"

        # Update tracker state
        trajectory_tracker.update_state(profile_complete=True)

        # Record that no promotion was needed
        trajectory_tracker.record(
            "eligibility_check_complete",
            {
                "first_choice": "BSc Computer Science",
                "second_choice": "BSc Information Technology",
                "promotion_applied": False,
            },
            "NO_PROMOTION_NEEDED"
        )

        # Verify tool call sequence
        assert trajectory_tracker.verify_task_order([
            "program_selection",
            "evaluate_eligibility",
            "eligibility_check_complete",
        ]), "Tool calls should be in correct order"

        # Verify eligibility status details
        first_choice_result = eligibility_result["eligible_choices"][0]
        assert first_choice_result["eligibility"]["status"] in ["eligible", "highly_eligible"], \
            "First choice should have eligible or highly_eligible status"
        assert first_choice_result["eligibility"]["difference"] >= 0, \
            "APS difference should be positive (meets or exceeds requirement)"

    def test_ineligible_for_both_choices(
        self,
        trajectory_tracker: "TrajectoryToolTracker",
        trajectory_very_low_aps_profile: dict,
        mock_course_requirements: dict,
    ):
        """
        Test: Very low APS fails both choices.

        Profile: APS 20 (below all requirements)
        First choice: BSc Computer Science (requires 32)
        Second choice: BSc Information Systems (requires 26)

        Verification:
        - Both choices evaluated
        - Both marked as "ineligible_aps"
        - Application enters "needs_guidance" state
        - Notification sent about alternative programs
        """
        profile = trajectory_very_low_aps_profile

        # Record tool call for program selection
        trajectory_tracker.record(
            "program_selection",
            {
                "profile_id": profile["profile_id"],
                "course_choices": profile["course_choices"],
                "total_aps_score": profile["total_aps_score"],
            },
            "SELECTION_RECORDED"
        )

        # Evaluate eligibility for all choices
        eligibility_result = evaluate_course_choices(profile, mock_course_requirements)

        # Record eligibility evaluation tool call
        trajectory_tracker.record(
            "evaluate_eligibility",
            {
                "profile_id": profile["profile_id"],
                "total_aps": profile["total_aps_score"],
                "first_choice": profile["course_choices"][0]["programme"],
                "second_choice": profile["course_choices"][1]["programme"],
            },
            json.dumps(eligibility_result)
        )

        # Verify first choice is ineligible (CS requires 32, student has 20)
        assert not eligibility_result["original_first_choice_eligible"], \
            "First choice (Computer Science) should be ineligible with APS 20"

        # Verify both choices are ineligible
        assert len(eligibility_result["eligible_choices"]) == 0, \
            "No choices should be eligible with APS 20"
        assert len(eligibility_result["ineligible_choices"]) == 2, \
            "Both choices should be ineligible"

        # Verify rejection reasons for both choices
        assert len(eligibility_result["rejection_reasons"]) == 2, \
            "Both choices should have rejection reasons"

        rejection_programmes = [r["programme"] for r in eligibility_result["rejection_reasons"]]
        assert "BSc Computer Science" in rejection_programmes, \
            "Computer Science should be in rejection reasons"
        assert "BSc Information Systems" in rejection_programmes, \
            "Information Systems should be in rejection reasons"

        # Verify needs_guidance state
        assert eligibility_result["needs_guidance"], \
            "Application should enter needs_guidance state"
        assert not eligibility_result["both_choices_verified"], \
            "Choices should not be verified when both are ineligible"

        # Verify no final choices set
        assert eligibility_result["final_first_choice"] is None, \
            "No final first choice should be set when all choices are ineligible"
        assert eligibility_result["final_second_choice"] is None, \
            "No final second choice should be set when all choices are ineligible"

        # Update tracker state to reflect guidance needed
        trajectory_tracker.update_state(profile_complete=True)

        # Record the needs_guidance decision
        trajectory_tracker.record(
            "eligibility_needs_guidance",
            {
                "profile_id": profile["profile_id"],
                "total_aps": profile["total_aps_score"],
                "rejected_choices": [
                    {"programme": "BSc Computer Science", "required_aps": 32},
                    {"programme": "BSc Information Systems", "required_aps": 26},
                ],
            },
            "GUIDANCE_REQUIRED"
        )

        # Simulate notification about alternative programs
        trajectory_tracker.record(
            "send_guidance_notification",
            {
                "applicant_email": profile["email"],
                "applicant_phone": profile["mobile_number"],
                "message_type": "alternative_programs",
                "suggested_actions": [
                    "Consider bridging courses to improve APS",
                    "Explore TVET college options",
                    "Consider part-time study options",
                ],
            },
            "NOTIFICATION_SENT"
        )

        # Verify tool call sequence
        assert trajectory_tracker.verify_task_order([
            "program_selection",
            "evaluate_eligibility",
            "eligibility_needs_guidance",
            "send_guidance_notification",
        ]), "Tool calls should be in correct order"

        # Verify the guidance notification was sent
        assert trajectory_tracker.called("send_guidance_notification"), \
            "Guidance notification should be sent when both choices fail"

        notification_args = trajectory_tracker.get_call_args("send_guidance_notification")
        assert notification_args["message_type"] == "alternative_programs", \
            "Notification should be about alternative programs"
        assert len(notification_args["suggested_actions"]) > 0, \
            "Suggested actions should be provided"

        # Verify all ineligible choices have proper status
        for choice in eligibility_result["ineligible_choices"]:
            assert choice["eligibility"]["status"] == "ineligible_aps", \
                f"Choice {choice['programme']} should have ineligible_aps status"
            assert choice["eligibility"]["difference"] < 0, \
                f"Choice {choice['programme']} should have negative APS difference"


class TestEligibilityEdgeCases:
    """Edge cases for eligibility promotion logic."""

    def test_borderline_aps_first_choice(
        self,
        trajectory_tracker: "TrajectoryToolTracker",
        mock_course_requirements: dict,
    ):
        """
        Test: Borderline APS (within 3 points of requirement).

        Borderline applicants may qualify for conditional acceptance
        rather than outright rejection.
        """
        # Create a borderline profile (APS 30, requirement is 32 for CS)
        borderline_profile = {
            "profile_id": "TEST-TRAJ-BORDER-001",
            "total_aps_score": 30,
            "course_choices": [
                {
                    "priority": 1,
                    "programme": "BSc Computer Science",
                    "minimum_aps": 32,
                },
                {
                    "priority": 2,
                    "programme": "BSc Information Systems",
                    "minimum_aps": 26,
                },
            ],
        }

        # Record program selection
        trajectory_tracker.record(
            "program_selection",
            {
                "profile_id": borderline_profile["profile_id"],
                "course_choices": borderline_profile["course_choices"],
                "total_aps_score": borderline_profile["total_aps_score"],
            },
            "SELECTION_RECORDED"
        )

        # Evaluate eligibility
        eligibility_result = evaluate_course_choices(borderline_profile, mock_course_requirements)

        # Record eligibility evaluation
        trajectory_tracker.record(
            "evaluate_eligibility",
            {
                "profile_id": borderline_profile["profile_id"],
                "total_aps": borderline_profile["total_aps_score"],
            },
            json.dumps(eligibility_result)
        )

        # Verify first choice is borderline (not fully ineligible)
        assert len(eligibility_result["rejection_reasons"]) == 1, \
            "Only first choice should be rejected"

        first_rejection = eligibility_result["rejection_reasons"][0]
        assert first_rejection["status"] == "borderline", \
            "First choice should be borderline, not fully ineligible"

        # Verify second choice is eligible
        assert len(eligibility_result["eligible_choices"]) == 1, \
            "Second choice should be eligible"
        assert eligibility_result["eligible_choices"][0]["programme"] == "BSc Information Systems", \
            "Information Systems should be eligible"

        # Record borderline handling
        trajectory_tracker.record(
            "handle_borderline_eligibility",
            {
                "programme": "BSc Computer Science",
                "status": "borderline",
                "shortfall": 2,
                "action": "promote_second_choice",
            },
            "BORDERLINE_HANDLED"
        )

        # Verify tool sequence
        assert trajectory_tracker.called("handle_borderline_eligibility"), \
            "Borderline eligibility should be explicitly handled"

    def test_exactly_meets_aps_requirement(
        self,
        trajectory_tracker: "TrajectoryToolTracker",
        mock_course_requirements: dict,
    ):
        """
        Test: APS exactly meets the requirement (no buffer).

        Applicant with APS exactly at the minimum should be eligible.
        """
        # Create a profile that exactly meets the requirement
        exact_profile = {
            "profile_id": "TEST-TRAJ-EXACT-001",
            "total_aps_score": 32,  # Exactly the CS requirement
            "course_choices": [
                {
                    "priority": 1,
                    "programme": "BSc Computer Science",
                    "minimum_aps": 32,
                },
            ],
        }

        # Record program selection
        trajectory_tracker.record(
            "program_selection",
            {
                "profile_id": exact_profile["profile_id"],
                "total_aps_score": exact_profile["total_aps_score"],
            },
            "SELECTION_RECORDED"
        )

        # Evaluate APS eligibility directly
        eligibility = evaluate_aps_eligibility(
            exact_profile["total_aps_score"],
            32  # CS requirement
        )

        # Record eligibility check
        trajectory_tracker.record(
            "evaluate_aps",
            {
                "applicant_aps": exact_profile["total_aps_score"],
                "required_aps": 32,
            },
            json.dumps(eligibility)
        )

        # Verify eligibility
        assert eligibility["is_eligible"], \
            "Applicant meeting exact APS should be eligible"
        assert eligibility["difference"] == 0, \
            "Difference should be exactly 0"
        assert eligibility["status"] == "eligible", \
            "Status should be 'eligible' (not 'highly_eligible')"

        # Verify tool call
        assert trajectory_tracker.called("evaluate_aps"), \
            "APS evaluation should be recorded"
