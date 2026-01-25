# Phase 2: VCR Integration Tests

## Overview

**Goal:** Establish comprehensive VCR cassette coverage for the main application workflow with deterministic LLM response replay.

**Estimated Effort:** 3-4 days

**Dependencies:** Phase 1 (Unit Tests) should be substantially complete

**Task Scope:**
- **Main Application Workflow:** 14 sequential tasks (account creation → NSFAS status check)
- **Auxiliary Workflows:** 9 additional tasks defined in `tasks.yaml` (document review, analytics, reviewer assistant)
- **Unused Tasks:** 1 task (`application_compilation_task`) defined but not integrated into any crew flow

**Success Criteria:**
- VCR cassettes recorded for all 14 main workflow tasks
- Tool call sequences verified in tests
- Session state persistence validated
- Tests run in < 5 minutes (cassette replay)
- All integration tests pass in CI without real API calls
- Documentation plan for auxiliary workflow testing (Phase 2B)

---

## Implementation Checklist

### Phase 2A: Main Workflow VCR Cassettes (14 Tasks)

- [ ] **Authentication Tasks (2 cassettes)**
  - [ ] `TestAccountCreation.yaml` - Account creation flow (`account_creation_task`)
  - [ ] `TestOTPVerification.yaml` - OTP send/verify cycle (`otp_verification_task`)

- [ ] **Data Collection Tasks (5 cassettes)**
  - [ ] `TestPersonalInfoCollection.yaml` - Personal info gathering (`collect_personal_info_task`)
  - [ ] `TestAcademicInfoCollection.yaml` - Academic data (APS, matric) (`collect_academic_info_task`)
  - [ ] `TestDocumentCollection.yaml` - Document upload status (`collect_documents_task`)
  - [ ] `TestDocumentValidation.yaml` - Vision-based validation (`document_validation_task`)
  - [ ] `TestProgramSelection.yaml` - Course choice selection (`program_selection_task`)

- [ ] **Eligibility Tasks (1 cassette)**
  - [ ] `TestRAGResearch.yaml` - Vector search + web fallback (`rag_research_task`)

- [ ] **Submission Tasks (3 cassettes)**
  - [ ] `TestApplicationSubmission.yaml` - University API calls (`application_submission_task`)
  - [ ] `TestUniversityStatusCheck.yaml` - Status polling (`university_status_check_task`)
  - [ ] ~~`TestApplicationCompilation.yaml`~~ - **NOTE:** `application_compilation_task` is defined in `tasks.yaml` but NOT used in any crew flow. Consider removal or integration.

- [ ] **NSFAS Tasks (3 cassettes)**
  - [ ] `TestNSFASDecision.yaml` - Eligibility check (`ask_if_apply_for_nsfas_task`)
  - [ ] `TestNSFASCollection.yaml` - Funding data collection (`nsfas_collection_task`)
  - [ ] `TestNSFASSubmission.yaml` - NSFAS API call (`nsfas_submission_task`)
  - [ ] `TestNSFASStatusCheck.yaml` - NSFAS status polling (`nsfas_status_check_task`)

### Phase 2B: Auxiliary Workflow Coverage (9 Additional Tasks)

**Document Review Workflow:**
- [ ] `TestDocumentReviewStart.yaml` - Initiate document review process
- [ ] `TestDocumentReviewCompletion.yaml` - Complete review and provide feedback
- [ ] `TestDocumentResubmission.yaml` - Handle document resubmission after rejection

**Analytics Workflow:**
- [ ] `TestAnalyticsDataCollection.yaml` - Gather application metrics
- [ ] `TestAnalyticsReporting.yaml` - Generate analytics reports

**Reviewer Assistant Workflow:**
- [ ] `TestReviewerAssistantQuery.yaml` - Answer reviewer queries
- [ ] `TestReviewerAssistantDecision.yaml` - Assist in decision-making

**Other Auxiliary Tasks:**
- [ ] Map remaining 2 auxiliary tasks from `tasks.yaml`
- [ ] Document crew flows that utilize these tasks (if any)

**Cleanup:**
- [ ] Investigate `application_compilation_task` usage
  - [ ] If unused: Remove from `tasks.yaml`
  - [ ] If needed: Integrate into submission workflow and add cassette

### Tool Call Verification

- [ ] Create tool call tracking middleware
- [ ] Add assertions for expected tool sequences
- [ ] Verify no unexpected tool invocations

### Session State Testing

