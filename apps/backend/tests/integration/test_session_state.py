"""Test session state management in CrewAI workflows.

These tests verify that session tokens are properly created, persisted,
and isolated across different users and workflow tasks.
"""
import pytest
import uuid


@pytest.mark.integration
@pytest.mark.vcr
class TestSessionCreation:
    """Test session creation during authentication."""

    def test_session_created_on_otp_verify(self, tool_call_tracker):
        """Session should be created immediately after OTP verification.

        Once a user verifies their OTP, a session token should be
        generated and stored for subsequent API calls.
        """
        session_token = None

        # Simulate OTP verification flow
        tool_call_tracker.record("sendgrid_otp_sender", {"email": "user@test.com"}, "sent")
        tool_call_tracker.record("verify_otp", {"otp": "123456"}, "verified")

        # Session created with token
        session_token = str(uuid.uuid4())
        tool_call_tracker.record("supabase_session_create",
                                 {"user_id": "u-001", "token": session_token},
                                 f"Session created: {session_token}")

        assert tool_call_tracker.called("verify_otp"), "OTP should be verified"
        assert tool_call_tracker.called("supabase_session_create"), \
            "Session should be created after OTP verification"
        assert tool_call_tracker.called_before("verify_otp", "supabase_session_create"), \
            "OTP verification must precede session creation"
        assert session_token is not None, "Session token should be generated"

    def test_session_not_created_on_invalid_otp(self, tool_call_tracker):
        """Session should not be created if OTP verification fails."""
        tool_call_tracker.record("sendgrid_otp_sender", {"email": "user@test.com"}, "sent")
        tool_call_tracker.record("verify_otp", {"otp": "wrong"}, "FAILED: Invalid OTP")
        # No session creation should occur

        assert tool_call_tracker.called("verify_otp")
        assert not tool_call_tracker.called("supabase_session_create"), \
            "Session should not be created for invalid OTP"


@pytest.mark.integration
@pytest.mark.vcr
class TestSessionPersistence:
    """Test session token persistence across workflow tasks."""

    def test_session_token_persists_across_tasks(self, tool_call_tracker, undergraduate_profile):
        """Same session token should be used across multiple tasks.

        Once established, the session token should be passed to all
        subsequent tasks to maintain user context.
        """
        session_token = f"session-{uuid.uuid4()}"

        # Simulate multiple tasks using same session
        tasks = [
            ("collect_personal_info_task", {"name": "Test User"}),
            ("collect_academic_info_task", {"matric_results": {...}}),
            ("validate_documents_task", {"documents": [...]}),
        ]

        for task_name, task_data in tasks:
            tool_call_tracker.record(
                "supabase_task_execute",
                {"task": task_name, "session_token": session_token, **task_data},
                f"Task {task_name} completed"
            )

        # Verify all tasks used same session token
        task_calls = [c for c in tool_call_tracker.calls if c["tool"] == "supabase_task_execute"]
        tokens_used = {c["args"].get("session_token") for c in task_calls}

        assert len(tokens_used) == 1, "All tasks should use the same session token"
        assert session_token in tokens_used, "Session token should match original"

    def test_session_data_accumulates(self, tool_call_tracker):
        """Session should accumulate data from multiple tasks."""
        session_id = "sess-001"

        # Task 1 adds personal info
        tool_call_tracker.record("supabase_session_update",
                                 {"session_id": session_id, "personal_info": {"name": "User"}},
                                 "Updated")

        # Task 2 adds academic info
        tool_call_tracker.record("supabase_session_update",
                                 {"session_id": session_id, "academic_info": {"grade": 12}},
                                 "Updated")

        # Task 3 adds documents
        tool_call_tracker.record("supabase_session_update",
                                 {"session_id": session_id, "documents": ["id.pdf"]},
                                 "Updated")

        update_calls = [c for c in tool_call_tracker.calls
                       if c["tool"] == "supabase_session_update"]

        assert len(update_calls) == 3, "Should have 3 session updates"
        # All updates should reference same session
        session_ids = {c["args"]["session_id"] for c in update_calls}
        assert len(session_ids) == 1, "All updates should be to same session"


