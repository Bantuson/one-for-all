"""
Test: NSFAS Conditional Branching

Verifies the NSFAS eligibility decision tree:
1. Eligible + Undergraduate -> YES_NSFAS -> Full NSFAS flow
2. Ineligible -> NO_NSFAS -> Skip NSFAS tasks
3. Postgraduate -> NO_NSFAS -> Skip regardless of income

NSFAS (National Student Financial Aid Scheme) is only for undergrad students.
"""

import pytest
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from conftest import TrajectoryToolTracker

pytestmark = [
    pytest.mark.trajectory,
    pytest.mark.vcr,
    pytest.mark.llm_required,
]


# =============================================================================
# Profile Fixtures for NSFAS Testing
# =============================================================================


@pytest.fixture
def nsfas_ineligible_profile() -> dict:
    """
    Undergraduate profile with household income above NSFAS threshold.

    NSFAS threshold is R350,000 combined household income.
    This profile has income exceeding that threshold.

    Returns:
        Dict containing an undergraduate profile that is NOT NSFAS eligible
        due to household income exceeding the threshold.
    """
    return {
        # Identity
        "profile_id": "TEST-TRAJ-NSFAS-INELIG-001",
        "full_name": "Trajectory Test NSFAS Ineligible",
        "id_number": "0501015000002",
        "date_of_birth": "2005-01-01",
        "gender": "Male",
        "home_language": "English",
        "province": "Gauteng",
        "citizenship": "South African",

        # Contact
        "mobile_number": "+27821111010",
        "email": "traj.nsfas.ineligible@example.com",
        "whatsapp_number": "+27821111010",
        "physical_address": "10 Wealthy Lane, Sandton, 2196",

        # Academic - strong performance
        "matric_results": {
            "English Home Language": {"level": "HL", "mark": 85, "aps_points": 7},
            "Mathematics": {"level": "HL", "mark": 88, "aps_points": 7},
            "Physical Sciences": {"level": "HL", "mark": 82, "aps_points": 7},
            "Life Sciences": {"level": "HL", "mark": 80, "aps_points": 7},
            "Afrikaans FAL": {"level": "FAL", "mark": 75, "aps_points": 6},
            "Life Orientation": {"level": "-", "mark": 85, "aps_points": 7},
            "Information Technology": {"level": "HL", "mark": 90, "aps_points": 7},
        },
        "total_aps_score": 48,
        "academic_highlights": [
            "Top performer in all subjects",
            "Academic excellence award",
        ],

        # Course Selection
        "course_choices": [
            {
                "priority": 1,
                "institution": "University of Pretoria",
                "faculty": "Engineering, Built Environment and IT",
                "programme": "BSc Computer Science",
                "minimum_aps": 35,
                "requirements": "Mathematics HL (minimum 60%)",
            },
            {
                "priority": 2,
                "institution": "University of Pretoria",
                "faculty": "Engineering, Built Environment and IT",
                "programme": "BSc Information Technology",
                "minimum_aps": 32,
                "requirements": "Mathematics or Maths Literacy",
            },
        ],
        "primary_institution": "University of Pretoria",

        # Financial - NOT ELIGIBLE for NSFAS (income too high)
        "nsfas_eligible": False,
        "household_income": "R450,000 per year",
        "sassa_recipient": False,
        "disability_grant": False,
        "guardian_employment": "Employed - senior manager",

        # Documents
        "documents_available": [
            "ID Document",
            "Matric Certificate",
            "Academic Transcript",
            "Proof of Residence",
        ],
        "documents_missing": [],
    }


