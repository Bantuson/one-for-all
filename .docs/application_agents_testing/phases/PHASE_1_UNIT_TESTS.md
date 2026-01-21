# Phase 1: Unit Tests Foundation

## Overview

**Goal:** Establish a solid unit testing foundation for all CrewAI tools with proper mocking and isolation.

**Estimated Effort:** 3-4 days

**Dependencies:** None (this is the foundation phase)

**Success Criteria:**
- 80% code coverage for `src/one_for_all/tools/` directory
- All 30+ tools have at least one unit test
- Tests run in < 2 minutes
- No external API calls in unit tests (all mocked)

---

## Implementation Checklist

### Tool Categories to Test

- [ ] **OTP/Auth Tools** (5 tools)
  - [ ] `sendgrid_otp_sender` - Email OTP delivery
  - [ ] `sms_otp_sender` - SMS OTP delivery
  - [ ] `send_whatsapp_otp` - WhatsApp OTP delivery
  - [ ] `verify_otp` - OTP validation (constant-time comparison)
  - [ ] `check_otp_status` - OTP state check

- [ ] **Session Tools** (4 tools)
  - [ ] `supabase_session_create` - Session creation
  - [ ] `supabase_session_lookup` - Session validation
  - [ ] `supabase_session_extend` - Session renewal
  - [ ] `generate_student_number` - Unique ID generation

- [ ] **User/Application Storage Tools** (4 tools)
  - [ ] `supabase_user_store` - User record creation
  - [ ] `supabase_user_lookup` - User retrieval
  - [ ] `supabase_application_store` - Application persistence
  - [ ] `application_submission_tool` - University submission

- [ ] **RAG Tools** (3 tools)
  - [ ] `supabase_rag_query` - Vector similarity search
  - [ ] `supabase_rag_store` - Embedding storage
  - [ ] `website_search_tool` - Web scraping fallback

- [ ] **NSFAS Tools** (4 tools)
  - [ ] `supabase_nsfas_store` - NSFAS application storage
  - [ ] `supabase_nsfas_documents_store` - NSFAS document storage
  - [ ] `nsfas_application_submission_tool` - NSFAS submission
  - [ ] `nsfas_status_tool` - NSFAS status check

- [ ] **Document Tools** (4 tools)
  - [ ] `vision_analyze_document` - GPT-4V document analysis
  - [ ] `document_flag_tool` - Flag document issues
  - [ ] `document_approve_tool` - Approve documents
  - [ ] `get_application_documents` - Fetch document list

- [ ] **Status Tools** (2 tools)
  - [ ] `application_status_tool` - University application status
  - [ ] `nsfas_status_tool` - NSFAS funding status

### Supporting Infrastructure

- [ ] Create `tests/unit/test_tools/` directory structure
- [ ] Set up conftest.py with mock fixtures
- [ ] Add pytest markers for unit tests (`@pytest.mark.unit`)
- [ ] Configure coverage thresholds

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `tests/unit/test_tools/__init__.py` | Create | Package init |
| `tests/unit/test_tools/test_otp_tools.py` | Create | OTP tool tests |
| `tests/unit/test_tools/test_session_tools.py` | Create | Session tool tests |
| `tests/unit/test_tools/test_storage_tools.py` | Create | Storage tool tests |
| `tests/unit/test_tools/test_rag_tools.py` | Create | RAG tool tests |
| `tests/unit/test_tools/test_nsfas_tools.py` | Create | NSFAS tool tests |
| `tests/unit/test_tools/test_document_tools.py` | Create | Document tool tests |
| `tests/unit/test_tools/conftest.py` | Create | Shared fixtures for tool tests |
| `pyproject.toml` | Modify | Add coverage thresholds |

---

## Code Examples

### Mock Supabase Client Fixture

```python
# tests/unit/test_tools/conftest.py
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

@pytest.fixture
def mock_supabase():
    """Mock Supabase client for unit tests."""
    mock = MagicMock()
    mock.table = MagicMock(return_value=mock)
    mock.select = MagicMock(return_value=mock)
    mock.insert = MagicMock(return_value=mock)
    mock.update = MagicMock(return_value=mock)
    mock.eq = MagicMock(return_value=mock)
    mock.single = MagicMock(return_value=mock)
    mock.execute = AsyncMock(return_value=MagicMock(data=[{"id": "test-123"}]))
    return mock

@pytest.fixture
def mock_sendgrid():
    """Mock SendGrid client for OTP tests."""
    with patch('one_for_all.tools.otp_verification.SendGridAPIClient') as mock:
        mock_instance = MagicMock()
        mock_instance.send.return_value = MagicMock(status_code=202)
        mock.return_value = mock_instance
        yield mock

@pytest.fixture
def mock_twilio():
    """Mock Twilio client for SMS/WhatsApp tests."""
    with patch('one_for_all.tools.otp_verification.Client') as mock:
        mock_instance = MagicMock()
        mock_instance.messages.create.return_value = MagicMock(sid='SM123')
        mock.return_value = mock_instance
        yield mock
```

