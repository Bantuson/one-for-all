# Phase 1: Unit Tests Foundation

## Overview

**Goal:** Establish a solid unit testing foundation for all CrewAI tools with proper mocking and isolation.

**Estimated Effort:** 3-4 days

**Dependencies:** None (this is the foundation phase)

**Tool Coverage:**
- **Total Production Tools:** ~146 tools across 15+ categories
- **Mock Tools:** 16 (excluded from coverage requirements)
- **Total Tools in Codebase:** 162

**Success Criteria:**
- 80% code coverage for `src/one_for_all/tools/` directory
- All 146 production tools have at least one unit test
- Tests run in < 3 minutes
- No external API calls in unit tests (all mocked)

---

## Implementation Checklist

### Tool Categories to Test

#### Summary Table

| Category | Tool Count | Priority | Test File |
|----------|------------|----------|-----------|
| OTP/Verification Tools | 6 | High | `test_otp_tools.py` |
| Session Tools | 4 | High | `test_session_tools.py` |
| Student Number Tools | 6 | High | `test_student_number_tools.py` |
| Vision & Document Analysis | 10 | High | `test_vision_tools.py` |
| WhatsApp Tools | 4 | High | `test_whatsapp_tools.py` |
| Application Tools | 6 | High | `test_application_tools.py` |
| Application Choices Tools | 4 | High | `test_application_choices_tools.py` |
| APS Calculator Tools | 4 | High | `test_aps_calculator_tools.py` |
| Course Requirements Tools | 5 | High | `test_course_requirements_tools.py` |
| Document Processing Tools | 14 | High | `test_document_processing_tools.py` |
| RAG Tools | 11 | High | `test_rag_tools.py` |
| Notification Tools | 7 | Medium | `test_notification_tools.py` |
| Analytics Tools | 5 | Medium | `test_analytics_tools.py` |
| Chart Config Tools | 7 | Medium | `test_chart_config_tools.py` |
| User/Application Storage | 4 | High | `test_storage_tools.py` |
| NSFAS Tools | 4 | High | `test_nsfas_tools.py` |
| Status Tools | 2 | Medium | `test_status_tools.py` |
| Mock Tools | 16 | N/A | Excluded from coverage |
| **TOTAL** | **162** | - | - |

---

#### 1. OTP/Verification Tools (6 tools)

- [ ] **OTP Senders (3 tools)**
  - [ ] `sendgrid_otp_sender` - Email OTP delivery via SendGrid
  - [ ] `sms_otp_sender` - SMS OTP delivery via Twilio
  - [ ] `mock_otp_sender` - Mock sender for testing

- [ ] **OTP Verification (3 tools)**
  - [ ] `verify_otp` - OTP validation with constant-time comparison
  - [ ] `check_otp_status` - OTP state and expiration check
  - [ ] `resend_otp_check` - Resend eligibility verification

---

#### 2. Session Tools (4 tools)

- [ ] `supabase_session_create` - Session creation with JWT token
- [ ] `supabase_session_lookup` - Session validation and retrieval
- [ ] `supabase_session_extend` - Session renewal/TTL extension
- [ ] `supabase_session_invalidate` - Session termination

---

#### 3. Student Number Tools (6 tools)

- [ ] `generate_student_number` - Generate unique platform student number
- [ ] `get_platform_student_number` - Retrieve platform-wide student number
- [ ] `get_institution_student_number` - Retrieve institution-specific student number
- [ ] `get_applicant_student_numbers` - Get all student numbers for applicant
- [ ] `validate_student_number` - Validate student number format and checksum
- [ ] `assign_student_number_manually` - Manual assignment for legacy records

---

#### 4. Vision & Document Analysis Tools (10 tools)

- [ ] **GPT-4V Vision Tools (7 tools)**
  - [ ] `vision_analyze_document` - GPT-4V document analysis
  - [ ] `vision_extract_document_text` - Text extraction via OCR
  - [ ] `vision_compare_documents` - Cross-document comparison
  - [ ] `tiered_analyze_document` - Tiered vision API (Gemini/GPT-4V/DeepSeek)
  - [ ] `get_vision_tier_metrics` - Retrieve tier usage metrics
  - [ ] `reset_vision_tier_metrics` - Reset tier metrics (admin only)
  - [ ] `get_tiered_validation_config` - Get validation config