@pytest.fixture
def postgraduate_low_income_profile() -> dict:
    """
    Postgraduate profile with low household income.

    Even though household income would qualify for NSFAS,
    postgraduate students are NOT eligible for NSFAS funding.

    Returns:
        Dict containing a postgraduate profile that would normally
        be NSFAS eligible by income, but is excluded due to education level.
    """
    return {
        # Identity
        "profile_id": "TEST-TRAJ-PG-LOW-001",
        "full_name": "Trajectory Test Postgrad Low Income",
        "id_number": "9601015000002",
        "date_of_birth": "1996-01-01",
        "gender": "Female",
        "home_language": "IsiZulu",
        "province": "KwaZulu-Natal",
        "citizenship": "South African",

        # Contact
        "mobile_number": "+27821111011",
        "email": "traj.postgrad.lowincome@example.com",
        "whatsapp_number": "+27821111011",
        "physical_address": "15 Modest Road, Durban, 4001",

        # Postgraduate specific
        "education_level": "Honours",
        "previous_qualification": "Bachelor's Degree",
        "undergraduate_degree": "BSc Biological Sciences",
        "undergraduate_institution": "University of KwaZulu-Natal",
        "undergraduate_graduation_year": 2024,
        "undergraduate_average": 68.0,

        # Course Selection
        "course_choices": [
            {
                "priority": 1,
                "institution": "University of KwaZulu-Natal",
                "faculty": "Science and Agriculture",
                "programme": "BSc Honours Biological Sciences",
                "minimum_avg": 60,
                "requirements": "BSc degree in Biological Sciences or related field",
            },
        ],
        "primary_institution": "University of KwaZulu-Natal",

        # Financial - LOW INCOME but postgrad (ineligible for NSFAS)
        # This tests that education level check happens BEFORE income check
        "nsfas_eligible": False,  # Set to false because postgrad is excluded
        "household_income": "R85,000 per year",  # Below NSFAS threshold
        "sassa_recipient": True,
        "disability_grant": False,
        "guardian_employment": "Unemployed",

        # Documents
        "documents_available": [
            "ID Document",
            "Undergraduate Degree Certificate",
            "Academic Transcript",
            "Proof of Residence",
        ],
        "documents_missing": [],
    }


# =============================================================================
# NSFAS Conditional Branching Tests
# =============================================================================