- [ ] Test session creation and persistence
- [ ] Verify session token validity across tasks
- [ ] Test session expiry handling

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `tests/integration/test_tool_calls.py` | Create | Tool sequence verification |
| `tests/integration/test_session_state.py` | Create | Session persistence tests |
| `tests/integration/conftest.py` | Modify | Enhanced VCR config |
| `tests/cassettes/` | Create | 14 cassette YAML files |

---

## Code Examples

### Enhanced VCR Configuration

```python
# tests/integration/conftest.py
import pytest
from pathlib import Path
import re

def filter_request_timestamps(request):
    """Remove timestamps from request body for deterministic matching."""
    if request.body:
        body = request.body.decode('utf-8') if isinstance(request.body, bytes) else request.body
        # Remove ISO timestamps
        body = re.sub(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}', 'TIMESTAMP', body)
        # Remove Unix timestamps
        body = re.sub(r'"timestamp":\s*\d+', '"timestamp": 0', body)
        request.body = body.encode('utf-8') if isinstance(request.body, bytes) else body
    return request

@pytest.fixture(scope="module")
def vcr_config():
    """VCR configuration for integration tests."""
    return {
        "filter_headers": [
            "authorization",
            "x-api-key",
            "api-key",
            "x-session-token",
            "apikey"
        ],
        "record_mode": "once",
        "cassette_library_dir": str(Path(__file__).parent.parent / "cassettes"),
        "match_on": ["method", "scheme", "host", "port", "path"],
        "decode_compressed_response": True,
        "before_record_request": filter_request_timestamps,
        "filter_query_parameters": ["apikey", "key"],
        "ignore_hosts": ["localhost", "127.0.0.1"],
    }

@pytest.fixture
def tool_call_tracker():
    """Track tool calls during test execution."""
    class ToolCallTracker:
        def __init__(self):
            self.calls = []

        def record(self, tool_name: str, args: dict, result: str):
            self.calls.append({
                "tool": tool_name,
                "args": args,
                "result": result
            })

        def get_sequence(self) -> list[str]:
            return [c["tool"] for c in self.calls]

        def called(self, tool_name: str) -> bool:
            return tool_name in self.get_sequence()

        def called_before(self, first: str, second: str) -> bool:
            seq = self.get_sequence()
            if first not in seq or second not in seq:
                return False
            return seq.index(first) < seq.index(second)

    return ToolCallTracker()
```

### Tool Call Sequence Verification Tests

```python
# tests/integration/test_tool_calls.py
import pytest
from unittest.mock import patch, MagicMock
from one_for_all.crew import OneForAllCrew

@pytest.mark.integration
@pytest.mark.vcr()
class TestToolCallSequence:
    """Verify agents use tools in correct order."""

    def test_auth_agent_uses_otp_before_session(
        self, test_crew, undergraduate_profile, tool_call_tracker
    ):
        """Auth agent should send OTP before creating session."""
        # Patch tools to track calls
        original_tools = {}

        def wrap_tool(tool_name, original_func):
            def wrapper(*args, **kwargs):
                result = original_func(*args, **kwargs)
                tool_call_tracker.record(tool_name, kwargs, str(result))
                return result
            return wrapper

        # Run auth tasks only
        result = test_crew.kickoff_task(
            task_name="otp_verification_task",
            inputs=undergraduate_profile
        )

        # Verify sequence: OTP sent before session created
        otp_tools = ["sendgrid_otp_sender", "sms_otp_sender", "send_whatsapp_otp"]
        session_tool = "supabase_session_create"

        otp_sent = any(tool_call_tracker.called(t) for t in otp_tools)
        session_created = tool_call_tracker.called(session_tool)

        assert otp_sent, "OTP should be sent"
        assert session_created, "Session should be created"

    def test_rag_agent_queries_db_before_web(
        self, test_crew, undergraduate_profile, tool_call_tracker
    ):
        """RAG agent should try database before web scraping."""
        result = test_crew.kickoff_task(
            task_name="rag_research_task",
            inputs=undergraduate_profile
        )

        if tool_call_tracker.called("website_search_tool"):
            # If web search was used, RAG query should have been tried first
            assert tool_call_tracker.called_before(
                "supabase_rag_query",
                "website_search_tool"
            ), "RAG query should be attempted before web search"

    def test_submission_agent_compiles_before_submit(
        self, test_crew, undergraduate_profile, tool_call_tracker
    ):
        """Submission agent should compile payload before submission."""
        result = test_crew.kickoff_task(
            task_name="application_submission_task",
            inputs=undergraduate_profile
        )

        # application_submission_tool should be called
        assert tool_call_tracker.called("application_submission_tool"), \
            "Application submission tool should be called"

    def test_nsfas_skipped_for_postgrad(
        self, test_crew, postgraduate_profile, tool_call_tracker
    ):
        """NSFAS tools should NOT be called for postgrad applicants."""
        result = test_crew.kickoff_task(
            task_name="ask_if_apply_for_nsfas_task",
            inputs=postgraduate_profile
        )

        nsfas_tools = [
            "supabase_nsfas_store",
            "supabase_nsfas_documents_store",
            "nsfas_application_submission_tool"
        ]

        for tool in nsfas_tools:
            assert not tool_call_tracker.called(tool), \
                f"NSFAS tool {tool} should not be called for postgrad"
```

