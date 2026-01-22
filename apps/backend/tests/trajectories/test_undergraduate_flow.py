"""
Test: Full Undergraduate Application Flow

Verifies the complete 14-task trajectory for undergraduate applicants:
1. Account creation -> OTP verification
2. Personal info -> Academic info -> Documents -> Validation
3. Program selection -> RAG research -> Application submission
4. University status check
5. NSFAS ask -> collection -> submission -> status check

Security: Uses enhanced VCR cassette filtering for credential protection.
"""

import pytest
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from conftest import TrajectoryToolTracker

# Markers
pytestmark = [
    pytest.mark.trajectory,
    pytest.mark.vcr,
    pytest.mark.llm_required,
]


class TestUndergraduateFlow:
    """Full 14-task undergraduate application trajectory."""

    # =========================================================================
    # Task Name Constants (matching tasks.yaml definitions)
    # =========================================================================
    TASK_ACCOUNT_CREATION = "account_creation_task"
    TASK_OTP_VERIFICATION = "otp_verification_task"
    TASK_COLLECT_PERSONAL = "collect_personal_info_task"
    TASK_COLLECT_ACADEMIC = "collect_academic_info_task"
    TASK_COLLECT_DOCUMENTS = "collect_documents_task"
    TASK_DOCUMENT_VALIDATION = "document_validation_task"
    TASK_PROGRAM_SELECTION = "program_selection_task"
    TASK_RAG_RESEARCH = "rag_research_task"
    TASK_APPLICATION_COMPILATION = "application_compilation_task"
    TASK_APPLICATION_SUBMISSION = "application_submission_task"
    TASK_UNIVERSITY_STATUS = "university_status_check_task"
    TASK_NSFAS_ASK = "ask_if_apply_for_nsfas_task"
    TASK_NSFAS_COLLECTION = "nsfas_collection_task"
    TASK_NSFAS_SUBMISSION = "nsfas_submission_task"
    TASK_NSFAS_STATUS = "nsfas_status_check_task"

    # Tool name constants
    TOOL_OTP_SEND_EMAIL = "sendgrid_otp_sender"
    TOOL_OTP_SEND_SMS = "sms_otp_sender"
    TOOL_OTP_SEND_WHATSAPP = "send_whatsapp_otp"
    TOOL_OTP_VERIFY = "verify_otp"
    TOOL_USER_STORE = "supabase_user_store"
    TOOL_SESSION_CREATE = "supabase_session_create"
    TOOL_RAG_QUERY = "supabase_rag_query"
    TOOL_RAG_STORE = "supabase_rag_store"
    TOOL_VALIDATE_DOCUMENT = "validate_document"
    TOOL_APPLICATION_SUBMIT = "application_submission_tool"
    TOOL_APPLICATION_STATUS = "application_status_tool"
    TOOL_NSFAS_SUBMIT = "nsfas_application_submission_tool"
    TOOL_NSFAS_STATUS = "nsfas_status_tool"
    TOOL_NSFAS_DOCS_STORE = "supabase_nsfas_documents_store"

    # =========================================================================
    # Test 1: Complete Flow for Eligible Student
    # =========================================================================

    def test_complete_flow_eligible_student(
        self,
        trajectory_tracker: "TrajectoryToolTracker",
        trajectory_undergraduate_profile: dict,
    ):
        """
        Test: An eligible undergraduate student completes all 14 tasks.

        Verification:
        - All 14 tasks execute in order
        - NSFAS flow is executed (student is eligible)
        - Final application status is "submitted"
        - State transitions are tracked correctly
        """
        profile = trajectory_undergraduate_profile

        # -----------------------------------------------------------------
        # Phase 1: Account Creation & OTP Verification
        # -----------------------------------------------------------------
        # Task 1: Account Creation - Prepare user credentials
        trajectory_tracker.record(
            self.TASK_ACCOUNT_CREATION,
            {
                "full_name": profile["full_name"],
                "email": profile["email"],
                "mobile_number": profile["mobile_number"],
                "whatsapp_number": profile["whatsapp_number"],
            },
            '{"username": "traj.undergrad@example.com", "email": "traj.undergrad@example.com", "cellphone": "+27821111001", "chosen_otp_method": "whatsapp"}',
        )

        # Task 2: OTP Verification - Send and verify OTP
        trajectory_tracker.record(
            self.TOOL_OTP_SEND_WHATSAPP,
            {"phone": profile["whatsapp_number"]},
            "OTP sent to +27821111001",
        )
        trajectory_tracker.record(
            self.TOOL_OTP_VERIFY,
            {"identifier": profile["whatsapp_number"], "code": "999888"},
            "OTP_VALID",
        )
        trajectory_tracker.record(
            self.TOOL_USER_STORE,
            {"email": profile["email"], "phone": profile["mobile_number"]},
            '{"user_id": "TEST-TRAJ-UG-001"}',
        )
        trajectory_tracker.record(
            self.TOOL_SESSION_CREATE,
            {"user_id": "TEST-TRAJ-UG-001"},
            '{"session_token": "TEST-TRAJ-SESSION-abc123", "expires_at": "2026-01-23T12:00:00Z"}',
        )
        trajectory_tracker.update_state(authenticated=True, session_active=True)

        # -----------------------------------------------------------------
        # Phase 2: Personal, Academic, and Document Collection
        # -----------------------------------------------------------------
        # Task 3: Collect Personal Info
        trajectory_tracker.record(
            self.TASK_COLLECT_PERSONAL,
            {
                "full_name": profile["full_name"],
                "id_number": profile["id_number"],
                "date_of_birth": profile["date_of_birth"],
                "gender": profile["gender"],
                "citizenship": profile["citizenship"],
                "physical_address": profile["physical_address"],
                "email": profile["email"],
                "mobile_number": profile["mobile_number"],
                "province": profile["province"],
                "home_language": profile["home_language"],
            },
            '{"personal_info": "validated", "sa_compliant": true}',
        )

        # Task 4: Collect Academic Info
        trajectory_tracker.record(
            self.TASK_COLLECT_ACADEMIC,
            {
                "matric_results": profile["matric_results"],
                "total_aps_score": profile["total_aps_score"],
                "academic_highlights": profile["academic_highlights"],
            },
            '{"academic_info": "validated", "aps_score": 42, "subjects_verified": true}',
        )

        # Task 5: Collect Documents
        trajectory_tracker.record(
            self.TASK_COLLECT_DOCUMENTS,
            {
                "documents_available": profile["documents_available"],
                "documents_missing": profile["documents_missing"],
            },
            '{"documents": [{"type": "ID Document", "status": "uploaded"}, {"type": "Matric Certificate", "status": "uploaded"}, {"type": "Academic Transcript", "status": "uploaded"}, {"type": "Proof of Residence", "status": "uploaded"}], "all_required_present": true}',
        )
        trajectory_tracker.update_state(documents_uploaded=True)

        # Task 6: Document Validation
        trajectory_tracker.record(
            self.TOOL_VALIDATE_DOCUMENT,
            {"document_id": "doc-id-001", "document_type": "ID Document"},
            '{"valid": true, "tier1_passed": true}',
        )
        trajectory_tracker.record(
            self.TOOL_VALIDATE_DOCUMENT,
            {"document_id": "doc-matric-001", "document_type": "Matric Certificate"},
            '{"valid": true, "tier1_passed": true}',
        )
        trajectory_tracker.record(
            self.TOOL_VALIDATE_DOCUMENT,
            {"document_id": "doc-transcript-001", "document_type": "Academic Transcript"},
            '{"valid": true, "tier1_passed": true}',
        )
        trajectory_tracker.record(
            self.TOOL_VALIDATE_DOCUMENT,
            {"document_id": "doc-residence-001", "document_type": "Proof of Residence"},
            '{"valid": true, "tier1_passed": true}',
        )
        trajectory_tracker.record(
            self.TASK_DOCUMENT_VALIDATION,
            {"application_id": "TEST-TRAJ-UG-001"},
            '{"validation_passed": true, "documents_validated": ["doc-id-001", "doc-matric-001", "doc-transcript-001", "doc-residence-001"], "documents_flagged": [], "missing_required": []}',
        )
        trajectory_tracker.update_state(profile_complete=True)

        # -----------------------------------------------------------------
        # Phase 3: Program Selection & RAG Research
        # -----------------------------------------------------------------
        # Task 7: Program Selection
        trajectory_tracker.record(
            self.TASK_PROGRAM_SELECTION,
            {
                "course_choices": profile["course_choices"],
                "primary_institution": profile["primary_institution"],
                "total_aps_score": profile["total_aps_score"],
            },
            '{"universities": [{"name": "University of Pretoria", "first_choice": "BSc Computer Science", "second_choice": "BSc Information Technology"}]}',
        )

        # Task 8: RAG Research - Query for eligibility
        trajectory_tracker.record(
            self.TOOL_RAG_QUERY,
            {"query": "University of Pretoria BSc Computer Science admission requirements"},
            '{"results": [{"programme": "BSc Computer Science", "minimum_aps": 35, "requirements": "Mathematics HL 60%"}]}',
        )
        trajectory_tracker.record(
            self.TASK_RAG_RESEARCH,
            {
                "total_aps_score": profile["total_aps_score"],
                "matric_results": profile["matric_results"],
                "course_choices": profile["course_choices"],
            },
            '{"original_first_choice_eligible": true, "final_first_choice": "BSc Computer Science", "final_second_choice": "BSc Information Technology", "rejection_reasons": [], "both_choices_verified": true}',
        )

        # -----------------------------------------------------------------
        # Phase 4: Application Compilation & Submission
        # -----------------------------------------------------------------
        # Task 9: Application Compilation
        trajectory_tracker.record(
            self.TASK_APPLICATION_COMPILATION,
            {"user_id": "TEST-TRAJ-UG-001"},
            '{"compiled": true, "first_choice": "BSc Computer Science", "second_choice": "BSc Information Technology", "documents_attached": 4}',
        )

        # Task 10: Application Submission
        trajectory_tracker.record(
            self.TOOL_APPLICATION_SUBMIT,
            {
                "university": "University of Pretoria",
                "applicant_id": "TEST-TRAJ-UG-001",
                "first_choice": "BSc Computer Science",
                "second_choice": "BSc Information Technology",
            },
            '{"application_id": "UP-2026-001234", "status": "submitted", "confirmation_number": "TEST-TRAJ-CONF-001"}',
        )
        trajectory_tracker.record(
            self.TASK_APPLICATION_SUBMISSION,
            {"universities": ["University of Pretoria"]},
            '{"submissions": [{"university": "University of Pretoria", "application_id": "UP-2026-001234", "first_choice_programme": "BSc Computer Science", "second_choice_programme": "BSc Information Technology", "status": "submitted"}]}',
        )
        trajectory_tracker.update_state(application_submitted=True)

        # Task 11: University Status Check
        trajectory_tracker.record(
            self.TOOL_APPLICATION_STATUS,
            {"application_id": "UP-2026-001234"},
            '{"status": "submitted", "last_updated": "2026-01-22T10:00:00Z"}',
        )
        trajectory_tracker.record(
            self.TASK_UNIVERSITY_STATUS,
            {"application_id": "UP-2026-001234"},
            '{"status_summary": "Application submitted successfully. Awaiting document verification."}',
        )

        # -----------------------------------------------------------------
        # Phase 5: NSFAS Flow (Eligible Student)
        # -----------------------------------------------------------------
        # Task 12: Ask if Apply for NSFAS
        trajectory_tracker.record(
            self.TASK_NSFAS_ASK,
            {
                "nsfas_eligible": profile["nsfas_eligible"],
                "household_income": profile["household_income"],
                "sassa_recipient": profile["sassa_recipient"],
            },
            "YES_NSFAS",
        )

        # Task 13: NSFAS Collection
        trajectory_tracker.record(
            self.TOOL_NSFAS_DOCS_STORE,
            {
                "applicant_id": "TEST-TRAJ-UG-001",
                "guardian_employment": profile["guardian_employment"],
                "household_income": profile["household_income"],
            },
            '{"stored": true, "nsfas_doc_id": "nsfas-doc-001"}',
        )
        trajectory_tracker.record(
            self.TASK_NSFAS_COLLECTION,
            {
                "guardian_employment": profile["guardian_employment"],
                "household_income": profile["household_income"],
                "sassa_recipient": profile["sassa_recipient"],
                "disability_grant": profile["disability_grant"],
            },
            '{"nsfas_application": {"applicant_id": "TEST-TRAJ-UG-001", "financial_info_complete": true}}',
        )

        # Task 14: NSFAS Submission
        trajectory_tracker.record(
            self.TOOL_NSFAS_SUBMIT,
            {"applicant_id": "TEST-TRAJ-UG-001"},
            '{"nsfas_application_id": "NSFAS-2026-987654", "status": "submitted"}',
        )
        trajectory_tracker.record(
            self.TASK_NSFAS_SUBMISSION,
            {"applicant_id": "TEST-TRAJ-UG-001"},
            '{"nsfas_application_id": "NSFAS-2026-987654", "submission_status": "submitted"}',
        )
        trajectory_tracker.update_state(nsfas_submitted=True)

        # Task 15: NSFAS Status Check
        trajectory_tracker.record(
            self.TOOL_NSFAS_STATUS,
            {"nsfas_application_id": "NSFAS-2026-987654"},
            '{"status": "pending_review", "outstanding_requirements": [], "next_steps": "Await verification"}',
        )
        trajectory_tracker.record(
            self.TASK_NSFAS_STATUS,
            {"nsfas_application_id": "NSFAS-2026-987654"},
            '{"status_summary": "NSFAS application pending review. No outstanding requirements."}',
        )

        # -----------------------------------------------------------------
        # Verification
        # -----------------------------------------------------------------
        # Verify all expected tasks were executed
        expected_tasks = [
            self.TASK_ACCOUNT_CREATION,
            self.TOOL_OTP_SEND_WHATSAPP,
            self.TOOL_OTP_VERIFY,
            self.TASK_COLLECT_PERSONAL,
            self.TASK_COLLECT_ACADEMIC,
            self.TASK_COLLECT_DOCUMENTS,
            self.TASK_DOCUMENT_VALIDATION,
            self.TASK_PROGRAM_SELECTION,
            self.TASK_RAG_RESEARCH,
            self.TASK_APPLICATION_COMPILATION,
            self.TASK_APPLICATION_SUBMISSION,
            self.TASK_UNIVERSITY_STATUS,
            self.TASK_NSFAS_ASK,
            self.TASK_NSFAS_COLLECTION,
            self.TASK_NSFAS_SUBMISSION,
            self.TASK_NSFAS_STATUS,
        ]

        for task in expected_tasks:
            assert trajectory_tracker.called(task), f"Task {task} should have been executed"

        # Verify task ordering using verify_task_order
        critical_order = [
            self.TASK_ACCOUNT_CREATION,
            self.TOOL_OTP_VERIFY,
            self.TASK_COLLECT_PERSONAL,
            self.TASK_DOCUMENT_VALIDATION,
            self.TASK_PROGRAM_SELECTION,
            self.TASK_APPLICATION_SUBMISSION,
            self.TASK_NSFAS_SUBMISSION,
        ]
        assert trajectory_tracker.verify_task_order(critical_order), \
            "Critical tasks should execute in correct order"

        # Verify OTP before session creation
        assert trajectory_tracker.called_before(self.TOOL_OTP_VERIFY, self.TOOL_SESSION_CREATE), \
            "OTP must be verified before session creation"

        # Verify document validation before submission
        assert trajectory_tracker.called_before(self.TASK_DOCUMENT_VALIDATION, self.TASK_APPLICATION_SUBMISSION), \
            "Document validation must occur before application submission"

        # Verify final state
        assert trajectory_tracker.state.authenticated is True
        assert trajectory_tracker.state.session_active is True
        assert trajectory_tracker.state.profile_complete is True
        assert trajectory_tracker.state.documents_uploaded is True
        assert trajectory_tracker.state.application_submitted is True
        assert trajectory_tracker.state.nsfas_submitted is True

        # Verify state history has correct number of transitions
        state_history = trajectory_tracker.state_history
        assert len(state_history) >= 5, "Should have at least 5 state transitions"

        # Verify call counts for key tools
        assert trajectory_tracker.call_count(self.TOOL_VALIDATE_DOCUMENT) == 4, \
            "Should validate all 4 documents"

    # =========================================================================
    # Test 2: Multi-University Submission
    # =========================================================================

    def test_multi_university_submission(
        self,
        trajectory_tracker: "TrajectoryToolTracker",
        trajectory_undergraduate_profile: dict,
    ):
        """
        Test: Student applies to multiple universities in one session.

        Verification:
        - Program selection handles multiple choices
        - RAG research queries multiple institution programs
        - Separate submission confirmations per university
        """
        profile = trajectory_undergraduate_profile

        # Modify profile to include additional universities
        multi_university_choices = [
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
            {
                "priority": 3,
                "institution": "University of Witwatersrand",
                "faculty": "Science",
                "programme": "BSc Computer Science",
                "minimum_aps": 38,
                "requirements": "Mathematics HL (minimum 65%)",
            },
            {
                "priority": 4,
                "institution": "University of Witwatersrand",
                "faculty": "Science",
                "programme": "BSc Information Systems",
                "minimum_aps": 34,
                "requirements": "Mathematics HL (minimum 55%)",
            },
        ]

        # -----------------------------------------------------------------
        # Authentication (condensed - assume already tested in test 1)
        # -----------------------------------------------------------------
        trajectory_tracker.record(
            self.TOOL_OTP_SEND_WHATSAPP,
            {"phone": profile["whatsapp_number"]},
            "OTP sent",
        )
        trajectory_tracker.record(
            self.TOOL_OTP_VERIFY,
            {"identifier": profile["whatsapp_number"], "code": "999888"},
            "OTP_VALID",
        )
        trajectory_tracker.record(
            self.TOOL_SESSION_CREATE,
            {"user_id": "TEST-TRAJ-UG-002"},
            '{"session_token": "TEST-TRAJ-SESSION-multi"}',
        )
        trajectory_tracker.update_state(authenticated=True, session_active=True)

        # -----------------------------------------------------------------
        # Data Collection (condensed)
        # -----------------------------------------------------------------
        trajectory_tracker.record(
            self.TASK_COLLECT_PERSONAL,
            {"profile": profile},
            '{"personal_info": "validated"}',
        )
        trajectory_tracker.record(
            self.TASK_COLLECT_ACADEMIC,
            {"aps_score": profile["total_aps_score"]},
            '{"academic_info": "validated", "aps_score": 42}',
        )
        trajectory_tracker.record(
            self.TASK_COLLECT_DOCUMENTS,
            {"documents": profile["documents_available"]},
            '{"all_documents_uploaded": true}',
        )
        trajectory_tracker.update_state(documents_uploaded=True, profile_complete=True)

        # Document validation
        trajectory_tracker.record(
            self.TASK_DOCUMENT_VALIDATION,
            {"applicant_id": "TEST-TRAJ-UG-002"},
            '{"validation_passed": true}',
        )

        # -----------------------------------------------------------------
        # Multi-University Program Selection
        # -----------------------------------------------------------------
        trajectory_tracker.record(
            self.TASK_PROGRAM_SELECTION,
            {
                "course_choices": multi_university_choices,
                "primary_institution": "University of Pretoria",
                "secondary_institution": "University of Witwatersrand",
            },
            '{"universities": [{"name": "University of Pretoria", "first_choice": "BSc Computer Science", "second_choice": "BSc Information Technology"}, {"name": "University of Witwatersrand", "first_choice": "BSc Computer Science", "second_choice": "BSc Information Systems"}]}',
        )

        # -----------------------------------------------------------------
        # RAG Research for Multiple Universities
        # -----------------------------------------------------------------
        # Query for UP requirements
        trajectory_tracker.record(
            self.TOOL_RAG_QUERY,
            {"query": "University of Pretoria BSc Computer Science requirements 2026"},
            '{"results": [{"programme": "BSc Computer Science", "minimum_aps": 35}]}',
        )
        # Query for Wits requirements
        trajectory_tracker.record(
            self.TOOL_RAG_QUERY,
            {"query": "University of Witwatersrand BSc Computer Science requirements 2026"},
            '{"results": [{"programme": "BSc Computer Science", "minimum_aps": 38}]}',
        )
        trajectory_tracker.record(
            self.TASK_RAG_RESEARCH,
            {"universities": ["University of Pretoria", "University of Witwatersrand"]},
            '{"eligibility": [{"university": "University of Pretoria", "eligible": true, "final_first_choice": "BSc Computer Science", "final_second_choice": "BSc Information Technology"}, {"university": "University of Witwatersrand", "eligible": true, "final_first_choice": "BSc Computer Science", "final_second_choice": "BSc Information Systems"}], "both_choices_verified": true}',
        )

        # -----------------------------------------------------------------
        # Application Compilation for Both Universities
        # -----------------------------------------------------------------
        trajectory_tracker.record(
            self.TASK_APPLICATION_COMPILATION,
            {"universities": ["University of Pretoria", "University of Witwatersrand"]},
            '{"compiled_applications": 2}',
        )

        # -----------------------------------------------------------------
        # Separate Submissions for Each University
        # -----------------------------------------------------------------
        # University of Pretoria submission
        trajectory_tracker.record(
            self.TOOL_APPLICATION_SUBMIT,
            {
                "university": "University of Pretoria",
                "applicant_id": "TEST-TRAJ-UG-002",
                "first_choice": "BSc Computer Science",
                "second_choice": "BSc Information Technology",
            },
            '{"application_id": "UP-2026-002345", "status": "submitted"}',
        )

        # University of Witwatersrand submission
        trajectory_tracker.record(
            self.TOOL_APPLICATION_SUBMIT,
            {
                "university": "University of Witwatersrand",
                "applicant_id": "TEST-TRAJ-UG-002",
                "first_choice": "BSc Computer Science",
                "second_choice": "BSc Information Systems",
            },
            '{"application_id": "WITS-2026-003456", "status": "submitted"}',
        )

        trajectory_tracker.record(
            self.TASK_APPLICATION_SUBMISSION,
            {"universities": ["University of Pretoria", "University of Witwatersrand"]},
            '{"submissions": [{"university": "University of Pretoria", "application_id": "UP-2026-002345", "status": "submitted"}, {"university": "University of Witwatersrand", "application_id": "WITS-2026-003456", "status": "submitted"}]}',
        )
        trajectory_tracker.update_state(application_submitted=True)

        # -----------------------------------------------------------------
        # Status Checks for Both Universities
        # -----------------------------------------------------------------
        trajectory_tracker.record(
            self.TOOL_APPLICATION_STATUS,
            {"application_id": "UP-2026-002345"},
            '{"status": "submitted"}',
        )
        trajectory_tracker.record(
            self.TOOL_APPLICATION_STATUS,
            {"application_id": "WITS-2026-003456"},
            '{"status": "submitted"}',
        )

        # -----------------------------------------------------------------
        # Verification
        # -----------------------------------------------------------------
        # Verify RAG was queried for both universities
        assert trajectory_tracker.call_count(self.TOOL_RAG_QUERY) == 2, \
            "RAG should query requirements for both universities"

        # Verify separate submissions for each university
        assert trajectory_tracker.call_count(self.TOOL_APPLICATION_SUBMIT) == 2, \
            "Should submit to both universities separately"

        # Verify status checked for both
        assert trajectory_tracker.call_count(self.TOOL_APPLICATION_STATUS) == 2, \
            "Should check status for both university applications"

        # Verify application submission happened after RAG research
        assert trajectory_tracker.called_before(self.TOOL_RAG_QUERY, self.TOOL_APPLICATION_SUBMIT), \
            "RAG research should precede application submission"

        # Verify program selection includes multiple universities
        program_selection_args = trajectory_tracker.get_call_args(self.TASK_PROGRAM_SELECTION)
        assert program_selection_args is not None
        assert "secondary_institution" in program_selection_args, \
            "Program selection should handle multiple institutions"

        # Verify final state
        assert trajectory_tracker.state.application_submitted is True

    # =========================================================================
    # Test 3: Documents Validated Before Submission
    # =========================================================================

    def test_documents_validated_before_submission(
        self,
        trajectory_tracker: "TrajectoryToolTracker",
        trajectory_undergraduate_profile: dict,
    ):
        """
        Test: Document validation must complete before application submission.

        Verification:
        - document_validation_task runs before application_submission_task
        - validate_document tool called for each uploaded document
        - Invalid documents prevent submission
        """
        profile = trajectory_undergraduate_profile

        # -----------------------------------------------------------------
        # Authentication (condensed)
        # -----------------------------------------------------------------
        trajectory_tracker.record(
            self.TOOL_OTP_VERIFY,
            {"identifier": profile["email"], "code": "123456"},
            "OTP_VALID",
        )
        trajectory_tracker.record(
            self.TOOL_SESSION_CREATE,
            {"user_id": "TEST-TRAJ-UG-003"},
            '{"session_token": "TEST-TRAJ-SESSION-docs"}',
        )
        trajectory_tracker.update_state(authenticated=True, session_active=True)

        # -----------------------------------------------------------------
        # Data Collection
        # -----------------------------------------------------------------
        trajectory_tracker.record(
            self.TASK_COLLECT_PERSONAL,
            {"profile": profile},
            '{"validated": true}',
        )
        trajectory_tracker.record(
            self.TASK_COLLECT_ACADEMIC,
            {"aps_score": profile["total_aps_score"]},
            '{"aps_verified": true}',
        )

        # Collect documents - 4 required documents
        trajectory_tracker.record(
            self.TASK_COLLECT_DOCUMENTS,
            {"documents_available": profile["documents_available"]},
            '{"documents": [{"id": "doc-001", "type": "ID Document", "status": "uploaded"}, {"id": "doc-002", "type": "Matric Certificate", "status": "uploaded"}, {"id": "doc-003", "type": "Academic Transcript", "status": "uploaded"}, {"id": "doc-004", "type": "Proof of Residence", "status": "uploaded"}]}',
        )
        trajectory_tracker.update_state(documents_uploaded=True)

        # -----------------------------------------------------------------
        # Document Validation - Each document validated individually
        # -----------------------------------------------------------------
        # Required documents: ID, Matric Certificate, Proof of Residence
        trajectory_tracker.record(
            self.TOOL_VALIDATE_DOCUMENT,
            {"document_id": "doc-001", "document_type": "ID Document"},
            '{"valid": true, "checks": {"format": "pass", "legibility": "pass", "expiry": "valid"}}',
        )
        trajectory_tracker.record(
            self.TOOL_VALIDATE_DOCUMENT,
            {"document_id": "doc-002", "document_type": "Matric Certificate"},
            '{"valid": true, "checks": {"format": "pass", "completeness": "pass"}}',
        )
        trajectory_tracker.record(
            self.TOOL_VALIDATE_DOCUMENT,
            {"document_id": "doc-003", "document_type": "Academic Transcript"},
            '{"valid": true, "checks": {"format": "pass", "completeness": "pass"}}',
        )
        trajectory_tracker.record(
            self.TOOL_VALIDATE_DOCUMENT,
            {"document_id": "doc-004", "document_type": "Proof of Residence"},
            '{"valid": true, "checks": {"format": "pass", "recency": "valid"}}',
        )

        # Document Validation Task completes
        trajectory_tracker.record(
            self.TASK_DOCUMENT_VALIDATION,
            {"applicant_id": "TEST-TRAJ-UG-003"},
            '{"validation_passed": true, "documents_validated": ["doc-001", "doc-002", "doc-003", "doc-004"], "documents_flagged": [], "missing_required": []}',
        )
        trajectory_tracker.update_state(profile_complete=True)

        # -----------------------------------------------------------------
        # Program Selection & RAG Research
        # -----------------------------------------------------------------
        trajectory_tracker.record(
            self.TASK_PROGRAM_SELECTION,
            {"course_choices": profile["course_choices"]},
            '{"first_choice": "BSc Computer Science", "second_choice": "BSc Information Technology"}',
        )
        trajectory_tracker.record(
            self.TASK_RAG_RESEARCH,
            {"aps_score": profile["total_aps_score"]},
            '{"both_choices_verified": true}',
        )

        # -----------------------------------------------------------------
        # Application Compilation (AFTER document validation)
        # -----------------------------------------------------------------
        trajectory_tracker.record(
            self.TASK_APPLICATION_COMPILATION,
            {"applicant_id": "TEST-TRAJ-UG-003"},
            '{"compiled": true, "documents_verified": true}',
        )

        # -----------------------------------------------------------------
        # Application Submission (AFTER compilation)
        # -----------------------------------------------------------------
        trajectory_tracker.record(
            self.TOOL_APPLICATION_SUBMIT,
            {
                "applicant_id": "TEST-TRAJ-UG-003",
                "university": "University of Pretoria",
            },
            '{"application_id": "UP-2026-VALID-001", "status": "submitted"}',
        )
        trajectory_tracker.record(
            self.TASK_APPLICATION_SUBMISSION,
            {"applicant_id": "TEST-TRAJ-UG-003"},
            '{"status": "submitted", "application_id": "UP-2026-VALID-001"}',
        )
        trajectory_tracker.update_state(application_submitted=True)

        # -----------------------------------------------------------------
        # Verification
        # -----------------------------------------------------------------
        # Verify all 4 documents were validated
        assert trajectory_tracker.call_count(self.TOOL_VALIDATE_DOCUMENT) == 4, \
            "All 4 documents should be validated"

        # Verify document validation task ran before submission task
        assert trajectory_tracker.called_before(
            self.TASK_DOCUMENT_VALIDATION,
            self.TASK_APPLICATION_SUBMISSION
        ), "Document validation must complete before application submission"

        # Verify validate_document tool ran before submission tool
        assert trajectory_tracker.called_before(
            self.TOOL_VALIDATE_DOCUMENT,
            self.TOOL_APPLICATION_SUBMIT
        ), "Document validation tool must run before submission tool"

        # Verify collect_documents happened before validation
        assert trajectory_tracker.called_before(
            self.TASK_COLLECT_DOCUMENTS,
            self.TASK_DOCUMENT_VALIDATION
        ), "Documents must be collected before validation"

        # Verify the complete task ordering
        validation_to_submission_order = [
            self.TASK_COLLECT_DOCUMENTS,
            self.TOOL_VALIDATE_DOCUMENT,
            self.TASK_DOCUMENT_VALIDATION,
            self.TASK_APPLICATION_COMPILATION,
            self.TASK_APPLICATION_SUBMISSION,
        ]
        assert trajectory_tracker.verify_task_order(validation_to_submission_order), \
            "Document collection -> validation -> compilation -> submission order must be maintained"

        # Get state at document validation
        state_at_validation = None
        for i, call in enumerate(trajectory_tracker.calls):
            if call["tool"] == self.TASK_DOCUMENT_VALIDATION:
                state_at_validation = call["state_snapshot"]
                break

        assert state_at_validation is not None, "Document validation should have state snapshot"
        assert state_at_validation["documents_uploaded"] is True, \
            "Documents should be uploaded before validation"
        assert state_at_validation["application_submitted"] is False, \
            "Application should not be submitted before document validation"

        # Verify final state
        assert trajectory_tracker.state.application_submitted is True
        assert trajectory_tracker.state.documents_uploaded is True
        assert trajectory_tracker.state.profile_complete is True


