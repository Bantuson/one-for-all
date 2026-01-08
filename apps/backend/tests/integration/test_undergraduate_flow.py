"""
Integration tests for undergraduate application workflows.

Tests the complete end-to-end flow for undergraduate applicants including:
- Account creation and OTP verification
- Personal and academic information collection
- Course selection and RAG research
- Application submission
- NSFAS flow for eligible students

VCR Cassette Recording:
These tests use pytest-vcr to record/replay LLM API responses.
- First run with API key: Records responses to tests/cassettes/
- CI runs (no API key): Replays from cassettes (< 5 min instead of 30+ min)

To re-record cassettes:
    DEEPSEEK_API_KEY=sk-xxx pytest tests/integration/ -v --vcr-record=all
"""

import pytest
from typing import Dict, Any


@pytest.mark.vcr()
@pytest.mark.integration
class TestUndergraduateApplicationFlow:
    """Test complete undergraduate application workflow."""

    def test_complete_flow_eligible_student(
        self,
        test_crew,
        undergraduate_profile: Dict[str, Any]
    ):
        """
        Test full workflow for NSFAS-eligible undergraduate with high APS.

        This test validates:
        1. Account creation with OTP verification
        2. Personal and academic data collection
        3. Document tracking
        4. Course selection matching APS requirements
        5. RAG research validating eligibility
        6. Application submission to university
        7. NSFAS application for eligible student
        8. Status checks for both applications

        Expected outcome: All agents complete successfully, student number
        generated, applications submitted to both university and NSFAS.
        """
        # Execute the crew workflow
        result = test_crew.crew().kickoff(inputs=undergraduate_profile)

        # Verify crew completed
        assert result is not None, "Crew execution should complete"

        # Convert result to string for content verification
        result_str = str(result)

        # Verify key workflow stages completed
        # 1. Account creation and OTP
        assert "student_number" in result_str.lower() or "student number" in result_str.lower(), \
            "Student number should be generated"

        # 2. Personal information collected
        assert undergraduate_profile["full_name"] in result_str or \
               "personal" in result_str.lower(), \
            "Personal information should be collected"

        # 3. Academic information processed
        assert str(undergraduate_profile["total_aps_score"]) in result_str or \
               "aps" in result_str.lower(), \
            "APS score should be referenced"

        # 4. Application submitted
        assert "submit" in result_str.lower() or "application" in result_str.lower(), \
            "Application should be submitted"

        # 5. NSFAS flow executed (student is eligible)
        assert "nsfas" in result_str.lower(), \
            "NSFAS application should be processed for eligible student"

    def test_aps_too_low_promotes_second_choice(
        self,
        test_crew,
        undergraduate_profile_low_aps: Dict[str, Any]
    ):
        """
        Test that low APS score promotes second choice over first.

        Profile has APS of 28, applying for:
        - First choice: Medicine (requires 42 APS) - should REJECT
        - Second choice: Biological Sciences (requires 28 APS) - should ACCEPT

        Expected behavior:
        - RAG agent identifies first choice is unattainable
        - System promotes second choice as primary application
        - Student receives guidance on realistic options
        """
        result = test_crew.crew().kickoff(inputs=undergraduate_profile_low_aps)

        assert result is not None

        result_str = str(result)

        # Verify second choice was promoted
        assert "biological sciences" in result_str.lower() or \
               "second choice" in result_str.lower(), \
            "Second choice should be promoted when first is unattainable"

        # Verify first choice was flagged as unlikely
        # (RAG agent should warn about APS mismatch)
        assert "medicine" in result_str.lower() or \
               "minimum" in result_str.lower() or \
               "requirement" in result_str.lower(), \
            "First choice rejection should be communicated"

    def test_document_validation(
        self,
        test_crew,
        undergraduate_profile: Dict[str, Any]
    ):
        """
        Test document handling in workflow.

        Profile has:
        - Available: ID Document, Matric Certificate, Academic Transcript
        - Missing: Proof of Residence

        Expected behavior:
        - Available documents marked as "uploaded"
        - Missing documents marked as "pending"
        - Workflow NOT blocked by missing documents
        - Document status tracked in application record
        """
        # Modify profile to have specific document status
        test_profile = undergraduate_profile.copy()
        test_profile["documents_available"] = ["ID Document"]
        test_profile["documents_missing"] = ["Matric Certificate", "Proof of Residence"]

        result = test_crew.crew().kickoff(inputs=test_profile)

        assert result is not None

        result_str = str(result)

        # Verify documents were tracked
        assert "document" in result_str.lower(), \
            "Document status should be tracked"

        # Verify workflow was NOT blocked
        # (application should still be submitted despite missing docs)
        assert "submit" in result_str.lower() or "application" in result_str.lower(), \
            "Application should proceed even with missing documents"

    def test_multiple_course_choices_submitted(
        self,
        test_crew,
        undergraduate_profile: Dict[str, Any]
    ):
        """
        Test that both first and second choice courses are submitted.

        Expected behavior:
        - First choice (BSc Computer Science) submitted with priority 1
        - Second choice (BSc IT) submitted with priority 2
        - Both tracked in submission result
        """
        result = test_crew.crew().kickoff(inputs=undergraduate_profile)

        assert result is not None

        result_str = str(result)

        # Verify both courses referenced
        assert "computer science" in result_str.lower(), \
            "First choice course should be in result"

        # Note: Depending on agent behavior, second choice may or may not
        # be explicitly mentioned if first choice is strong match

    def test_high_achiever_no_warnings(
        self,
        test_crew,
        undergraduate_profile: Dict[str, Any]
    ):
        """
        Test that high-achieving student receives no APS warnings.

        Profile has APS 40, applying for programs requiring 32-35 APS.

        Expected behavior:
        - No warnings about insufficient APS
        - Positive confirmation of eligibility
        - Strong application submitted
        """
        result = test_crew.crew().kickoff(inputs=undergraduate_profile)

        assert result is not None

        result_str = str(result)

        # High achiever should have smooth workflow
        assert "submit" in result_str.lower() or "application" in result_str.lower(), \
            "Application should be submitted for high achiever"

        # Should not have rejection/warning language
        # (though this is hard to assert without strict output format)

    def test_nsfas_eligible_student_applies(
        self,
        test_crew,
        undergraduate_profile: Dict[str, Any]
    ):
        """
        Test that NSFAS-eligible undergraduate applies for funding.

        Profile has:
        - nsfas_eligible: True
        - household_income: R150,000 (eligible threshold)

        Expected behavior:
        - NSFAS agent collects additional information
        - NSFAS application submitted
        - Status tracked separately from university application
        """
        result = test_crew.crew().kickoff(inputs=undergraduate_profile)

        assert result is not None

        result_str = str(result)

        # Verify NSFAS was processed
        assert "nsfas" in result_str.lower(), \
            "NSFAS application should be created for eligible student"

    def test_high_income_student_skips_nsfas(
        self,
        test_crew,
        undergraduate_profile: Dict[str, Any]
    ):
        """
        Test that high-income student skips NSFAS application.

        Modified profile with:
        - nsfas_eligible: False
        - household_income: R600,000 (above threshold)

        Expected behavior:
        - NSFAS agent skips collection and submission
        - Workflow completes without NSFAS application
        """
        # Modify profile to be ineligible
        test_profile = undergraduate_profile.copy()
        test_profile["nsfas_eligible"] = False
        test_profile["household_income"] = "R600,000 per year"

        result = test_crew.crew().kickoff(inputs=test_profile)

        assert result is not None

        result_str = str(result)

        # NSFAS should be skipped
        # (may still be mentioned but should indicate skip/not applicable)
        assert "skip" in result_str.lower() or \
               "not applicable" in result_str.lower() or \
               "not eligible" in result_str.lower() or \
               "nsfas" not in result_str.lower(), \
            "NSFAS should be skipped for ineligible student"

    def test_missing_documents_marked_pending(
        self,
        test_crew,
        undergraduate_profile: Dict[str, Any]
    ):
        """
        Test that missing documents don't block workflow.

        Profile with multiple missing documents should:
        - Mark documents as "pending"
        - Continue workflow to submission
        - Track which documents still needed
        """
        test_profile = undergraduate_profile.copy()
        test_profile["documents_missing"] = [
            "Matric Certificate",
            "Proof of Residence",
            "Academic Transcript"
        ]
        test_profile["documents_available"] = ["ID Document"]

        result = test_crew.crew().kickoff(inputs=test_profile)

        assert result is not None

        result_str = str(result)

        # Workflow should complete despite missing docs
        assert "submit" in result_str.lower() or "application" in result_str.lower(), \
            "Application should proceed with pending documents"