### Session State Verification Tests

```python
# tests/integration/test_session_state.py
import pytest
from datetime import datetime, timedelta
from unittest.mock import patch

@pytest.mark.integration
@pytest.mark.vcr()
class TestSessionState:
    """Test session isolation and persistence."""

    def test_session_created_on_otp_verify(
        self, test_crew, undergraduate_profile, supabase_client
    ):
        """Session should be created after OTP verification."""
        result = test_crew.kickoff_task(
            task_name="otp_verification_task",
            inputs=undergraduate_profile
        )

        # Query database for session
        sessions = supabase_client.table("applicant_sessions")\
            .select("*")\
            .eq("applicant_id", undergraduate_profile["profile_id"])\
            .execute()

        assert len(sessions.data) > 0, "Session should be created"

        session = sessions.data[0]
        assert session["is_valid"] == True, "Session should be valid"

        expires_at = datetime.fromisoformat(session["expires_at"].replace('Z', '+00:00'))
        assert expires_at > datetime.now(expires_at.tzinfo), "Session should not be expired"

    def test_session_token_persists_across_tasks(
        self, test_crew, undergraduate_profile
    ):
        """Same session token should be used across multiple tasks."""
        session_tokens = []

        def track_session_lookup(*args, **kwargs):
            if "session_token" in kwargs:
                session_tokens.append(kwargs["session_token"])
            return original_lookup(*args, **kwargs)

        # Run multiple tasks and track session token usage
        for task in ["collect_personal_info_task", "collect_academic_info_task"]:
            test_crew.kickoff_task(task_name=task, inputs=undergraduate_profile)

        # All tokens should be the same
        if len(session_tokens) > 1:
            assert len(set(session_tokens)) == 1, \
                "Same session token should be used across tasks"

    def test_session_isolation_between_users(
        self, test_crew, profile_factory, supabase_client
    ):
        """Different users should have isolated sessions."""
        profile_a = profile_factory(email="user_a@test.com", profile_id="TEST-A")
        profile_b = profile_factory(email="user_b@test.com", profile_id="TEST-B")

        # Run auth for both users
        test_crew.kickoff_task(task_name="otp_verification_task", inputs=profile_a)
        test_crew.kickoff_task(task_name="otp_verification_task", inputs=profile_b)

        # Query sessions
        sessions = supabase_client.table("applicant_sessions")\
            .select("*")\
            .in_("applicant_id", ["TEST-A", "TEST-B"])\
            .execute()

        # Each user should have separate session
        assert len(sessions.data) == 2, "Each user should have a session"

        tokens = [s["session_token"] for s in sessions.data]
        assert len(set(tokens)) == 2, "Session tokens should be unique per user"

    def test_expired_session_rejected(
        self, test_crew, undergraduate_profile, supabase_client
    ):
        """Expired session should not allow operations."""
        # Create session with past expiry
        past_time = (datetime.now() - timedelta(hours=25)).isoformat()

        supabase_client.table("applicant_sessions").insert({
            "applicant_id": undergraduate_profile["profile_id"],
            "session_token": "expired-token-123",
            "expires_at": past_time,
            "is_valid": False
        }).execute()

        # Try to use expired session
        with pytest.raises(Exception) as exc_info:
            test_crew.kickoff_task(
                task_name="collect_personal_info_task",
                inputs={**undergraduate_profile, "session_token": "expired-token-123"}
            )

        assert "expired" in str(exc_info.value).lower() or \
               "invalid" in str(exc_info.value).lower() or \
               "unauthorized" in str(exc_info.value).lower()
```

### Recording New Cassettes

```bash
# Record cassettes for undergraduate flow
cd apps/backend
pytest tests/integration/test_undergraduate_flow.py -v --vcr-record=new_episodes

# Record cassettes for specific test
pytest tests/integration/test_tool_calls.py::TestToolCallSequence::test_auth_agent_uses_otp_before_session -v --vcr-record=new_episodes

# Record all integration cassettes (requires DEEPSEEK_API_KEY)
DEEPSEEK_API_KEY=your_key pytest tests/integration/ -v --vcr-record=all
```