### OTP Tool Unit Tests

```python
# tests/unit/test_tools/test_otp_tools.py
import pytest
from unittest.mock import patch, MagicMock
from one_for_all.tools.otp_verification import verify_otp, check_otp_status

@pytest.mark.unit
class TestOTPVerification:
    """Unit tests for OTP verification tools."""

    def test_verify_otp_valid(self, mock_supabase):
        """Valid OTP should return OTP_VALID."""
        # Setup mock to return matching OTP
        mock_supabase.execute.return_value.data = [{
            "otp_code": "123456",
            "expires_at": "2026-12-31T23:59:59Z",
            "attempts": 0
        }]

        with patch('one_for_all.tools.otp_verification.supabase', mock_supabase):
            result = verify_otp(
                identifier="test@example.com",
                submitted_code="123456"
            )

        assert "OTP_VALID" in result

    def test_verify_otp_invalid_code(self, mock_supabase):
        """Invalid OTP code should return OTP_INVALID."""
        mock_supabase.execute.return_value.data = [{
            "otp_code": "123456",
            "expires_at": "2026-12-31T23:59:59Z",
            "attempts": 0
        }]

        with patch('one_for_all.tools.otp_verification.supabase', mock_supabase):
            result = verify_otp(
                identifier="test@example.com",
                submitted_code="000000"  # Wrong code
            )

        assert "OTP_INVALID" in result

    def test_verify_otp_expired(self, mock_supabase):
        """Expired OTP should return OTP_EXPIRED."""
        mock_supabase.execute.return_value.data = [{
            "otp_code": "123456",
            "expires_at": "2020-01-01T00:00:00Z",  # Past date
            "attempts": 0
        }]

        with patch('one_for_all.tools.otp_verification.supabase', mock_supabase):
            result = verify_otp(
                identifier="test@example.com",
                submitted_code="123456"
            )

        assert "EXPIRED" in result or "OTP_INVALID" in result

    def test_verify_otp_max_attempts(self, mock_supabase):
        """OTP with max attempts exceeded should be rejected."""
        mock_supabase.execute.return_value.data = [{
            "otp_code": "123456",
            "expires_at": "2026-12-31T23:59:59Z",
            "attempts": 5  # Max attempts exceeded
        }]

        with patch('one_for_all.tools.otp_verification.supabase', mock_supabase):
            result = verify_otp(
                identifier="test@example.com",
                submitted_code="123456"
            )

        assert "ATTEMPTS" in result or "EXCEEDED" in result or "OTP_INVALID" in result
```

### Session Tool Unit Tests

```python
# tests/unit/test_tools/test_session_tools.py
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta

@pytest.mark.unit
class TestSessionTools:
    """Unit tests for session management tools."""

    def test_session_create_generates_token(self, mock_supabase):
        """Session creation should generate unique token."""
        from one_for_all.tools.supabase_session_create import supabase_session_create

        with patch('one_for_all.tools.supabase_session_create.supabase', mock_supabase):
            result = supabase_session_create(
                applicant_id="test-user-123",
                ip_address="192.168.1.1",
                user_agent="TestBrowser/1.0"
            )

        # Should contain session token
        assert "session" in result.lower() or "token" in result.lower()
        # Insert should be called
        mock_supabase.table.assert_called()

    def test_session_lookup_valid(self, mock_supabase):
        """Valid session lookup should return session data."""
        from one_for_all.tools.supabase_session_lookup import supabase_session_lookup

        future_time = (datetime.now() + timedelta(hours=12)).isoformat()
        mock_supabase.execute.return_value.data = [{
            "session_token": "valid-token-123",
            "applicant_id": "user-123",
            "expires_at": future_time,
            "is_valid": True
        }]

        with patch('one_for_all.tools.supabase_session_lookup.supabase', mock_supabase):
            result = supabase_session_lookup(session_token="valid-token-123")

        assert "valid" in result.lower() or "user-123" in result

    def test_session_lookup_expired(self, mock_supabase):
        """Expired session should indicate invalid."""
        from one_for_all.tools.supabase_session_lookup import supabase_session_lookup

        past_time = (datetime.now() - timedelta(hours=25)).isoformat()
        mock_supabase.execute.return_value.data = [{
            "session_token": "expired-token",
            "expires_at": past_time,
            "is_valid": False
        }]

        with patch('one_for_all.tools.supabase_session_lookup.supabase', mock_supabase):
            result = supabase_session_lookup(session_token="expired-token")

        assert "expired" in result.lower() or "invalid" in result.lower() or "not found" in result.lower()
```