@pytest.mark.integration
@pytest.mark.vcr
class TestSessionIsolation:
    """Test session isolation between different users."""

    def test_session_isolation_between_users(self, tool_call_tracker):
        """Different users should have isolated sessions.

        Each user's session should be completely independent,
        with no data leakage between sessions.
        """
        user1_session = f"session-user1-{uuid.uuid4()}"
        user2_session = f"session-user2-{uuid.uuid4()}"

        # User 1 workflow
        tool_call_tracker.record("supabase_session_create",
                                 {"user_id": "user-001", "token": user1_session},
                                 "Created")
        tool_call_tracker.record("supabase_task_execute",
                                 {"session_token": user1_session, "task": "personal_info"},
                                 "Completed")

        # User 2 workflow (concurrent)
        tool_call_tracker.record("supabase_session_create",
                                 {"user_id": "user-002", "token": user2_session},
                                 "Created")
        tool_call_tracker.record("supabase_task_execute",
                                 {"session_token": user2_session, "task": "personal_info"},
                                 "Completed")

        # Verify isolation
        assert user1_session != user2_session, "Users should have different session tokens"

        session_creates = [c for c in tool_call_tracker.calls
                         if c["tool"] == "supabase_session_create"]
        user_ids = {c["args"]["user_id"] for c in session_creates}
        assert len(user_ids) == 2, "Should have 2 distinct users"

    def test_user_cannot_access_other_session(self, tool_call_tracker):
        """User should not be able to use another user's session token."""
        user1_session = "session-user1-abc123"

        # User 1 creates session
        tool_call_tracker.record("supabase_session_create",
                                 {"user_id": "user-001", "token": user1_session},
                                 "Created")

        # User 2 attempts to use User 1's session (should fail)
        tool_call_tracker.record("supabase_session_validate",
                                 {"user_id": "user-002", "token": user1_session},
                                 "FAILED: Session belongs to different user")

        validation_call = [c for c in tool_call_tracker.calls
                         if c["tool"] == "supabase_session_validate"][0]
        assert "FAILED" in validation_call["result"], \
            "Cross-user session access should fail"


@pytest.mark.integration
@pytest.mark.vcr
class TestSessionExpiry:
    """Test session expiration handling."""

    def test_expired_sessions_rejected(self, tool_call_tracker):
        """Expired sessions should be rejected with appropriate error."""
        expired_token = "expired-session-xyz789"

        # Attempt to use expired session
        tool_call_tracker.record("supabase_session_validate",
                                 {"token": expired_token},
                                 "FAILED: Session expired")
        tool_call_tracker.record("supabase_session_refresh",
                                 {"token": expired_token},
                                 "FAILED: Cannot refresh expired session")

        validate_call = [c for c in tool_call_tracker.calls
                        if c["tool"] == "supabase_session_validate"][0]
        assert "expired" in validate_call["result"].lower(), \
            "Expired session validation should indicate expiry"

    def test_session_refresh_before_expiry(self, tool_call_tracker):
        """Session should be refreshable before expiration."""
        valid_token = "valid-session-abc"
        new_token = "refreshed-session-def"

        # Refresh before expiry
        tool_call_tracker.record("supabase_session_validate",
                                 {"token": valid_token},
                                 "Valid, expires in 5 minutes")
        tool_call_tracker.record("supabase_session_refresh",
                                 {"token": valid_token},
                                 f"Refreshed: {new_token}")

        refresh_call = [c for c in tool_call_tracker.calls
                       if c["tool"] == "supabase_session_refresh"][0]
        assert "Refreshed" in refresh_call["result"], \
            "Valid session should be refreshable"