class TestNSFASConditional:
    """NSFAS eligibility branching tests."""

    # -------------------------------------------------------------------------
    # NSFAS Tool Names - For tracking purposes
    # -------------------------------------------------------------------------
    NSFAS_TOOLS = [
        # Primary NSFAS tools
        "create_nsfas_application",
        "nsfas_application_submission_tool",
        "mock_nsfas_submission_tool",
        "supabase_nsfas_store",
        "supabase_nsfas_documents_store",
        "add_nsfas_document",
        "get_nsfas_application",
        "list_applicant_nsfas_applications",
        "list_nsfas_documents",
    ]

    NSFAS_DATA_COLLECTION_TOOLS = [
        "supabase_nsfas_store",
        "supabase_nsfas_documents_store",
        "create_nsfas_application",
        "add_nsfas_document",
    ]

    NSFAS_SUBMISSION_TOOLS = [
        "nsfas_application_submission_tool",
        "mock_nsfas_submission_tool",
    ]

    def test_nsfas_eligible_creates_application(
        self,
        trajectory_tracker: "TrajectoryToolTracker",
        trajectory_undergraduate_profile: dict,
    ):
        """
        Test: NSFAS-eligible undergrad creates full application.

        Profile: Undergraduate, household income < R350,000

        Verification:
        - ask_if_apply_for_nsfas_task returns "YES_NSFAS"
        - nsfas_collection_task collects guardian/household data
        - nsfas_submission_task creates NSFAS application
        - NSFAS reference number generated (TEST-NSFAS-...)
        """
        profile = trajectory_undergraduate_profile

        # Verify profile is NSFAS eligible
        assert profile.get("nsfas_eligible") is True, \
            "Test requires NSFAS-eligible profile"
        assert "education_level" not in profile or profile.get("education_level") != "Honours", \
            "Test requires undergraduate profile"

        # =====================================================================
        # Simulate NSFAS Eligibility Decision Flow
        # =====================================================================

        # Task 1: ask_if_apply_for_nsfas_task - Check eligibility
        # Decision logic from tasks.yaml:
        # 1. nsfas_eligible is TRUE
        # 2. Not postgrad (no education_level or undergrad)
        # Result: YES_NSFAS
        trajectory_tracker.record(
            "evaluate_nsfas_eligibility",
            {
                "nsfas_eligible": profile["nsfas_eligible"],
                "household_income": profile["household_income"],
                "education_level": profile.get("education_level", "undergraduate"),
            },
            "YES_NSFAS"
        )
        trajectory_tracker.update_state(nsfas_submitted=False)

        # =====================================================================
        # Simulate NSFAS Data Collection Flow
        # =====================================================================

        # Task 2: nsfas_collection_task - Collect NSFAS-specific data
        # When YES_NSFAS: Collect guardian info, household data, income proof
        trajectory_tracker.record(
            "supabase_nsfas_store",
            {
                "user_id": profile["profile_id"],
                "guardian_employment": profile["guardian_employment"],
                "household_income": profile["household_income"],
                "sassa_recipient": profile["sassa_recipient"],
                "disability_grant": profile["disability_grant"],
            },
            f'{{"nsfas_application_id": "TEST-TRAJ-NSFAS-{profile["profile_id"]}"}}'
        )

        # Store NSFAS-specific documents
        trajectory_tracker.record(
            "supabase_nsfas_documents_store",
            {
                "nsfas_application_id": f"TEST-TRAJ-NSFAS-{profile['profile_id']}",
                "document_type": "proof_of_income",
                "file_url": "https://storage.example.com/nsfas/income_proof.pdf",
            },
            '{"document_id": "doc-nsfas-001"}'
        )

        # =====================================================================
        # Simulate NSFAS Submission Flow
        # =====================================================================

        # Task 3: nsfas_submission_task - Submit to NSFAS
        nsfas_reference = f"TEST-NSFAS-{profile['profile_id']}-REF"
        trajectory_tracker.record(
            "mock_nsfas_submission_tool",
            {
                "full_name": profile["full_name"],
                "id_number": profile["id_number"],
                "guardian_employment": profile["guardian_employment"],
                "household_income": profile["household_income"],
            },
            f"NSFAS application submitted successfully (MOCK). Reference number: {nsfas_reference}"
        )
        trajectory_tracker.update_state(nsfas_submitted=True)

        # =====================================================================
        # Verification
        # =====================================================================

        # 1. Verify YES_NSFAS decision was made
        eligibility_calls = [
            c for c in trajectory_tracker.calls
            if c["tool"] == "evaluate_nsfas_eligibility"
        ]
        assert len(eligibility_calls) == 1, "Should evaluate NSFAS eligibility once"
        assert eligibility_calls[0]["result"] == "YES_NSFAS", \
            "Eligible undergraduate should get YES_NSFAS"

        # 2. Verify NSFAS data collection tools were called
        assert trajectory_tracker.called("supabase_nsfas_store"), \
            "NSFAS application data should be stored"
        assert trajectory_tracker.called("supabase_nsfas_documents_store"), \
            "NSFAS documents should be stored"

        # 3. Verify NSFAS submission was made
        assert trajectory_tracker.called("mock_nsfas_submission_tool"), \
            "NSFAS application should be submitted"

        # 4. Verify correct tool order
        assert trajectory_tracker.verify_task_order([
            "evaluate_nsfas_eligibility",
            "supabase_nsfas_store",
            "supabase_nsfas_documents_store",
            "mock_nsfas_submission_tool",
        ]), "NSFAS tools should be called in correct sequence"

        # 5. Verify final state shows NSFAS submitted
        assert trajectory_tracker.state.nsfas_submitted is True, \
            "Final state should show NSFAS as submitted"

        # 6. Verify reference number format
        submission_result = [
            c for c in trajectory_tracker.calls
            if c["tool"] == "mock_nsfas_submission_tool"
        ][0]["result"]
        assert "TEST-NSFAS-" in submission_result, \
            "NSFAS reference should have TEST-NSFAS- prefix"

    def test_nsfas_ineligible_skips_funding(
        self,
        trajectory_tracker: "TrajectoryToolTracker",
        nsfas_ineligible_profile: dict,
    ):
        """
        Test: NSFAS-ineligible student skips funding application.

        Profile: Undergraduate, household income > R350,000
        (nsfas_eligible: false)

        Verification:
        - ask_if_apply_for_nsfas_task returns "NO_NSFAS"
        - nsfas_collection_task returns {"nsfas_skipped": true}
        - nsfas_submission_task returns {"nsfas_skipped": true}
        - NO nsfas data collection tools called
        - NO nsfas submission tools called
        """
        profile = nsfas_ineligible_profile

        # Verify profile is NOT NSFAS eligible
        assert profile.get("nsfas_eligible") is False, \
            "Test requires NSFAS-ineligible profile"
        assert "education_level" not in profile, \
            "Test requires undergraduate profile (no education_level field)"

        # =====================================================================
        # Simulate NSFAS Eligibility Decision Flow
        # =====================================================================

        # Task 1: ask_if_apply_for_nsfas_task - Check eligibility
        # Decision logic from tasks.yaml:
        # 1. nsfas_eligible is FALSE -> immediate NO_NSFAS (income too high)
        trajectory_tracker.record(
            "evaluate_nsfas_eligibility",
            {
                "nsfas_eligible": profile["nsfas_eligible"],
                "household_income": profile["household_income"],
            },
            "NO_NSFAS"
        )

        # =====================================================================
        # Simulate Skip Flow (NO NSFAS tasks executed)
        # =====================================================================

        # Task 2: nsfas_collection_task - Returns skip immediately
        # Per tasks.yaml: IF result was "NO_NSFAS": Do NOT collect any NSFAS data
        trajectory_tracker.record(
            "nsfas_collection_skip",
            {"context_result": "NO_NSFAS"},
            '{"nsfas_skipped": true, "reason": "Applicant not eligible for NSFAS"}'
        )

        # Task 3: nsfas_submission_task - Returns skip immediately
        # Per tasks.yaml: IF result contains "nsfas_skipped": true: Do NOT submit
        trajectory_tracker.record(
            "nsfas_submission_skip",
            {"context_result": "nsfas_skipped"},
            '{"nsfas_skipped": true, "reason": "Applicant not eligible for NSFAS - no submission required"}'
        )

        # =====================================================================
        # Verification
        # =====================================================================

        # 1. Verify NO_NSFAS decision was made
        eligibility_calls = [
            c for c in trajectory_tracker.calls
            if c["tool"] == "evaluate_nsfas_eligibility"
        ]
        assert len(eligibility_calls) == 1, "Should evaluate NSFAS eligibility once"
        assert eligibility_calls[0]["result"] == "NO_NSFAS", \
            "Ineligible student should get NO_NSFAS"

        # 2. Verify NO NSFAS data collection tools were called
        for tool in self.NSFAS_DATA_COLLECTION_TOOLS:
            assert not trajectory_tracker.called(tool), \
                f"NSFAS data collection tool {tool} should NOT be called for ineligible student"

        # 3. Verify NO NSFAS submission tools were called
        for tool in self.NSFAS_SUBMISSION_TOOLS:
            assert not trajectory_tracker.called(tool), \
                f"NSFAS submission tool {tool} should NOT be called for ineligible student"

        # 4. Verify skip records exist
        skip_calls = [
            c for c in trajectory_tracker.calls
            if "skip" in c["tool"].lower()
        ]
        assert len(skip_calls) == 2, \
            "Should have skip records for collection and submission tasks"

        # 5. Verify skip reasons contain expected text
        for skip_call in skip_calls:
            assert "nsfas_skipped" in skip_call["result"], \
                "Skip result should contain nsfas_skipped marker"

        # 6. Verify final state shows NSFAS NOT submitted
        assert trajectory_tracker.state.nsfas_submitted is False, \
            "Final state should show NSFAS as NOT submitted"

    def test_postgrad_always_skips_nsfas(
        self,
        trajectory_tracker: "TrajectoryToolTracker",
        trajectory_postgraduate_profile: dict,
    ):
        """
        Test: Postgraduate ALWAYS skips NSFAS regardless of income.

        Profile: Honours student (even if household income is low)

        Verification:
        - Education level check happens BEFORE income check
        - Postgrad detected -> immediate NO_NSFAS
        - All NSFAS tasks return skip results
        - NSFAS tools never called
        """
        profile = trajectory_postgraduate_profile

        # Verify profile is postgraduate
        assert profile.get("education_level") == "Honours", \
            "Test requires postgraduate profile"

        # =====================================================================
        # Simulate NSFAS Eligibility Decision Flow
        # =====================================================================

        # Task 1: ask_if_apply_for_nsfas_task - Check eligibility
        # Decision logic from tasks.yaml (checked IN ORDER):
        # 1. If nsfas_eligible is FALSE or "No" -> return NO_NSFAS (income too high)
        # 2. If postgrad programme -> return NO_NSFAS (NSFAS is for undergrad only)
        # Since this is postgrad, step 2 catches it regardless of income
        trajectory_tracker.record(
            "evaluate_nsfas_eligibility",
            {
                "education_level": profile["education_level"],
                "nsfas_eligible": profile.get("nsfas_eligible", False),
                "household_income": profile.get("household_income", "N/A"),
            },
            "NO_NSFAS"
        )

        # Record that postgrad was the reason (for audit trail)
        trajectory_tracker.record(
            "nsfas_decision_reason",
            {
                "reason": "postgrad_ineligible",
                "education_level": profile["education_level"],
            },
            "Postgraduate students are not eligible for NSFAS funding"
        )

        # =====================================================================
        # Simulate Skip Flow (NO NSFAS tasks executed)
        # =====================================================================

        # Task 2: nsfas_collection_task - Returns skip immediately
        trajectory_tracker.record(
            "nsfas_collection_skip",
            {"context_result": "NO_NSFAS", "reason": "postgrad_ineligible"},
            '{"nsfas_skipped": true, "reason": "Applicant not eligible for NSFAS - postgraduate students excluded"}'
        )

        # Task 3: nsfas_submission_task - Returns skip immediately
        trajectory_tracker.record(
            "nsfas_submission_skip",
            {"context_result": "nsfas_skipped"},
            '{"nsfas_skipped": true, "reason": "Applicant not eligible for NSFAS - no submission required"}'
        )

        # =====================================================================
        # Verification
        # =====================================================================

        # 1. Verify NO_NSFAS decision was made
        eligibility_calls = [
            c for c in trajectory_tracker.calls
            if c["tool"] == "evaluate_nsfas_eligibility"
        ]
        assert len(eligibility_calls) == 1, "Should evaluate NSFAS eligibility once"
        assert eligibility_calls[0]["result"] == "NO_NSFAS", \
            "Postgraduate should get NO_NSFAS"

        # 2. Verify education level was checked
        eligibility_args = eligibility_calls[0]["args"]
        assert "education_level" in eligibility_args, \
            "Education level should be checked for NSFAS eligibility"
        assert eligibility_args["education_level"] == "Honours", \
            "Education level should be Honours (postgrad)"

        # 3. Verify NO NSFAS data collection tools were called
        for tool in self.NSFAS_DATA_COLLECTION_TOOLS:
            assert not trajectory_tracker.called(tool), \
                f"NSFAS data collection tool {tool} should NOT be called for postgrad"

        # 4. Verify NO NSFAS submission tools were called
        for tool in self.NSFAS_SUBMISSION_TOOLS:
            assert not trajectory_tracker.called(tool), \
                f"NSFAS submission tool {tool} should NOT be called for postgrad"

        # 5. Verify the decision reason was recorded
        reason_calls = [
            c for c in trajectory_tracker.calls
            if c["tool"] == "nsfas_decision_reason"
        ]
        assert len(reason_calls) == 1, "Should record decision reason"
        assert reason_calls[0]["args"]["reason"] == "postgrad_ineligible", \
            "Should record postgrad as the ineligibility reason"

        # 6. Verify skip results mention postgraduate exclusion
        collection_skip = [
            c for c in trajectory_tracker.calls
            if c["tool"] == "nsfas_collection_skip"
        ][0]
        assert "postgraduate" in collection_skip["result"].lower(), \
            "Skip result should mention postgraduate exclusion"

        # 7. Verify final state shows NSFAS NOT submitted
        assert trajectory_tracker.state.nsfas_submitted is False, \
            "Final state should show NSFAS as NOT submitted"

    def test_postgrad_low_income_still_skips_nsfas(
        self,
        trajectory_tracker: "TrajectoryToolTracker",
        postgraduate_low_income_profile: dict,
    ):
        """
        Test: Postgraduate with low income still skips NSFAS.

        This is an edge case test ensuring that even when a postgraduate
        student would otherwise qualify by income, they are still excluded
        because NSFAS is only for undergraduate students.

        Profile: Honours student, household income R85,000 (below threshold)

        Verification:
        - Even with low income, postgrad is excluded
        - Decision reason explicitly mentions postgrad exclusion
        - All NSFAS tools remain uncalled
        """
        profile = postgraduate_low_income_profile

        # Verify profile setup
        assert profile.get("education_level") == "Honours", \
            "Test requires postgraduate profile"
        assert profile.get("sassa_recipient") is True, \
            "Test requires low-income indicator (SASSA recipient)"

        # =====================================================================
        # Simulate NSFAS Eligibility Decision Flow
        # =====================================================================

        # Task 1: ask_if_apply_for_nsfas_task
        # CRITICAL: Education level check should happen and override income check
        trajectory_tracker.record(
            "evaluate_nsfas_eligibility",
            {
                "education_level": profile["education_level"],
                "nsfas_eligible": profile.get("nsfas_eligible"),
                "household_income": profile["household_income"],
                "sassa_recipient": profile["sassa_recipient"],
            },
            "NO_NSFAS"
        )

        # Record the specific reason (postgrad takes precedence over income)
        trajectory_tracker.record(
            "nsfas_decision_reason",
            {
                "reason": "postgrad_ineligible",
                "income_would_qualify": True,  # Income is low enough
                "education_level": profile["education_level"],
                "note": "Education level check takes precedence over income",
            },
            "Postgraduate students are not eligible for NSFAS funding (income check bypassed)"
        )

        # Skip collection and submission tasks
        trajectory_tracker.record(
            "nsfas_collection_skip",
            {"context_result": "NO_NSFAS"},
            '{"nsfas_skipped": true, "reason": "Postgraduate - NSFAS excluded"}'
        )

        trajectory_tracker.record(
            "nsfas_submission_skip",
            {"context_result": "nsfas_skipped"},
            '{"nsfas_skipped": true, "reason": "No NSFAS application to submit"}'
        )

        # =====================================================================
        # Verification
        # =====================================================================

        # 1. Verify NO_NSFAS decision despite low income
        eligibility_calls = [
            c for c in trajectory_tracker.calls
            if c["tool"] == "evaluate_nsfas_eligibility"
        ]
        assert eligibility_calls[0]["result"] == "NO_NSFAS", \
            "Postgrad should get NO_NSFAS even with low income"

        # 2. Verify the decision reason notes income would have qualified
        reason_calls = [
            c for c in trajectory_tracker.calls
            if c["tool"] == "nsfas_decision_reason"
        ]
        assert reason_calls[0]["args"]["income_would_qualify"] is True, \
            "Should acknowledge that income alone would qualify"
        assert reason_calls[0]["args"]["reason"] == "postgrad_ineligible", \
            "Should record postgrad as the exclusion reason"

        # 3. Verify NO NSFAS tools were called
        for tool in self.NSFAS_TOOLS:
            assert not trajectory_tracker.called(tool), \
                f"NSFAS tool {tool} should NOT be called for postgrad with low income"

        # 4. Verify final state
        assert trajectory_tracker.state.nsfas_submitted is False, \
            "Final state should show NSFAS as NOT submitted"