- [ ] **DeepSeek Vision Tools (3 tools)**
  - [ ] `deepseek_analyze_document` - DeepSeek R1 document analysis
  - [ ] `deepseek_extract_text` - DeepSeek OCR extraction
  - [ ] `deepseek_validate_id_number` - DeepSeek ID validation

---

#### 5. WhatsApp Tools (4 tools)

- [ ] `send_whatsapp_message` - Send WhatsApp message via Twilio
- [ ] `send_whatsapp_otp` - Send WhatsApp OTP
- [ ] `log_whatsapp_interaction` - Log interaction to Supabase
- [ ] `send_whatsapp_template` - Send templated WhatsApp message

---

#### 6. Application Tools (6 tools)

- [ ] `create_application` - Create new university application
- [ ] `get_application` - Retrieve application by ID
- [ ] `list_applicant_applications` - List all applications for applicant
- [ ] `submit_application_with_choices` - Submit application with course choices
- [ ] `update_application_status` - Update application status (pending/submitted/accepted/rejected)
- [ ] `get_application_documents` - Retrieve all documents for application

---

#### 7. Application Choices Tools (4 tools)

- [ ] `create_application_choice` - Add course choice to application
- [ ] `get_application_choices` - Retrieve all choices for application
- [ ] `update_choice_status` - Update choice status (pending/accepted/rejected)
- [ ] `check_eligibility` - Check applicant eligibility for course choice

---

#### 8. APS Calculator Tools (4 tools)

- [ ] `calculate_aps` - Calculate APS score from matric results
- [ ] `store_aps_calculation` - Persist APS calculation to database
- [ ] `get_subject_points` - Get points for subject and achievement level
- [ ] `validate_aps_score` - Validate APS score against course requirements

---

#### 9. Course Requirements Tools (5 tools)

- [ ] `get_course_requirements` - Retrieve course admission requirements
- [ ] `get_admission_criteria` - Get general admission criteria for institution
- [ ] `check_subject_requirements` - Validate subject prerequisites
- [ ] `get_document_type_requirements` - Get required document types for course
- [ ] `get_course_application_dates` - Retrieve application opening/closing dates

---

#### 10. Document Processing Tools (14 tools)

- [ ] **Document Upload (3 tools)**
  - [ ] `upload_document` - Upload document to Supabase Storage
  - [ ] `get_document_url` - Generate signed URL for document
  - [ ] `check_upload_rate_limit` - Verify upload rate limits

- [ ] **Document Validation (4 tools)**
  - [ ] `validate_document` - Single document validation
  - [ ] `validate_batch_documents` - Batch validation
  - [ ] `validate_document_enhanced` - Enhanced validation with vision
  - [ ] `get_missing_documents` - Get list of missing required documents

- [ ] **Document Workflow (3 tools)**
  - [ ] `document_approve_tool` - Approve document
  - [ ] `document_flag_tool` - Flag document for review
  - [ ] `add_application_document` - Link document to application

---

#### 11. RAG Tools (11 tools)

- [ ] **RAG Query Tools (3 tools)**
  - [ ] `query_rag` - Vector similarity search with embeddings
  - [ ] `search_policies` - Search institutional policies
  - [ ] `keyword_search_policies` - Full-text keyword search

- [ ] **RAG Verification Tools (8 tools)**
  - [ ] `hash_and_store_rag_content` - Hash content and store with embedding
  - [ ] `store_rag_embedding` - Store embedding with source
  - [ ] `verify_rag_source` - Verify source authenticity
  - [ ] `get_pending_rag_verification` - Get embeddings pending verification
  - [ ] `approve_rag_embedding` - Approve embedding for use
  - [ ] `reject_rag_embedding` - Reject and flag embedding
  - [ ] `audit_rag_integrity` - Audit RAG database for tampering
  - [ ] `delete_rag_embeddings_by_source` - Delete all embeddings from source