### RAG Tool Unit Tests

```python
# tests/unit/test_tools/test_rag_tools.py
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
import numpy as np

@pytest.mark.unit
class TestRAGTools:
    """Unit tests for RAG retrieval tools."""

    def test_rag_query_returns_matches(self, mock_supabase):
        """RAG query should return matching embeddings."""
        from one_for_all.tools.supabase_rag_query import supabase_rag_query

        # Mock RPC call for vector search
        mock_supabase.rpc.return_value.execute = AsyncMock(return_value=MagicMock(
            data=[
                {"content": "UCT BSc Computer Science requires APS 36", "similarity": 0.92},
                {"content": "Mathematics 60% minimum required", "similarity": 0.88}
            ]
        ))

        with patch('one_for_all.tools.supabase_rag_query.supabase', mock_supabase):
            with patch('one_for_all.tools.supabase_rag_query.get_embedding', return_value=[0.1] * 1536):
                result = supabase_rag_query(
                    query="What are UCT Computer Science requirements?",
                    match_count=5
                )

        assert "UCT" in result or "APS" in result or "36" in result

    def test_rag_query_no_matches(self, mock_supabase):
        """RAG query with no matches should indicate NO_MATCH."""
        from one_for_all.tools.supabase_rag_query import supabase_rag_query

        mock_supabase.rpc.return_value.execute = AsyncMock(return_value=MagicMock(data=[]))

        with patch('one_for_all.tools.supabase_rag_query.supabase', mock_supabase):
            with patch('one_for_all.tools.supabase_rag_query.get_embedding', return_value=[0.1] * 1536):
                result = supabase_rag_query(
                    query="Obscure university nobody knows about",
                    match_count=5
                )

        assert "no" in result.lower() or "match" in result.lower() or "found" in result.lower()

    def test_rag_store_creates_embedding(self, mock_supabase):
        """RAG store should create and persist embedding."""
        from one_for_all.tools.supabase_rag_store import supabase_rag_store

        mock_supabase.execute.return_value.data = [{"id": "emb-123"}]

        with patch('one_for_all.tools.supabase_rag_store.supabase', mock_supabase):
            with patch('one_for_all.tools.supabase_rag_store.get_embedding', return_value=[0.1] * 1536):
                result = supabase_rag_store(
                    content="UCT Medicine requires APS 42",
                    source_url="https://uct.ac.za/medicine",
                    university="UCT",
                    course="Medicine"
                )

        # Insert should be called
        mock_supabase.table.assert_called_with("rag_embeddings")
        assert "stored" in result.lower() or "success" in result.lower() or "emb-123" in result
```

---

## Verification

### Running Unit Tests

```bash
# Run all unit tests
cd apps/backend && pytest tests/unit/ -v -m unit

# Run with coverage
pytest tests/unit/ -v -m unit --cov=src/one_for_all/tools --cov-report=html

# Run specific tool category
pytest tests/unit/test_tools/test_otp_tools.py -v

# Run with verbose output for debugging
pytest tests/unit/ -v -m unit -s
```

### Expected Outcomes

```
tests/unit/test_tools/test_otp_tools.py::TestOTPVerification::test_verify_otp_valid PASSED
tests/unit/test_tools/test_otp_tools.py::TestOTPVerification::test_verify_otp_invalid_code PASSED
tests/unit/test_tools/test_otp_tools.py::TestOTPVerification::test_verify_otp_expired PASSED
tests/unit/test_tools/test_session_tools.py::TestSessionTools::test_session_create_generates_token PASSED
tests/unit/test_tools/test_session_tools.py::TestSessionTools::test_session_lookup_valid PASSED
...

======================== X passed in Y.YYs ========================

---------- coverage: ... ----------
Name                                    Stmts   Miss  Cover
-----------------------------------------------------------
src/one_for_all/tools/otp_verification.py    85     12    86%
src/one_for_all/tools/supabase_session_create.py  42      5    88%
src/one_for_all/tools/supabase_rag_query.py  58      8    86%
-----------------------------------------------------------
TOTAL                                    XXX     XX    80%+
```

### Success Criteria Checklist

- [ ] All unit tests pass
- [ ] Coverage >= 80% for tools directory
- [ ] No external API calls (verified via network monitoring)
- [ ] Tests complete in < 2 minutes
- [ ] All tool categories have tests

---

## Next Phase

[Phase 2: VCR Integration Tests](./PHASE_2_VCR_INTEGRATION.md)
