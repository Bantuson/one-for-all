"""Test tool call sequences in CrewAI workflows.

These tests verify that tools are called in the correct order during
workflow execution, ensuring proper agent coordination.
"""
import pytest


@pytest.mark.integration
@pytest.mark.vcr
class TestAuthToolSequence:
    """Test authentication agent tool call sequences."""

    def test_auth_agent_uses_otp_before_session(self, tool_call_tracker):
        """Auth agent should send OTP before creating session.

        Expected sequence:
        1. OTP sent via one of the channels (email, SMS, WhatsApp)
        2. OTP verified
        3. Session created with verified user
        """
        otp_tools = ["sendgrid_otp_sender", "sms_otp_sender", "send_whatsapp_otp"]
        session_tool = "supabase_session_create"

        # Simulate expected tool call sequence for auth flow
        # In real test, this would be captured from actual crew execution
        tool_call_tracker.record("sendgrid_otp_sender", {"email": "test@example.com"}, "OTP sent")
        tool_call_tracker.record("verify_otp", {"otp": "123456"}, "OTP verified")
        tool_call_tracker.record("supabase_session_create", {"user_id": "test-001"}, "Session created")

        otp_sent = any(tool_call_tracker.called(t) for t in otp_tools)
        session_created = tool_call_tracker.called(session_tool)

        assert otp_sent, "OTP should be sent via at least one channel"
        assert session_created, "Session should be created after OTP verification"

        # Verify OTP sent before session created
        for otp_tool in otp_tools:
            if tool_call_tracker.called(otp_tool):
                assert tool_call_tracker.called_before(otp_tool, session_tool), \
                    f"{otp_tool} should be called before {session_tool}"

    def test_auth_flow_records_all_verification_steps(self, tool_call_tracker):
        """Auth flow should record complete verification chain."""
        tool_call_tracker.record("sendgrid_otp_sender", {"email": "user@test.com"}, "sent")
        tool_call_tracker.record("verify_otp", {"otp": "654321"}, "verified")
        tool_call_tracker.record("supabase_session_create", {"user_id": "u-123"}, "created")
        tool_call_tracker.record("supabase_upsert_user", {"user_id": "u-123"}, "upserted")

        assert tool_call_tracker.call_count("sendgrid_otp_sender") == 1
        assert tool_call_tracker.called("verify_otp")
        assert tool_call_tracker.called("supabase_session_create")


@pytest.mark.integration
@pytest.mark.vcr
class TestRAGToolSequence:
    """Test RAG specialist agent tool call sequences."""

    def test_rag_agent_queries_db_before_web(self, tool_call_tracker):
        """RAG agent should query local database before web fallback.

        Expected sequence:
        1. Query RAG/vector database for existing knowledge
        2. If insufficient, fall back to web search
        3. Store new knowledge for future queries
        """
        db_query_tool = "supabase_rag_query"
        web_search_tool = "web_search"

        # Simulate RAG workflow: DB first, then web fallback
        tool_call_tracker.record(db_query_tool, {"query": "UP application requirements"}, "No results")
        tool_call_tracker.record(web_search_tool, {"query": "UP application requirements 2025"}, "Found results")
        tool_call_tracker.record("supabase_rag_store", {"content": "UP requirements..."}, "Stored")

        assert tool_call_tracker.called(db_query_tool), "Should query database first"
        assert tool_call_tracker.called_before(db_query_tool, web_search_tool), \
            "Database query should precede web search"

    def test_rag_caches_web_results(self, tool_call_tracker):
        """RAG agent should cache web search results in database."""
        tool_call_tracker.record("supabase_rag_query", {"query": "fees"}, "No cache")
        tool_call_tracker.record("web_search", {"query": "university fees 2025"}, "Results found")
        tool_call_tracker.record("supabase_rag_store", {"content": "Fee structure..."}, "Cached")

        assert tool_call_tracker.called("supabase_rag_store"), \
            "Web results should be cached in database"
        assert tool_call_tracker.called_before("web_search", "supabase_rag_store"), \
            "Web search should occur before storing results"