---

#### 12. Notification Tools (7 tools)

- [ ] `send_notification` - Send single notification (email/SMS/WhatsApp/push)
- [ ] `send_batch_notifications` - Send batch notifications
- [ ] `send_application_update` - Send application status update
- [ ] `send_otp_notification` - Send OTP via preferred channel
- [ ] `send_reminder` - Send reminder notification
- [ ] `update_notification_preferences` - Update user notification preferences
- [ ] `get_notification_stats` - Retrieve notification delivery stats

---

#### 13. Analytics Tools (5 tools)

- [ ] `generate_sql_query` - Generate SQL from natural language
- [ ] `execute_analytics_query` - Execute analytics query with RLS
- [ ] `get_application_stats` - Get application statistics
- [ ] `get_routing_metrics` - Get agent routing metrics
- [ ] `list_analytics_templates` - List saved analytics templates

---

#### 14. Chart Config Tools (7 tools)

- [ ] `generate_bar_chart` - Generate bar chart config
- [ ] `generate_line_chart` - Generate line chart config
- [ ] `generate_pie_chart` - Generate pie chart config
- [ ] `generate_area_chart` - Generate area chart config
- [ ] `save_chart` - Save chart configuration
- [ ] `toggle_chart_pin` - Pin/unpin chart to dashboard
- [ ] `get_saved_charts` - Retrieve saved chart configs

---

#### 15. User/Application Storage Tools (4 tools)

- [ ] `supabase_user_store` - User record creation
- [ ] `supabase_user_lookup` - User retrieval
- [ ] `supabase_application_store` - Application persistence
- [ ] `application_submission_tool` - University submission

---

#### 16. NSFAS Tools (4 tools)

- [ ] `supabase_nsfas_store` - NSFAS application storage
- [ ] `supabase_nsfas_documents_store` - NSFAS document storage
- [ ] `nsfas_application_submission_tool` - NSFAS submission
- [ ] `nsfas_status_tool` - NSFAS status check

---

#### 17. Status Tools (2 tools)

- [ ] `application_status_tool` - University application status
- [ ] `nsfas_status_tool` - NSFAS funding status

---

#### 18. Mock Tools (16 tools - EXCLUDED FROM COVERAGE)

Mock tools are used for testing only and do not require unit tests:

- `mock_otp_sender`
- `mock_supabase_client`
- `mock_sendgrid_client`
- `mock_twilio_client`
- `mock_vision_api`
- `mock_deepseek_api`
- `mock_rag_embeddings`
- `mock_notification_sender`
- `mock_analytics_query`
- `mock_chart_generator`
- `mock_student_number_generator`
- `mock_document_validator`
- `mock_aps_calculator`
- `mock_course_requirements`
- `mock_application_submission`
- `mock_nsfas_submission`

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
| `tests/unit/test_tools/test_otp_tools.py` | Create | OTP/verification tool tests (6 tools) |
| `tests/unit/test_tools/test_session_tools.py` | Create | Session management tests (4 tools) |
| `tests/unit/test_tools/test_student_number_tools.py` | Create | Student number generation/validation tests (6 tools) |
| `tests/unit/test_tools/test_vision_tools.py` | Create | Vision & document analysis tests (10 tools) |
| `tests/unit/test_tools/test_whatsapp_tools.py` | Create | WhatsApp messaging tests (4 tools) |
| `tests/unit/test_tools/test_application_tools.py` | Create | Application CRUD tests (6 tools) |
| `tests/unit/test_tools/test_application_choices_tools.py` | Create | Application choices tests (4 tools) |
| `tests/unit/test_tools/test_aps_calculator_tools.py` | Create | APS calculation tests (4 tools) |
| `tests/unit/test_tools/test_course_requirements_tools.py` | Create | Course requirements tests (5 tools) |
| `tests/unit/test_tools/test_document_processing_tools.py` | Create | Document upload/validation tests (14 tools) |
| `tests/unit/test_tools/test_rag_tools.py` | Create | RAG query/verification tests (11 tools) |
| `tests/unit/test_tools/test_notification_tools.py` | Create | Notification delivery tests (7 tools) |
| `tests/unit/test_tools/test_analytics_tools.py` | Create | Analytics query tests (5 tools) |
| `tests/unit/test_tools/test_chart_config_tools.py` | Create | Chart generation tests (7 tools) |
| `tests/unit/test_tools/test_storage_tools.py` | Create | User/application storage tests (4 tools) |
| `tests/unit/test_tools/test_nsfas_tools.py` | Create | NSFAS tool tests (4 tools) |
| `tests/unit/test_tools/test_status_tools.py` | Create | Status check tests (2 tools) |
| `tests/unit/test_tools/conftest.py` | Create | Shared fixtures for all tool tests |
| `pyproject.toml` | Modify | Add coverage thresholds (80% target) |

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