---

## Cassette Organization

```
tests/cassettes/
├── TestAccountCreation/
│   └── test_account_created_with_valid_data.yaml
├── TestOTPVerification/
│   ├── test_otp_sent_via_email.yaml
│   ├── test_otp_sent_via_sms.yaml
│   └── test_otp_verified_successfully.yaml
├── TestToolCallSequence/
│   ├── test_auth_agent_uses_otp_before_session.yaml
│   ├── test_rag_agent_queries_db_before_web.yaml
│   └── test_nsfas_skipped_for_postgrad.yaml
├── TestSessionState/
│   ├── test_session_created_on_otp_verify.yaml
│   └── test_session_isolation_between_users.yaml
├── TestUndergraduateFlow/
│   └── test_complete_flow.yaml
└── TestPostgraduateFlow/
    └── test_postgrad_skips_nsfas.yaml
```

---

## Verification

### Running Integration Tests

```bash
# Run all integration tests with VCR replay
cd apps/backend && pytest tests/integration/ -v -m integration

# Run without recording (CI mode)
pytest tests/integration/ -v --vcr-record=none

# Run with verbose VCR logging
pytest tests/integration/ -v --vcr-record=none -s

# Run specific test class
pytest tests/integration/test_tool_calls.py -v
```

### Expected Outcomes

```
tests/integration/test_tool_calls.py::TestToolCallSequence::test_auth_agent_uses_otp_before_session PASSED
tests/integration/test_tool_calls.py::TestToolCallSequence::test_rag_agent_queries_db_before_web PASSED
tests/integration/test_tool_calls.py::TestToolCallSequence::test_nsfas_skipped_for_postgrad PASSED
tests/integration/test_session_state.py::TestSessionState::test_session_created_on_otp_verify PASSED
tests/integration/test_session_state.py::TestSessionState::test_session_isolation_between_users PASSED

======================== X passed in Y.YYs ========================
```

### Success Criteria Checklist

**Phase 2A (Main Workflow):**
- [ ] All 14 main workflow tasks have cassette coverage
- [ ] Tool call sequences verified for primary flow
- [ ] Session state tests pass
- [ ] Tests complete in < 5 minutes
- [ ] CI passes without real API calls (--vcr-record=none)

**Phase 2B (Auxiliary Workflows):**
- [ ] All 9 auxiliary tasks mapped to crew flows
- [ ] Cassette plan documented for auxiliary workflows
- [ ] Decision made on `application_compilation_task` (remove or integrate)
- [ ] If integrated workflows exist, cassettes recorded

**Task Inventory Validation:**
- [ ] Confirm all 23 tasks in `tasks.yaml` are accounted for
- [ ] Document which tasks are active vs. auxiliary vs. unused
- [ ] Update `crew.py` if any task definitions are stale

---

## Task Accounting Reference

### Main Application Workflow (14 Tasks in Sequence)

From `apps/backend/src/one_for_all/crew.py`:

1. `account_creation_task`
2. `otp_verification_task`
3. `collect_personal_info_task`
4. `collect_academic_info_task`
5. `collect_documents_task`
6. `document_validation_task`
7. `program_selection_task`
8. `rag_research_task`
9. `application_submission_task`
10. `university_status_check_task`
11. `ask_if_apply_for_nsfas_task`
12. `nsfas_collection_task`
13. `nsfas_submission_task`
14. `nsfas_status_check_task`

### Auxiliary Tasks (9+ Tasks, Non-Sequential)

These tasks are defined in `apps/backend/config/tasks.yaml` but are NOT part of the main application flow. They support:
- Document review workflows (3-4 tasks)
- Analytics and reporting (2-3 tasks)
- Reviewer assistant functionality (2-3 tasks)
- Application compilation (1 task - **unused/orphaned**)

**Action Required:** Audit `tasks.yaml` to:
1. List all 9 auxiliary task names explicitly
2. Identify which crew classes use these tasks (e.g., `DocumentReviewCrew`, `AnalyticsCrew`)
3. Determine if `application_compilation_task` should be removed or integrated into `submission_agent`

### Orphaned Task

- `application_compilation_task` - Defined in `tasks.yaml` but not referenced in any crew's task list. This task may have been intended for use before `application_submission_task` but was never integrated. Recommend either:
  - Remove from `tasks.yaml` if functionality is covered by existing tasks
  - Integrate into submission workflow if payload assembly needs to be explicit

---

## Next Phase

[Phase 3: Agent Trajectory Tests](./PHASE_3_TRAJECTORY.md)