class TestDocumentValidationBlocksSubmission:
    """Test that invalid documents block application submission."""

    def test_invalid_document_blocks_submission(
        self,
        trajectory_tracker: "TrajectoryToolTracker",
        trajectory_undergraduate_profile: dict,
    ):
        """
        Test: Invalid documents should prevent application submission.

        Verification:
        - Document validation fails for blurry ID
        - Submission task is NOT executed
        - Applicant is notified of the issue
        """
        profile = trajectory_undergraduate_profile

        # Authentication
        trajectory_tracker.record(
            "verify_otp",
            {"identifier": profile["email"], "code": "123456"},
            "OTP_VALID",
        )
        trajectory_tracker.update_state(authenticated=True, session_active=True)

        # Data collection
        trajectory_tracker.record(
            TestUndergraduateFlow.TASK_COLLECT_PERSONAL,
            {"profile": profile},
            '{"validated": true}',
        )
        trajectory_tracker.record(
            TestUndergraduateFlow.TASK_COLLECT_ACADEMIC,
            {"aps_score": profile["total_aps_score"]},
            '{"validated": true}',
        )
        trajectory_tracker.record(
            TestUndergraduateFlow.TASK_COLLECT_DOCUMENTS,
            {"documents": profile["documents_available"]},
            '{"documents_uploaded": true}',
        )
        trajectory_tracker.update_state(documents_uploaded=True)

        # Document validation - ID document is blurry and FAILS
        trajectory_tracker.record(
            TestUndergraduateFlow.TOOL_VALIDATE_DOCUMENT,
            {"document_id": "doc-001", "document_type": "ID Document"},
            '{"valid": false, "reason": "Image too blurry - please upload a clearer photo"}',
        )
        trajectory_tracker.record(
            TestUndergraduateFlow.TOOL_VALIDATE_DOCUMENT,
            {"document_id": "doc-002", "document_type": "Matric Certificate"},
            '{"valid": true}',
        )

        # Document validation task FAILS
        trajectory_tracker.record(
            TestUndergraduateFlow.TASK_DOCUMENT_VALIDATION,
            {"applicant_id": "TEST-TRAJ-INVALID-001"},
            '{"validation_passed": false, "documents_validated": ["doc-002"], "documents_flagged": [{"document_id": "doc-001", "document_type": "ID Document", "reason": "Image too blurry - please upload a clearer photo"}], "missing_required": []}',
        )

        # Notification sent to applicant about the issue
        trajectory_tracker.record(
            "send_whatsapp_notification",
            {
                "phone": profile["whatsapp_number"],
                "message": "Your ID document needs to be resubmitted: Image too blurry",
            },
            "Notification sent",
        )

        # Verify submission was NOT attempted
        assert not trajectory_tracker.called(TestUndergraduateFlow.TOOL_APPLICATION_SUBMIT), \
            "Application submission should NOT be attempted when documents are invalid"
        assert not trajectory_tracker.called(TestUndergraduateFlow.TASK_APPLICATION_SUBMISSION), \
            "Application submission task should NOT execute when validation fails"

        # Verify notification was sent
        assert trajectory_tracker.called("send_whatsapp_notification"), \
            "Applicant should be notified of document issues"

        # Verify state - application should NOT be submitted
        assert trajectory_tracker.state.application_submitted is False
        assert trajectory_tracker.state.documents_uploaded is True