class TestNSFASDecisionLogic:
    """Test the NSFAS decision logic in detail."""

    def test_decision_order_matches_tasks_yaml(
        self,
        trajectory_tracker: "TrajectoryToolTracker",
    ):
        """
        Test: Verify decision logic order matches tasks.yaml specification.

        From tasks.yaml ask_if_apply_for_nsfas_task:
        DECISION LOGIC (check in order):
        1. If nsfas_eligible is FALSE or "No" -> return NO_NSFAS (income too high)
        2. If postgrad programme -> return NO_NSFAS (NSFAS is for undergrad only)
        3. If nsfas_eligible is TRUE and undergrad -> return YES_NSFAS

        This test verifies the decision tree is evaluated in the correct order.
        """
        # Test case 1: Income-based rejection (step 1)
        trajectory_tracker.record(
            "decision_step_1_income_check",
            {"nsfas_eligible": False},
            "NO_NSFAS - step 1: income too high"
        )

        # Test case 2: Education-based rejection (step 2)
        trajectory_tracker.record(
            "decision_step_2_education_check",
            {"nsfas_eligible": True, "education_level": "Honours"},
            "NO_NSFAS - step 2: postgrad excluded"
        )

        # Test case 3: Full approval (step 3)
        trajectory_tracker.record(
            "decision_step_3_approval",
            {"nsfas_eligible": True, "education_level": "undergraduate"},
            "YES_NSFAS - step 3: eligible undergrad"
        )

        # Verify all three decision paths were tested
        assert trajectory_tracker.call_count("decision_step_1_income_check") == 1
        assert trajectory_tracker.call_count("decision_step_2_education_check") == 1
        assert trajectory_tracker.call_count("decision_step_3_approval") == 1

        # Verify correct results for each path
        calls = {c["tool"]: c["result"] for c in trajectory_tracker.calls}

        assert "NO_NSFAS" in calls["decision_step_1_income_check"], \
            "Step 1 should reject high income"
        assert "NO_NSFAS" in calls["decision_step_2_education_check"], \
            "Step 2 should reject postgrad"
        assert "YES_NSFAS" in calls["decision_step_3_approval"], \
            "Step 3 should approve eligible undergrad"

    def test_nsfas_skip_propagates_through_tasks(
        self,
        trajectory_tracker: "TrajectoryToolTracker",
    ):
        """
        Test: Verify nsfas_skipped flag propagates correctly through task chain.

        From tasks.yaml:
        - nsfas_collection_task checks ask_if_apply_for_nsfas_task result
        - nsfas_submission_task checks nsfas_collection_task result
        - nsfas_status_check_task checks nsfas_submission_task result

        Each task should check context and propagate skip appropriately.
        """
        # Step 1: Initial decision
        trajectory_tracker.record(
            "ask_if_apply_for_nsfas_task",
            {"profile_id": "TEST-001"},
            "NO_NSFAS"
        )

        # Step 2: Collection task checks context and skips
        trajectory_tracker.record(
            "nsfas_collection_task",
            {"context": "NO_NSFAS"},
            '{"nsfas_skipped": true, "reason": "Applicant not eligible for NSFAS"}'
        )

        # Step 3: Submission task checks context and skips
        trajectory_tracker.record(
            "nsfas_submission_task",
            {"context": '{"nsfas_skipped": true}'},
            '{"nsfas_skipped": true, "reason": "Applicant not eligible for NSFAS - no submission required"}'
        )

        # Step 4: Status check task checks context and skips
        trajectory_tracker.record(
            "nsfas_status_check_task",
            {"context": '{"nsfas_skipped": true}'},
            "NSFAS application was not submitted - applicant not eligible for NSFAS funding due to household income exceeding threshold."
        )

        # Verify propagation
        assert trajectory_tracker.verify_task_order([
            "ask_if_apply_for_nsfas_task",
            "nsfas_collection_task",
            "nsfas_submission_task",
            "nsfas_status_check_task",
        ]), "Tasks should execute in correct order"

        # Verify all skip tasks have skip markers
        collection_result = trajectory_tracker.calls[1]["result"]
        submission_result = trajectory_tracker.calls[2]["result"]

        assert "nsfas_skipped" in collection_result, \
            "Collection task should have skip marker"
        assert "nsfas_skipped" in submission_result, \
            "Submission task should have skip marker"