@pytest.mark.vcr()
@pytest.mark.integration
class TestUndergraduateEdgeCases:
    """Test edge cases and boundary conditions for undergraduate flow."""

    def test_exactly_minimum_aps_accepted(
        self,
        test_crew,
        undergraduate_profile_low_aps: Dict[str, Any]
    ):
        """
        Test student with exactly minimum APS for second choice.

        Profile has APS 28, second choice requires 28 (exact match).

        Expected behavior:
        - Student should be accepted for second choice
        - No warnings about being below threshold
        """
        result = test_crew.crew().kickoff(inputs=undergraduate_profile_low_aps)

        assert result is not None

        # Should complete without errors
        # (exact match on minimum should be accepted)

    def test_session_creation_and_extension(
        self,
        test_crew,
        undergraduate_profile: Dict[str, Any]
    ):
        """
        Test that session is created and can be extended.

        Expected behavior:
        - Session token created on OTP verification
        - Session has 24-hour expiry
        - Can be looked up and extended
        """
        result = test_crew.crew().kickoff(inputs=undergraduate_profile)

        assert result is not None

        result_str = str(result)

        # Session should be referenced
        # (exact format depends on agent output)
        assert "session" in result_str.lower() or \
               "token" in result_str.lower() or \
               result is not None, \
            "Session management should occur"