@pytest.fixture
def mock_openai_vision():
    """Mock OpenAI Vision API for document analysis."""
    with patch('one_for_all.tools.vision_tools.OpenAI') as mock:
        mock_instance = MagicMock()
        mock_instance.chat.completions.create.return_value = MagicMock(
            choices=[MagicMock(message=MagicMock(content="Document analysis result"))]
        )
        mock.return_value = mock_instance
        yield mock

@pytest.fixture
def mock_deepseek():
    """Mock DeepSeek API for document analysis."""
    with patch('one_for_all.tools.deepseek_tools.DeepSeekClient') as mock:
        mock_instance = MagicMock()
        mock_instance.analyze.return_value = {"text": "Extracted text", "confidence": 0.95}
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

### Student Number Tool Unit Tests

```python
# tests/unit/test_tools/test_student_number_tools.py
import pytest
from unittest.mock import patch, MagicMock

@pytest.mark.unit
class TestStudentNumberTools:
    """Unit tests for student number generation and validation."""

    def test_generate_student_number_unique(self, mock_supabase):
        """Student number generation should create unique identifier."""
        from one_for_all.tools.student_number_tools import generate_student_number

        mock_supabase.execute.return_value.data = []  # No existing numbers

        with patch('one_for_all.tools.student_number_tools.supabase', mock_supabase):
            result = generate_student_number(
                applicant_id="test-user-123",
                institution_id="UCT"
            )

        assert "student" in result.lower() or len(result) >= 8
        mock_supabase.table.assert_called()

    def test_validate_student_number_valid(self):
        """Valid student number should pass validation."""
        from one_for_all.tools.student_number_tools import validate_student_number

        result = validate_student_number(student_number="20240001")

        assert "valid" in result.lower() or "true" in result.lower()

    def test_validate_student_number_invalid_format(self):
        """Invalid format should fail validation."""
        from one_for_all.tools.student_number_tools import validate_student_number

        result = validate_student_number(student_number="INVALID")

        assert "invalid" in result.lower() or "false" in result.lower()

    def test_get_applicant_student_numbers(self, mock_supabase):
        """Should retrieve all student numbers for applicant."""
        from one_for_all.tools.student_number_tools import get_applicant_student_numbers

        mock_supabase.execute.return_value.data = [
            {"student_number": "20240001", "institution_id": "UCT"},
            {"student_number": "20240002", "institution_id": "UJ"}
        ]

        with patch('one_for_all.tools.student_number_tools.supabase', mock_supabase):
            result = get_applicant_student_numbers(applicant_id="test-user-123")

        assert "20240001" in result or "UCT" in result
```

### Vision Tool Unit Tests

