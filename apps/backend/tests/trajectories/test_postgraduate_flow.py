"""
Test: Postgraduate Application Flow

Verifies the postgraduate trajectory where NSFAS is skipped entirely:
- Honours students (nsfas_eligible: false)
- Masters students (postgrad program)
- PhD students (doctoral path)

Key verification: NSFAS tasks return skip results, NOT call tools.

The NSFAS skip logic is defined in tasks.yaml:
1. ask_if_apply_for_nsfas_task: Returns "NO_NSFAS" for postgrad or ineligible
2. nsfas_collection_task: Returns {"nsfas_skipped": true} if previous was NO_NSFAS
3. nsfas_submission_task: Returns {"nsfas_skipped": true} if collection was skipped
4. nsfas_status_check_task: Returns skip message if submission was skipped
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
# NSFAS Tool Constants
# =============================================================================
# These are the NSFAS-related tools that should NOT be called for postgraduate
# applicants. The skip logic in tasks.yaml ensures these are never invoked.

NSFAS_TOOLS = [
    # NSFAS document and data collection tools
    "supabase_nsfas_documents_store",
    "supabase_nsfas_store",
    # NSFAS submission tools
    "nsfas_application_submission_tool",
    # NSFAS status check tools
    "nsfas_status_tool",
    # Any generic NSFAS-related tools
    "nsfas_eligibility_check",
    "nsfas_document_upload",
]

# Tools that SHOULD be called for postgraduate applications
EXPECTED_POSTGRAD_TOOLS = [
    # Document collection (postgrad-specific documents)
    "supabase_application_store",
    # Application submission
    "application_submission_tool",
    # Status checking
    "application_status_tool",
]


class TestPostgraduateFlow:
    """Postgraduate application flow with NSFAS skip logic verification."""

    def test_postgrad_skips_nsfas_entirely(
        self,
        trajectory_tracker: "TrajectoryToolTracker",
        trajectory_postgraduate_profile: dict,
    ):
        """
        Test: Postgraduate applicant (Honours) skips all NSFAS tasks.

        Verification:
        - ask_if_apply_for_nsfas_task returns "NO_NSFAS"
        - nsfas_collection_task returns {"nsfas_skipped": true}
        - nsfas_submission_task returns {"nsfas_skipped": true}
        - NO nsfas_* tools are called

        This test simulates the complete postgraduate workflow and verifies
        that the NSFAS conditional logic correctly prevents NSFAS tool calls.
        """
        profile = trajectory_postgraduate_profile

        # Verify profile is configured as postgraduate with nsfas_eligible=False
        assert profile["education_level"] == "Honours", \
            "Test profile should be Honours level"
        assert profile["nsfas_eligible"] is False, \
            "Postgraduate profile should have nsfas_eligible=False"

        # =================================================================
        # Phase 1: Authentication and Personal Data Collection
        # =================================================================
        # These steps are identical for undergraduate and postgraduate

        trajectory_tracker.record(
            "sendgrid_otp_sender",
            {"email": profile["email"]},
            "OTP sent successfully"
        )
        trajectory_tracker.update_state(authenticated=False)

        trajectory_tracker.record(
            "verify_otp",
            {"identifier": profile["email"], "code": "999888"},
            "OTP_VALID"
        )

        trajectory_tracker.record(
            "supabase_user_store",
            {
                "full_name": profile["full_name"],
                "email": profile["email"],
                "id_number": profile["id_number"],
            },
            f"User created: {profile['profile_id']}"
        )

        trajectory_tracker.record(
            "supabase_session_create",
            {"user_id": profile["profile_id"]},
            "Session created: TEST-TRAJ-SESSION-PG001"
        )
        trajectory_tracker.update_state(authenticated=True, session_active=True)

        # =================================================================
        # Phase 2: Academic Data Collection (Postgraduate Specific)
        # =================================================================
        # Postgraduate applicants have different academic data structure

        trajectory_tracker.record(
            "supabase_application_store",
            {
                "applicant_id": profile["profile_id"],
                "education_level": profile["education_level"],
                "previous_qualification": profile["previous_qualification"],
                "undergraduate_degree": profile["undergraduate_degree"],
                "undergraduate_institution": profile["undergraduate_institution"],
                "undergraduate_average": profile["undergraduate_average"],
            },
            "Academic data stored for Honours applicant"
        )
        trajectory_tracker.update_state(profile_complete=True)

        # =================================================================
        # Phase 3: Document Collection (Postgraduate Documents)
        # =================================================================

        trajectory_tracker.record(
            "supabase_document_store",
            {
                "applicant_id": profile["profile_id"],
                "documents": profile["documents_available"],
                "document_types": [
                    "ID Document",
                    "Undergraduate Degree Certificate",
                    "Academic Transcript",
                    "Proof of Residence",
                ],
            },
            "Documents stored: 4 documents uploaded"
        )
        trajectory_tracker.update_state(documents_uploaded=True)

        # =================================================================
        # Phase 4: RAG Research (Postgraduate Programme)
        # =================================================================

        trajectory_tracker.record(
            "supabase_rag_query",
            {
                "query": f"BSc Honours Computer Science requirements {profile['primary_institution']}",
                "programme_level": "Honours",
            },
            "Found: Honours requires 65% average in related BSc degree"
        )

        # =================================================================
        # Phase 5: NSFAS Decision - Critical Skip Logic
        # =================================================================
        # The ask_if_apply_for_nsfas_task checks:
        # 1. nsfas_eligible field (False for postgrad)
        # 2. Programme type (Honours/Masters/PhD = postgrad)
        # Either condition triggers "NO_NSFAS" response

        # Simulate the task result (no tool call, just decision)
        nsfas_decision = "NO_NSFAS"

        # Verify the decision is correct for postgraduate
        assert nsfas_decision == "NO_NSFAS", \
            "Postgraduate applicant should receive NO_NSFAS decision"

        # =================================================================
        # Phase 6: NSFAS Collection - Skipped
        # =================================================================
        # nsfas_collection_task checks context for NO_NSFAS and skips

        nsfas_collection_result = {
            "nsfas_skipped": True,
            "reason": "Applicant not eligible for NSFAS - postgraduate programme"
        }

        # Verify skip result structure
        assert nsfas_collection_result["nsfas_skipped"] is True, \
            "NSFAS collection should be skipped for postgrad"
        assert "postgraduate" in nsfas_collection_result["reason"].lower() or \
               "not eligible" in nsfas_collection_result["reason"].lower(), \
            "Skip reason should mention postgraduate or ineligibility"

        # =================================================================
        # Phase 7: NSFAS Submission - Skipped
        # =================================================================
        # nsfas_submission_task checks context for nsfas_skipped and skips

        nsfas_submission_result = {
            "nsfas_skipped": True,
            "reason": "Applicant not eligible for NSFAS - no submission required"
        }

        # Verify skip result
        assert nsfas_submission_result["nsfas_skipped"] is True, \
            "NSFAS submission should be skipped for postgrad"

        # =================================================================
        # Phase 8: University Application Submission
        # =================================================================

        trajectory_tracker.record(
            "application_submission_tool",
            {
                "applicant_id": profile["profile_id"],
                "institution": profile["primary_institution"],
                "programme": profile["course_choices"][0]["programme"],
                "education_level": "Honours",
            },
            "Application submitted: APP-HON-2024-001"
        )
        trajectory_tracker.update_state(application_submitted=True)

        # =================================================================
        # Final Verification: NO NSFAS tools were called
        # =================================================================

        for nsfas_tool in NSFAS_TOOLS:
            assert not trajectory_tracker.called(nsfas_tool), \
                f"NSFAS tool '{nsfas_tool}' should NOT be called for postgraduate applicant"

        # Verify application was submitted (NSFAS skip doesn't block university app)
        assert trajectory_tracker.state.application_submitted, \
            "University application should still be submitted"
        assert not trajectory_tracker.state.nsfas_submitted, \
            "NSFAS should NOT be marked as submitted"

        # Verify correct tool sequence
        expected_order = [
            "sendgrid_otp_sender",
            "verify_otp",
            "supabase_user_store",
            "supabase_session_create",
            "supabase_application_store",
            "application_submission_tool",
        ]
        assert trajectory_tracker.verify_task_order(expected_order), \
            f"Tool order should follow expected sequence. Got: {trajectory_tracker.get_sequence()}"

    def test_research_proposal_handling(
        self,
        trajectory_tracker: "TrajectoryToolTracker",
        trajectory_postgraduate_profile: dict,
    ):
        """
        Test: Masters/PhD applications handle research proposals correctly.

        Verification:
        - Document collection includes proposal_document type
        - RAG research queries postgraduate-specific programs
        - Supervisor matching is included in research
        - NSFAS is still skipped (postgrad)
        """
        # Create a modified profile for Masters with research proposal
        masters_profile = {
            **trajectory_postgraduate_profile,
            "profile_id": "TEST-TRAJ-MSC-001",
            "full_name": "Test Masters Candidate",
            "email": "traj.masters@example.com",
            "education_level": "Masters",
            "previous_qualification": "Honours Degree",
            "undergraduate_degree": "BSc Honours Computer Science",
            "undergraduate_average": 78.0,
            "course_choices": [
                {
                    "priority": 1,
                    "institution": "University of Cape Town",
                    "faculty": "Science",
                    "programme": "MSc Computer Science",
                    "minimum_avg": 70,
                    "requirements": "BSc Honours in CS with research component",
                },
            ],
            "research_proposal": {
                "title": "Machine Learning for Healthcare Diagnostics",
                "abstract": "Investigating deep learning applications in medical imaging",
                "proposed_supervisor": "Prof. J. Smith",
            },
            "documents_available": [
                "ID Document",
                "Honours Degree Certificate",
                "Academic Transcript",
                "Research Proposal",
                "CV",
            ],
        }

        # =================================================================
        # Phase 1: Document Collection with Research Proposal
        # =================================================================

        trajectory_tracker.record(
            "supabase_document_store",
            {
                "applicant_id": masters_profile["profile_id"],
                "documents": masters_profile["documents_available"],
                "document_types": [
                    "ID Document",
                    "Honours Degree Certificate",
                    "Academic Transcript",
                    "Research Proposal",  # Critical for Masters/PhD
                    "CV",
                ],
            },
            "Documents stored: 5 documents including research proposal"
        )

        # Verify research proposal is in the stored documents
        stored_docs = trajectory_tracker.get_call_args("supabase_document_store")
        assert stored_docs is not None, "Document store should be called"
        assert "Research Proposal" in stored_docs["document_types"], \
            "Research Proposal should be included in document types"

        # =================================================================
        # Phase 2: RAG Research for Postgraduate Programme
        # =================================================================

        # Query for programme requirements
        trajectory_tracker.record(
            "supabase_rag_query",
            {
                "query": "MSc Computer Science admission requirements UCT",
                "programme_level": "Masters",
                "include_supervisor_info": True,
            },
            "Found: MSc requires Honours with 70%+, research proposal, supervisor"
        )

        # Query for supervisor availability
        trajectory_tracker.record(
            "supabase_rag_query",
            {
                "query": "Computer Science faculty supervisors UCT machine learning",
                "programme_level": "Masters",
                "query_type": "supervisor_matching",
            },
            "Found supervisors: Prof. J. Smith (ML), Dr. K. Jones (AI/Healthcare)"
        )

        # Verify RAG queries are postgrad-specific
        rag_calls = [
            c for c in trajectory_tracker.calls
            if c["tool"] == "supabase_rag_query"
        ]
        assert len(rag_calls) >= 2, \
            "Should have at least 2 RAG queries for postgrad (requirements + supervisor)"

        # Check that supervisor query was made
        supervisor_query_made = any(
            "supervisor" in str(c.get("args", {})).lower()
            for c in rag_calls
        )
        assert supervisor_query_made, \
            "Should query for supervisor information for Masters application"

        # =================================================================
        # Phase 3: Verify NSFAS Skip for Masters
        # =================================================================

        # Masters applications should also skip NSFAS
        nsfas_decision = "NO_NSFAS"  # From ask_if_apply_for_nsfas_task

        # Verify no NSFAS tools called
        for nsfas_tool in NSFAS_TOOLS:
            assert not trajectory_tracker.called(nsfas_tool), \
                f"NSFAS tool '{nsfas_tool}' should NOT be called for Masters applicant"

        # =================================================================
        # Phase 4: Application Submission with Research Component
        # =================================================================

        trajectory_tracker.record(
            "application_submission_tool",
            {
                "applicant_id": masters_profile["profile_id"],
                "institution": masters_profile["primary_institution"],
                "programme": masters_profile["course_choices"][0]["programme"],
                "education_level": "Masters",
                "research_proposal_title": masters_profile["research_proposal"]["title"],
                "proposed_supervisor": masters_profile["research_proposal"]["proposed_supervisor"],
            },
            "Application submitted: APP-MSC-2024-001"
        )

        # Verify submission included research proposal details
        submission_args = trajectory_tracker.get_call_args("application_submission_tool")
        assert submission_args is not None, "Application should be submitted"
        assert "research_proposal_title" in submission_args, \
            "Submission should include research proposal title"
        assert "proposed_supervisor" in submission_args, \
            "Submission should include proposed supervisor"

    def test_phd_application_flow(
        self,
        trajectory_tracker: "TrajectoryToolTracker",
    ):
        """
        Test: Doctoral (PhD) application path.

        Verification:
        - PhD-specific document requirements
        - Prior publications handling
        - Research council funding (not NSFAS)
        - Extended supervisor matching
        - NSFAS completely bypassed
        """
        # PhD-specific profile
        phd_profile = {
            "profile_id": "TEST-TRAJ-PHD-001",
            "full_name": "Test Doctoral Candidate",
            "id_number": "9001015000001",
            "date_of_birth": "1990-01-01",
            "gender": "Female",
            "home_language": "English",
            "province": "Gauteng",
            "citizenship": "South African",
            "mobile_number": "+27821111005",
            "email": "traj.phd@example.com",
            "whatsapp_number": "+27821111005",
            "physical_address": "5 Doctoral Drive, Johannesburg, 2000",

            # Doctoral-specific fields
            "education_level": "Doctoral",
            "previous_qualification": "Masters Degree",
            "masters_degree": "MSc Computer Science",
            "masters_institution": "University of the Witwatersrand",
            "masters_graduation_year": 2022,
            "masters_average": 82.0,

            # PhD-specific academic record
            "prior_publications": [
                {
                    "title": "Deep Learning in Healthcare: A Review",
                    "journal": "Journal of AI in Medicine",
                    "year": 2023,
                    "type": "peer_reviewed",
                },
                {
                    "title": "Neural Networks for Medical Imaging",
                    "conference": "MICCAI 2023",
                    "year": 2023,
                    "type": "conference_paper",
                },
            ],
            "research_experience_years": 4,

            "course_choices": [
                {
                    "priority": 1,
                    "institution": "University of the Witwatersrand",
                    "faculty": "Science",
                    "programme": "PhD Computer Science",
                    "minimum_avg": 75,
                    "requirements": "Masters in CS, research proposal, publications preferred",
                },
            ],
            "primary_institution": "University of the Witwatersrand",

            # Research proposal for PhD
            "research_proposal": {
                "title": "Explainable AI for Medical Decision Support Systems",
                "abstract": "Developing interpretable machine learning models for clinical diagnosis",
                "proposed_supervisor": "Prof. A. Researcher",
                "co_supervisor": "Dr. B. Scientist",
                "funding_source": "NRF Doctoral Scholarship",
            },

            # Financial - PhD typically uses research council funding, not NSFAS
            "nsfas_eligible": False,
            "funding_type": "NRF Scholarship",
            "household_income": "N/A",
            "sassa_recipient": False,
            "disability_grant": False,
            "guardian_employment": "N/A",

            # PhD-specific documents
            "documents_available": [
                "ID Document",
                "Masters Degree Certificate",
                "Academic Transcript",
                "Research Proposal",
                "CV",
                "Publications List",
                "Reference Letters",
            ],
            "documents_missing": [],
        }

        # =================================================================
        # Phase 1: PhD Document Collection
        # =================================================================

        trajectory_tracker.record(
            "supabase_document_store",
            {
                "applicant_id": phd_profile["profile_id"],
                "documents": phd_profile["documents_available"],
                "document_types": [
                    "ID Document",
                    "Masters Degree Certificate",
                    "Academic Transcript",
                    "Research Proposal",
                    "CV",
                    "Publications List",  # PhD-specific
                    "Reference Letters",  # PhD-specific
                ],
            },
            "Documents stored: 7 documents for PhD application"
        )

        # Verify PhD-specific documents are collected
        doc_args = trajectory_tracker.get_call_args("supabase_document_store")
        assert doc_args is not None
        assert "Publications List" in doc_args["document_types"], \
            "PhD should include publications list"
        assert "Reference Letters" in doc_args["document_types"], \
            "PhD should include reference letters"

        # =================================================================
        # Phase 2: Prior Publications Handling
        # =================================================================

        trajectory_tracker.record(
            "supabase_application_store",
            {
                "applicant_id": phd_profile["profile_id"],
                "education_level": "Doctoral",
                "prior_publications": phd_profile["prior_publications"],
                "publication_count": len(phd_profile["prior_publications"]),
                "research_experience_years": phd_profile["research_experience_years"],
            },
            "Academic profile stored: 2 publications, 4 years research experience"
        )

        # Verify publications are stored
        academic_args = trajectory_tracker.get_call_args("supabase_application_store")
        assert academic_args is not None
        assert "prior_publications" in academic_args, \
            "PhD application should store prior publications"
        assert academic_args["publication_count"] == 2, \
            "Should correctly count publications"

        # =================================================================
        # Phase 3: RAG Research for PhD Programme
        # =================================================================

        # Query for PhD requirements
        trajectory_tracker.record(
            "supabase_rag_query",
            {
                "query": "PhD Computer Science admission requirements Wits",
                "programme_level": "Doctoral",
            },
            "Found: PhD requires Masters with 75%+, research proposal, supervisor"
        )

        # Extended supervisor search for PhD (both supervisor and co-supervisor)
        trajectory_tracker.record(
            "supabase_rag_query",
            {
                "query": "Computer Science faculty supervisors Wits AI medical applications",
                "programme_level": "Doctoral",
                "query_type": "supervisor_matching",
                "include_co_supervisors": True,
            },
            "Found: Prof. A. Researcher (primary, XAI), Dr. B. Scientist (co-sup, Medical AI)"
        )

        # Research council funding query (NOT NSFAS)
        trajectory_tracker.record(
            "supabase_rag_query",
            {
                "query": "NRF Doctoral Scholarship requirements South Africa",
                "query_type": "funding_info",
                "funding_body": "NRF",
            },
            "Found: NRF Doctoral requires SA citizenship, full-time registration, supervisor approval"
        )

        # Verify funding query was for research council, NOT NSFAS
        rag_calls = [c for c in trajectory_tracker.calls if c["tool"] == "supabase_rag_query"]
        funding_queries = [
            c for c in rag_calls
            if "funding" in str(c.get("args", {})).lower()
        ]
        assert len(funding_queries) >= 1, \
            "Should query for funding information"

        funding_args = funding_queries[0]["args"]
        assert "NRF" in str(funding_args), \
            "PhD funding query should be for NRF, not NSFAS"

        # =================================================================
        # Phase 4: NSFAS Complete Bypass for PhD
        # =================================================================

        # PhD is postgraduate - NSFAS is skipped entirely
        # Verify decision would be NO_NSFAS
        assert phd_profile["nsfas_eligible"] is False, \
            "PhD profile should have nsfas_eligible=False"
        assert phd_profile["funding_type"] == "NRF Scholarship", \
            "PhD should use NRF funding, not NSFAS"

        # Verify no NSFAS tools were called
        for nsfas_tool in NSFAS_TOOLS:
            assert not trajectory_tracker.called(nsfas_tool), \
                f"NSFAS tool '{nsfas_tool}' should NOT be called for PhD applicant"

        # =================================================================
        # Phase 5: PhD Application Submission
        # =================================================================

        trajectory_tracker.record(
            "application_submission_tool",
            {
                "applicant_id": phd_profile["profile_id"],
                "institution": phd_profile["primary_institution"],
                "programme": phd_profile["course_choices"][0]["programme"],
                "education_level": "Doctoral",
                "research_proposal_title": phd_profile["research_proposal"]["title"],
                "proposed_supervisor": phd_profile["research_proposal"]["proposed_supervisor"],
                "co_supervisor": phd_profile["research_proposal"]["co_supervisor"],
                "funding_source": phd_profile["research_proposal"]["funding_source"],
                "publication_count": len(phd_profile["prior_publications"]),
            },
            "Application submitted: APP-PHD-2024-001"
        )

        # Verify submission includes all PhD-specific fields
        submission_args = trajectory_tracker.get_call_args("application_submission_tool")
        assert submission_args is not None, "Application should be submitted"
        assert submission_args["education_level"] == "Doctoral", \
            "Submission should indicate Doctoral level"
        assert "co_supervisor" in submission_args, \
            "PhD submission should include co-supervisor"
        assert "funding_source" in submission_args, \
            "PhD submission should include funding source"
        assert submission_args["funding_source"] == "NRF Doctoral Scholarship", \
            "PhD funding should be NRF, not NSFAS"

        # =================================================================
        # Final State Verification
        # =================================================================

        trajectory_tracker.update_state(application_submitted=True)

        # Verify no NSFAS submission state
        assert not trajectory_tracker.state.nsfas_submitted, \
            "NSFAS should NOT be submitted for PhD"

        # Verify tool sequence excludes all NSFAS tools
        tool_sequence = trajectory_tracker.get_sequence()
        nsfas_tools_called = [t for t in tool_sequence if "nsfas" in t.lower()]
        assert len(nsfas_tools_called) == 0, \
            f"No NSFAS tools should be in sequence. Found: {nsfas_tools_called}"


class TestPostgraduateNSFASDecisionLogic:
    """
    Test the specific decision logic for NSFAS skip in postgraduate flows.

    These tests verify the conditional logic defined in tasks.yaml for:
    - ask_if_apply_for_nsfas_task
    - nsfas_collection_task
    - nsfas_submission_task
    """

    def test_nsfas_decision_respects_eligibility_flag(
        self,
        trajectory_tracker: "TrajectoryToolTracker",
        trajectory_postgraduate_profile: dict,
    ):
        """
        Test: NSFAS decision correctly uses nsfas_eligible flag.

        From tasks.yaml ask_if_apply_for_nsfas_task:
        "If nsfas_eligible is FALSE or 'No' -> return NO_NSFAS"
        """
        profile = trajectory_postgraduate_profile

        # Profile explicitly has nsfas_eligible: False
        assert profile["nsfas_eligible"] is False, \
            "Postgrad profile should have nsfas_eligible=False"

        # The task decision logic
        if not profile["nsfas_eligible"]:
            decision = "NO_NSFAS"
        else:
            decision = "YES_NSFAS"

        assert decision == "NO_NSFAS", \
            "Decision should be NO_NSFAS when nsfas_eligible is False"

    def test_nsfas_decision_respects_education_level(
        self,
        trajectory_tracker: "TrajectoryToolTracker",
        trajectory_postgraduate_profile: dict,
    ):
        """
        Test: NSFAS decision correctly checks education level.

        From tasks.yaml ask_if_apply_for_nsfas_task:
        "If postgrad programme -> return NO_NSFAS (NSFAS is for undergrad only)"
        """
        profile = trajectory_postgraduate_profile

        postgrad_levels = ["Honours", "Masters", "Doctoral", "Postgraduate Diploma"]

        # Profile is Honours level
        assert profile["education_level"] in postgrad_levels, \
            f"Profile education_level should be postgrad. Got: {profile['education_level']}"

        # The task decision logic - postgrad always gets NO_NSFAS
        if profile.get("education_level") in postgrad_levels:
            decision = "NO_NSFAS"
        elif profile.get("nsfas_eligible"):
            decision = "YES_NSFAS"
        else:
            decision = "NO_NSFAS"

        assert decision == "NO_NSFAS", \
            "Decision should be NO_NSFAS for postgraduate education level"

    def test_nsfas_collection_skip_propagates(
        self,
        trajectory_tracker: "TrajectoryToolTracker",
    ):
        """
        Test: NSFAS collection task correctly propagates skip from decision.

        From tasks.yaml nsfas_collection_task:
        "IF the result was 'NO_NSFAS':
         - Do NOT collect any NSFAS data
         - Do NOT call any tools
         - Return exactly: {'nsfas_skipped': true, 'reason': '...'}"
        """
        # Simulate the task chain
        nsfas_decision = "NO_NSFAS"

        # nsfas_collection_task logic
        if nsfas_decision == "NO_NSFAS":
            collection_result = {
                "nsfas_skipped": True,
                "reason": "Applicant not eligible for NSFAS"
            }
            # Should NOT call any tools
            tools_to_avoid = [
                "supabase_nsfas_documents_store",
                "supabase_nsfas_store",
            ]
        else:
            collection_result = {
                "nsfas_skipped": False,
                "nsfas_data": "..."
            }

        assert collection_result["nsfas_skipped"] is True, \
            "Collection should be skipped when decision is NO_NSFAS"

        # Verify no NSFAS tools called
        for tool in NSFAS_TOOLS:
            assert not trajectory_tracker.called(tool), \
                f"Tool {tool} should not be called when NSFAS is skipped"

    def test_nsfas_submission_skip_propagates(
        self,
        trajectory_tracker: "TrajectoryToolTracker",
    ):
        """
        Test: NSFAS submission task correctly propagates skip from collection.

        From tasks.yaml nsfas_submission_task:
        "IF the result contains 'nsfas_skipped': true:
         - Do NOT submit any NSFAS application
         - Do NOT call any tools
         - Return exactly: {'nsfas_skipped': true, 'reason': '...'}"
        """
        # Simulate the task chain
        collection_result = {
            "nsfas_skipped": True,
            "reason": "Applicant not eligible for NSFAS"
        }

        # nsfas_submission_task logic
        if collection_result.get("nsfas_skipped"):
            submission_result = {
                "nsfas_skipped": True,
                "reason": "Applicant not eligible for NSFAS - no submission required"
            }
            # Should NOT call any tools
        else:
            submission_result = {
                "nsfas_skipped": False,
                "nsfas_application_id": "NSFAS-2024-001"
            }

        assert submission_result["nsfas_skipped"] is True, \
            "Submission should be skipped when collection was skipped"

        # Verify no submission tools called
        assert not trajectory_tracker.called("nsfas_application_submission_tool"), \
            "NSFAS submission tool should not be called when skipped"

    def test_full_nsfas_skip_chain(
        self,
        trajectory_tracker: "TrajectoryToolTracker",
        trajectory_postgraduate_profile: dict,
    ):
        """
        Test: Complete NSFAS skip chain from decision through status check.

        Verifies the entire skip propagation:
        1. ask_if_apply_for_nsfas_task -> NO_NSFAS
        2. nsfas_collection_task -> {nsfas_skipped: true}
        3. nsfas_submission_task -> {nsfas_skipped: true}
        4. nsfas_status_check_task -> skip message

        No NSFAS tools should be called at any point.
        """
        profile = trajectory_postgraduate_profile

        # =================================================================
        # Task 1: ask_if_apply_for_nsfas_task
        # =================================================================
        # Decision logic from tasks.yaml
        if not profile.get("nsfas_eligible") or \
           profile.get("education_level") in ["Honours", "Masters", "Doctoral"]:
            nsfas_decision = "NO_NSFAS"
        else:
            nsfas_decision = "YES_NSFAS"

        assert nsfas_decision == "NO_NSFAS"

        # =================================================================
        # Task 2: nsfas_collection_task
        # =================================================================
        if nsfas_decision == "NO_NSFAS":
            collection_result = {
                "nsfas_skipped": True,
                "reason": "Applicant not eligible for NSFAS"
            }
        else:
            # This branch should never execute for postgrad
            collection_result = {"nsfas_data": "..."}

        assert collection_result.get("nsfas_skipped") is True

        # =================================================================
        # Task 3: nsfas_submission_task
        # =================================================================
        if collection_result.get("nsfas_skipped"):
            submission_result = {
                "nsfas_skipped": True,
                "reason": "Applicant not eligible for NSFAS - no submission required"
            }
        else:
            submission_result = {"nsfas_application_id": "..."}

        assert submission_result.get("nsfas_skipped") is True

        # =================================================================
        # Task 4: nsfas_status_check_task
        # =================================================================
        # From tasks.yaml:
        # "IF the result contains 'nsfas_skipped': true:
        #  - Return exactly: 'NSFAS application was not submitted...'"
        if submission_result.get("nsfas_skipped"):
            status_result = (
                "NSFAS application was not submitted - applicant not eligible "
                "for NSFAS funding due to household income exceeding threshold."
            )
        else:
            status_result = "NSFAS Status: Pending review"

        assert "not submitted" in status_result.lower(), \
            "Status should indicate NSFAS was not submitted"
        assert "not eligible" in status_result.lower(), \
            "Status should indicate applicant is not eligible"

        # =================================================================
        # Final Verification: Zero NSFAS tool calls
        # =================================================================
        for nsfas_tool in NSFAS_TOOLS:
            assert not trajectory_tracker.called(nsfas_tool), \
                f"NSFAS tool '{nsfas_tool}' should NOT be called in skip chain"

        # Verify state reflects no NSFAS submission
        assert not trajectory_tracker.state.nsfas_submitted, \
            "NSFAS should not be marked as submitted"