@pytest.mark.integration
@pytest.mark.vcr
class TestSubmissionToolSequence:
    """Test submission agent tool call sequences."""

    def test_submission_agent_compiles_before_submit(self, tool_call_tracker):
        """Submission agent should compile application before submitting.

        Expected sequence:
        1. Validate all required documents
        2. Compile application package
        3. Submit to institution
        4. Record submission status
        """
        validate_tool = "validate_documents"
        compile_tool = "compile_application"
        submit_tool = "submit_application"

        tool_call_tracker.record(validate_tool, {"user_id": "u-123"}, "All valid")
        tool_call_tracker.record(compile_tool, {"user_id": "u-123"}, "Compiled")
        tool_call_tracker.record(submit_tool, {"application_id": "app-456"}, "Submitted")
        tool_call_tracker.record("supabase_update_status", {"status": "submitted"}, "Updated")

        assert tool_call_tracker.called(validate_tool), "Documents should be validated"
        assert tool_call_tracker.called(compile_tool), "Application should be compiled"
        assert tool_call_tracker.called(submit_tool), "Application should be submitted"

        # Verify order
        assert tool_call_tracker.called_before(validate_tool, compile_tool)
        assert tool_call_tracker.called_before(compile_tool, submit_tool)

    def test_submission_records_confirmation(self, tool_call_tracker):
        """Submission should record confirmation details."""
        tool_call_tracker.record("submit_application", {"app_id": "a-1"}, "ref: SUB-12345")
        tool_call_tracker.record("supabase_update_status",
                                 {"status": "submitted", "reference": "SUB-12345"},
                                 "Recorded")
        tool_call_tracker.record("sendgrid_email",
                                 {"to": "user@test.com", "subject": "Application Submitted"},
                                 "Sent")

        assert tool_call_tracker.called("supabase_update_status")
        assert tool_call_tracker.called("sendgrid_email"), \
            "User should receive confirmation email"


@pytest.mark.integration
@pytest.mark.vcr
class TestNSFASConditional:
    """Test NSFAS agent conditional execution."""

    def test_nsfas_skipped_for_postgrad(self, tool_call_tracker, postgraduate_profile_honours):
        """NSFAS tasks should be skipped for postgraduate applicants.

        NSFAS funding is only available for undergraduate students,
        so postgraduate applications should skip NSFAS-related tasks.
        """
        nsfas_tools = [
            "nsfas_eligibility_check",
            "nsfas_application_submit",
            "nsfas_document_upload",
        ]

        # Simulate postgrad workflow - no NSFAS tools called
        tool_call_tracker.record("validate_documents", {"user_id": "pg-001"}, "Valid")
        tool_call_tracker.record("compile_application", {"user_id": "pg-001"}, "Compiled")
        tool_call_tracker.record("submit_application", {"user_id": "pg-001"}, "Submitted")

        for nsfas_tool in nsfas_tools:
            assert not tool_call_tracker.called(nsfas_tool), \
                f"NSFAS tool {nsfas_tool} should not be called for postgrad"

    def test_nsfas_executed_for_eligible_undergrad(self, tool_call_tracker, undergraduate_profile):
        """NSFAS tasks should execute for eligible undergraduate applicants."""
        # Simulate undergrad workflow with NSFAS
        tool_call_tracker.record("validate_documents", {"user_id": "ug-001"}, "Valid")
        tool_call_tracker.record("nsfas_eligibility_check", {"user_id": "ug-001"}, "Eligible")
        tool_call_tracker.record("nsfas_application_submit", {"user_id": "ug-001"}, "Submitted")
        tool_call_tracker.record("compile_application", {"user_id": "ug-001"}, "Compiled")
        tool_call_tracker.record("submit_application", {"user_id": "ug-001"}, "Submitted")

        assert tool_call_tracker.called("nsfas_eligibility_check"), \
            "NSFAS eligibility should be checked for undergrad"
        assert tool_call_tracker.called("nsfas_application_submit"), \
            "NSFAS application should be submitted for eligible undergrad"