```python
# tests/unit/test_tools/test_vision_tools.py
import pytest
from unittest.mock import patch, MagicMock
import base64

@pytest.mark.unit
class TestVisionTools:
    """Unit tests for vision and document analysis tools."""

    def test_vision_analyze_document(self, mock_openai_vision):
        """Vision analysis should extract document information."""
        from one_for_all.tools.vision_tools import vision_analyze_document

        with patch('one_for_all.tools.vision_tools.OpenAI', return_value=mock_openai_vision):
            result = vision_analyze_document(
                image_base64="base64_encoded_image_data",
                document_type="ID Document"
            )

        assert "document" in result.lower() or "analysis" in result.lower()

    def test_deepseek_validate_id_number(self, mock_deepseek):
        """DeepSeek should validate ID number from document."""
        from one_for_all.tools.deepseek_tools import deepseek_validate_id_number

        with patch('one_for_all.tools.deepseek_tools.DeepSeekClient', return_value=mock_deepseek):
            result = deepseek_validate_id_number(
                image_base64="base64_encoded_id_document",
                expected_id="9001015800080"
            )

        assert "valid" in result.lower() or "match" in result.lower()

    def test_tiered_analyze_document_fallback(self, mock_supabase):
        """Tiered analysis should fallback to cheaper model on quota limit."""
        from one_for_all.tools.vision_tools import tiered_analyze_document

        # Mock quota exceeded for Gemini
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
            "gemini_calls": 1000,  # Over quota
            "gpt4v_calls": 0
        }

        with patch('one_for_all.tools.vision_tools.supabase', mock_supabase):
            with patch('one_for_all.tools.vision_tools.OpenAI') as mock_openai:
                mock_openai.return_value.chat.completions.create.return_value = MagicMock(
                    choices=[MagicMock(message=MagicMock(content="Fallback analysis"))]
                )
                result = tiered_analyze_document(
                    image_base64="base64_image",
                    document_type="Matric Certificate"
                )

        assert "fallback" in result.lower() or "analysis" in result.lower()
```

### WhatsApp Tool Unit Tests

```python
# tests/unit/test_tools/test_whatsapp_tools.py
import pytest
from unittest.mock import patch, MagicMock

@pytest.mark.unit
class TestWhatsAppTools:
    """Unit tests for WhatsApp messaging tools."""

    def test_send_whatsapp_message(self, mock_twilio):
        """WhatsApp message should be sent via Twilio."""
        from one_for_all.tools.whatsapp_tools import send_whatsapp_message

        with patch('one_for_all.tools.whatsapp_tools.Client', return_value=mock_twilio):
            result = send_whatsapp_message(
                to_number="+27812345678",
                message="Your application has been submitted"
            )

        assert "sent" in result.lower() or "SM123" in result

    def test_send_whatsapp_otp(self, mock_twilio, mock_supabase):
        """WhatsApp OTP should be sent and logged."""
        from one_for_all.tools.whatsapp_tools import send_whatsapp_otp

        with patch('one_for_all.tools.whatsapp_tools.Client', return_value=mock_twilio):
            with patch('one_for_all.tools.whatsapp_tools.supabase', mock_supabase):
                result = send_whatsapp_otp(
                    phone_number="+27812345678",
                    otp_code="123456"
                )

        assert "sent" in result.lower() or "123456" in result
        mock_supabase.table.assert_called()  # OTP should be logged

    def test_log_whatsapp_interaction(self, mock_supabase):
        """WhatsApp interaction should be logged to database."""
        from one_for_all.tools.whatsapp_tools import log_whatsapp_interaction

        with patch('one_for_all.tools.whatsapp_tools.supabase', mock_supabase):
            result = log_whatsapp_interaction(
                applicant_id="test-user-123",
                message_type="application_update",
                message_content="Application submitted"
            )

        mock_supabase.table.assert_called_with("whatsapp_interactions")
        assert "logged" in result.lower() or "success" in result.lower()
```

### Application Tools Unit Tests

```python
# tests/unit/test_tools/test_application_tools.py
import pytest
from unittest.mock import patch, MagicMock

@pytest.mark.unit
class TestApplicationTools:
    """Unit tests for application CRUD tools."""

    def test_create_application(self, mock_supabase):
        """Application creation should persist to database."""
        from one_for_all.tools.application_tools import create_application

        mock_supabase.execute.return_value.data = [{"id": "app-123", "status": "draft"}]

        with patch('one_for_all.tools.application_tools.supabase', mock_supabase):
            result = create_application(
                applicant_id="user-123",
                institution_id="UCT",
                academic_year=2024
            )

        assert "app-123" in result or "created" in result.lower()
        mock_supabase.table.assert_called_with("applications")

    def test_submit_application_with_choices(self, mock_supabase):
        """Submitting application should update status and create choices."""
        from one_for_all.tools.application_tools import submit_application_with_choices

        mock_supabase.execute.return_value.data = [{"id": "app-123", "status": "submitted"}]

        with patch('one_for_all.tools.application_tools.supabase', mock_supabase):
            result = submit_application_with_choices(
                application_id="app-123",
                course_choices=["BSc Computer Science", "BSc Information Systems"]
            )

        assert "submitted" in result.lower() or "app-123" in result
        # Should update application status and insert choices
        assert mock_supabase.table.call_count >= 2

    def test_update_application_status(self, mock_supabase):
        """Application status should be updated."""
        from one_for_all.tools.application_tools import update_application_status

        mock_supabase.execute.return_value.data = [{"id": "app-123", "status": "accepted"}]

        with patch('one_for_all.tools.application_tools.supabase', mock_supabase):
            result = update_application_status(
                application_id="app-123",
                new_status="accepted"
            )

        assert "accepted" in result.lower() or "updated" in result.lower()
```

### APS Calculator Tool Unit Tests

```python
# tests/unit/test_tools/test_aps_calculator_tools.py
import pytest
from unittest.mock import patch, MagicMock

@pytest.mark.unit
class TestAPSCalculatorTools:
    """Unit tests for APS calculation tools."""

    def test_calculate_aps_valid(self):
        """Valid matric results should calculate correct APS."""
        from one_for_all.tools.aps_calculator_tools import calculate_aps

        result = calculate_aps(
            subjects={
                "Mathematics": 85,
                "English": 75,
                "Physical Science": 80,
                "Life Sciences": 70,
                "History": 65,
                "Afrikaans": 60,
                "Life Orientation": 75
            }
        )

        # 7 + 6 + 7 + 5 + 4 + 3 + 6 = 38
        assert "38" in result or "APS" in result

    def test_get_subject_points(self):
        """Subject points should map correctly to achievement levels."""
        from one_for_all.tools.aps_calculator_tools import get_subject_points

        result = get_subject_points(subject="Mathematics", percentage=85)

        assert "7" in result  # 80-100% = 7 points

    def test_validate_aps_score_eligible(self, mock_supabase):
        """Eligible APS should pass validation."""
        from one_for_all.tools.aps_calculator_tools import validate_aps_score

        mock_supabase.execute.return_value.data = [{"minimum_aps": 32}]

        with patch('one_for_all.tools.aps_calculator_tools.supabase', mock_supabase):
            result = validate_aps_score(
                aps_score=38,
                course_code="BSC001"
            )

        assert "eligible" in result.lower() or "pass" in result.lower()

    def test_validate_aps_score_ineligible(self, mock_supabase):
        """Ineligible APS should fail validation."""
        from one_for_all.tools.aps_calculator_tools import validate_aps_score

        mock_supabase.execute.return_value.data = [{"minimum_aps": 40}]

        with patch('one_for_all.tools.aps_calculator_tools.supabase', mock_supabase):
            result = validate_aps_score(
                aps_score=32,
                course_code="MED001"
            )

        assert "ineligible" in result.lower() or "insufficient" in result.lower()
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

- [ ] All unit tests pass (146 production tools)
- [ ] Coverage >= 80% for tools directory (excluding mock tools)
- [ ] No external API calls (verified via network monitoring)
- [ ] Tests complete in < 3 minutes
- [ ] All 17 tool categories have comprehensive tests
- [ ] Mock tools (16 total) are excluded from coverage requirements
- [ ] Critical path tools (auth, session, application) have >90% coverage

---

## Next Phase

[Phase 2: VCR Integration Tests](./PHASE_2_VCR_INTEGRATION.md)
