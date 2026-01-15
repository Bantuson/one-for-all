"""
Unit tests for submission tools.

Tests the submission workflow components:
- Application submission tool (university applications)
- NSFAS submission tool (funding applications)
- Application status tool (status checks)
- NSFAS status tool (NSFAS status checks)
- Student number tool (generation/lookup)

All tests mock external HTTP calls and database operations to ensure
isolation and prevent real API calls during testing.
"""

import pytest
import json
from datetime import datetime
from unittest.mock import patch, MagicMock, AsyncMock
import sys
from pathlib import Path

# Add src to path
src_path = Path(__file__).resolve().parent.parent.parent.parent / "src"
sys.path.insert(0, str(src_path))

from one_for_all.tools.application_submission_tool import application_submission_tool
from one_for_all.tools.nsfas_application_submission_tool import nsfas_application_submission_tool
from one_for_all.tools.application_status_tool import application_status_tool
from one_for_all.tools.nsfas_status_tool import nsfas_status_tool
from one_for_all.tools.student_number_tool import (
    generate_student_number,
    get_applicant_student_numbers,
    validate_student_number,
    assign_student_number_manually,
)


# =============================================================================
# Test Data Fixtures
# =============================================================================

@pytest.fixture
def sample_application_data():
    """Sample application data for testing."""
    return {
        "full_name": "Test Applicant",
        "id_number": "0001010000000",
        "email": "test@example.com",
        "institution": "University of Pretoria",
        "programme": "BSc Computer Science",
        "matric_results": {
            "Mathematics": {"mark": 80, "level": "HL"},
            "English": {"mark": 75, "level": "HL"},
        },
        "total_aps_score": 40,
    }


@pytest.fixture
def sample_nsfas_data():
    """Sample NSFAS application data for testing."""
    return {
        "full_name": "Test NSFAS Applicant",
        "id_number": "0002020000000",
        "email": "nsfas.test@example.com",
        "household_income": "R150000",
        "sassa_recipient": True,
        "institution": "University of Cape Town",
        "guardian_name": "Test Guardian",
        "guardian_id": "8001010000000",
        "bank_details": {
            "bank_name": "Test Bank",
            "account_number": "1234567890",
            "branch_code": "123456",
        },
    }


# =============================================================================
# Application Submission Tool Tests
# =============================================================================

class TestApplicationSubmissionTool:
    """Test university application submission tool."""

    @patch('one_for_all.tools.application_submission_tool.aiohttp.ClientSession')
    def test_successful_submission(self, mock_session_class, sample_application_data):
        """
        Test successful application submission.

        Expected behavior:
        - Makes POST request to backend API
        - Returns confirmation response
        - Includes application data in request
        """
        # Create mock response
        mock_response = AsyncMock()
        mock_response.text = AsyncMock(return_value=json.dumps({
            "confirmation": "TEST-APP-12345",
            "status": "submitted",
            "institution": "University of Pretoria"
        }))

        # Create mock context manager for response
        mock_response_cm = AsyncMock()
        mock_response_cm.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response_cm.__aexit__ = AsyncMock(return_value=None)

        # Create mock session
        mock_session = AsyncMock()
        mock_session.post = MagicMock(return_value=mock_response_cm)

        # Create mock context manager for session
        mock_session_cm = MagicMock()
        mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session_class.return_value = mock_session_cm

        # Set environment variable
        with patch.dict('os.environ', {'BACKEND_URL': 'http://test-api.example.com'}):
            with patch('one_for_all.tools.application_submission_tool.BACKEND_URL', 'http://test-api.example.com'):
                result = application_submission_tool.func(sample_application_data)

        # Verify result contains expected data
        assert "TEST-APP-12345" in result or "submitted" in result.lower()

    @patch('one_for_all.tools.application_submission_tool.aiohttp.ClientSession')
    def test_submission_with_error_response(self, mock_session_class, sample_application_data):
        """
        Test handling of error response from API.

        Expected behavior:
        - Handles non-200 responses gracefully
        - Returns error information
        """
        # Create mock error response
        mock_response = AsyncMock()
        mock_response.text = AsyncMock(return_value=json.dumps({
            "error": "Validation failed",
            "message": "Missing required fields"
        }))

        mock_response_cm = AsyncMock()
        mock_response_cm.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session = AsyncMock()
        mock_session.post = MagicMock(return_value=mock_response_cm)

        mock_session_cm = MagicMock()
        mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session_class.return_value = mock_session_cm

        with patch.dict('os.environ', {'BACKEND_URL': 'http://test-api.example.com'}):
            with patch('one_for_all.tools.application_submission_tool.BACKEND_URL', 'http://test-api.example.com'):
                result = application_submission_tool.func(sample_application_data)

        # Result should contain the error response
        assert "error" in result.lower() or "validation" in result.lower()

    @patch('one_for_all.tools.application_submission_tool.aiohttp.ClientSession')
    def test_submission_network_error(self, mock_session_class, sample_application_data):
        """
        Test handling of network errors.

        Expected behavior:
        - Catches network exceptions
        - Returns appropriate error message
        """
        # Simulate network error
        mock_session_class.side_effect = Exception("Network connection failed")

        with patch.dict('os.environ', {'BACKEND_URL': 'http://test-api.example.com'}):
            with patch('one_for_all.tools.application_submission_tool.BACKEND_URL', 'http://test-api.example.com'):
                with pytest.raises(Exception) as exc_info:
                    application_submission_tool.func(sample_application_data)

                assert "Network" in str(exc_info.value) or "connection" in str(exc_info.value).lower()

    @patch('one_for_all.tools.application_submission_tool.aiohttp.ClientSession')
    def test_submission_empty_data(self, mock_session_class):
        """
        Test submission with empty application data.

        Expected behavior:
        - Handles empty dict gracefully
        - API receives empty payload
        """
        mock_response = AsyncMock()
        mock_response.text = AsyncMock(return_value=json.dumps({
            "error": "Empty application data"
        }))

        mock_response_cm = AsyncMock()
        mock_response_cm.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session = AsyncMock()
        mock_session.post = MagicMock(return_value=mock_response_cm)

        mock_session_cm = MagicMock()
        mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session_class.return_value = mock_session_cm

        with patch.dict('os.environ', {'BACKEND_URL': 'http://test-api.example.com'}):
            with patch('one_for_all.tools.application_submission_tool.BACKEND_URL', 'http://test-api.example.com'):
                result = application_submission_tool.func({})

        # Should return some response (even if error)
        assert result is not None


# =============================================================================
# NSFAS Submission Tool Tests
# =============================================================================

class TestNsfasSubmissionTool:
    """Test NSFAS application submission tool."""

    @patch('one_for_all.tools.nsfas_application_submission_tool.aiohttp.ClientSession')
    def test_successful_nsfas_submission(self, mock_session_class, sample_nsfas_data):
        """
        Test successful NSFAS application submission.

        Expected behavior:
        - Makes POST request to NSFAS API endpoint
        - Returns reference number
        - Confirms submission status
        """
        mock_response = AsyncMock()
        mock_response.text = AsyncMock(return_value=json.dumps({
            "reference_number": "TEST-NSFAS-20260109-A1B2C",
            "status": "submitted",
            "message": "NSFAS application received"
        }))

        mock_response_cm = AsyncMock()
        mock_response_cm.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session = AsyncMock()
        mock_session.post = MagicMock(return_value=mock_response_cm)

        mock_session_cm = MagicMock()
        mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session_class.return_value = mock_session_cm

        with patch.dict('os.environ', {'BACKEND_URL': 'http://test-api.example.com'}):
            with patch('one_for_all.tools.nsfas_application_submission_tool.BACKEND_URL', 'http://test-api.example.com'):
                result = nsfas_application_submission_tool.func(sample_nsfas_data)

        assert "TEST-NSFAS" in result or "submitted" in result.lower()

    @patch('one_for_all.tools.nsfas_application_submission_tool.aiohttp.ClientSession')
    def test_nsfas_eligibility_rejection(self, mock_session_class, sample_nsfas_data):
        """
        Test NSFAS rejection due to eligibility.

        Expected behavior:
        - Handles rejection response
        - Returns reason for rejection
        """
        mock_response = AsyncMock()
        mock_response.text = AsyncMock(return_value=json.dumps({
            "status": "rejected",
            "reason": "Household income exceeds threshold",
            "threshold": "R350,000"
        }))

        mock_response_cm = AsyncMock()
        mock_response_cm.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session = AsyncMock()
        mock_session.post = MagicMock(return_value=mock_response_cm)

        mock_session_cm = MagicMock()
        mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session_class.return_value = mock_session_cm

        with patch.dict('os.environ', {'BACKEND_URL': 'http://test-api.example.com'}):
            with patch('one_for_all.tools.nsfas_application_submission_tool.BACKEND_URL', 'http://test-api.example.com'):
                result = nsfas_application_submission_tool.func(sample_nsfas_data)

        assert "rejected" in result.lower() or "income" in result.lower()

    @patch('one_for_all.tools.nsfas_application_submission_tool.aiohttp.ClientSession')
    def test_nsfas_missing_documents(self, mock_session_class, sample_nsfas_data):
        """
        Test NSFAS submission with missing documents.

        Expected behavior:
        - API indicates missing documents
        - Returns list of required documents
        """
        mock_response = AsyncMock()
        mock_response.text = AsyncMock(return_value=json.dumps({
            "status": "incomplete",
            "missing_documents": ["Proof of income", "Bank statement"],
            "message": "Please upload required documents"
        }))

        mock_response_cm = AsyncMock()
        mock_response_cm.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session = AsyncMock()
        mock_session.post = MagicMock(return_value=mock_response_cm)

        mock_session_cm = MagicMock()
        mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session_class.return_value = mock_session_cm

        with patch.dict('os.environ', {'BACKEND_URL': 'http://test-api.example.com'}):
            with patch('one_for_all.tools.nsfas_application_submission_tool.BACKEND_URL', 'http://test-api.example.com'):
                result = nsfas_application_submission_tool.func(sample_nsfas_data)

        assert "incomplete" in result.lower() or "missing" in result.lower()


# =============================================================================
# Application Status Tool Tests
# =============================================================================

class TestApplicationStatusTool:
    """Test application status checking tool."""

    @patch('one_for_all.tools.application_status_tool.aiohttp.ClientSession')
    def test_check_pending_status(self, mock_session_class):
        """
        Test checking status of pending application.

        Expected behavior:
        - Makes GET request with application ID
        - Returns pending status
        """
        mock_response = AsyncMock()
        mock_response.text = AsyncMock(return_value=json.dumps({
            "application_id": "TEST-APP-12345",
            "status": "pending",
            "stage": "document_verification",
            "last_updated": "2026-01-09T10:00:00Z"
        }))

        mock_response_cm = AsyncMock()
        mock_response_cm.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session = AsyncMock()
        mock_session.get = MagicMock(return_value=mock_response_cm)

        mock_session_cm = MagicMock()
        mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session_class.return_value = mock_session_cm

        with patch.dict('os.environ', {'BACKEND_URL': 'http://test-api.example.com'}):
            with patch('one_for_all.tools.application_status_tool.BACKEND_URL', 'http://test-api.example.com'):
                result = application_status_tool.func("TEST-APP-12345")

        assert "pending" in result.lower() or "TEST-APP-12345" in result

    @patch('one_for_all.tools.application_status_tool.aiohttp.ClientSession')
    def test_check_accepted_status(self, mock_session_class):
        """
        Test checking status of accepted application.

        Expected behavior:
        - Returns accepted status
        - Includes offer details
        """
        mock_response = AsyncMock()
        mock_response.text = AsyncMock(return_value=json.dumps({
            "application_id": "TEST-APP-67890",
            "status": "accepted",
            "programme": "BSc Computer Science",
            "institution": "University of Pretoria",
            "offer_deadline": "2026-02-15"
        }))

        mock_response_cm = AsyncMock()
        mock_response_cm.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session = AsyncMock()
        mock_session.get = MagicMock(return_value=mock_response_cm)

        mock_session_cm = MagicMock()
        mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session_class.return_value = mock_session_cm

        with patch.dict('os.environ', {'BACKEND_URL': 'http://test-api.example.com'}):
            with patch('one_for_all.tools.application_status_tool.BACKEND_URL', 'http://test-api.example.com'):
                result = application_status_tool.func("TEST-APP-67890")

        assert "accepted" in result.lower()

    @patch('one_for_all.tools.application_status_tool.aiohttp.ClientSession')
    def test_check_rejected_status(self, mock_session_class):
        """
        Test checking status of rejected application.

        Expected behavior:
        - Returns rejected status
        - Includes rejection reason
        """
        mock_response = AsyncMock()
        mock_response.text = AsyncMock(return_value=json.dumps({
            "application_id": "TEST-APP-REJECT",
            "status": "rejected",
            "reason": "APS score below minimum requirement",
            "minimum_required": 35,
            "applicant_score": 28
        }))

        mock_response_cm = AsyncMock()
        mock_response_cm.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session = AsyncMock()
        mock_session.get = MagicMock(return_value=mock_response_cm)

        mock_session_cm = MagicMock()
        mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session_class.return_value = mock_session_cm

        with patch.dict('os.environ', {'BACKEND_URL': 'http://test-api.example.com'}):
            with patch('one_for_all.tools.application_status_tool.BACKEND_URL', 'http://test-api.example.com'):
                result = application_status_tool.func("TEST-APP-REJECT")

        assert "rejected" in result.lower()

    @patch('one_for_all.tools.application_status_tool.aiohttp.ClientSession')
    def test_check_nonexistent_application(self, mock_session_class):
        """
        Test checking status of non-existent application.

        Expected behavior:
        - Returns not found error
        - Handles gracefully
        """
        mock_response = AsyncMock()
        mock_response.text = AsyncMock(return_value=json.dumps({
            "error": "Application not found",
            "application_id": "INVALID-ID-999"
        }))

        mock_response_cm = AsyncMock()
        mock_response_cm.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session = AsyncMock()
        mock_session.get = MagicMock(return_value=mock_response_cm)

        mock_session_cm = MagicMock()
        mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session_class.return_value = mock_session_cm

        with patch.dict('os.environ', {'BACKEND_URL': 'http://test-api.example.com'}):
            with patch('one_for_all.tools.application_status_tool.BACKEND_URL', 'http://test-api.example.com'):
                result = application_status_tool.func("INVALID-ID-999")

        assert "not found" in result.lower() or "error" in result.lower()


# =============================================================================
# NSFAS Status Tool Tests
# =============================================================================

class TestNsfasStatusTool:
    """Test NSFAS status checking tool."""

    @patch('one_for_all.tools.nsfas_status_tool.aiohttp.ClientSession')
    def test_check_pending_verification(self, mock_session_class):
        """
        Test checking NSFAS pending verification status.

        Expected behavior:
        - Returns pending verification status
        - Shows what's being verified
        """
        mock_response = AsyncMock()
        mock_response.text = AsyncMock(return_value=json.dumps({
            "reference_number": "TEST-NSFAS-12345",
            "status": "pending_verification",
            "stage": "income_verification",
            "estimated_completion": "5-7 business days"
        }))

        mock_response_cm = AsyncMock()
        mock_response_cm.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session = AsyncMock()
        mock_session.get = MagicMock(return_value=mock_response_cm)

        mock_session_cm = MagicMock()
        mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session_class.return_value = mock_session_cm

        with patch.dict('os.environ', {'BACKEND_URL': 'http://test-api.example.com'}):
            with patch('one_for_all.tools.nsfas_status_tool.BACKEND_URL', 'http://test-api.example.com'):
                result = nsfas_status_tool.func("TEST-NSFAS-12345")

        assert "pending" in result.lower() or "verification" in result.lower()

    @patch('one_for_all.tools.nsfas_status_tool.aiohttp.ClientSession')
    def test_check_approved_status(self, mock_session_class):
        """
        Test checking NSFAS approved status.

        Expected behavior:
        - Returns approved status
        - Includes funding amount
        """
        mock_response = AsyncMock()
        mock_response.text = AsyncMock(return_value=json.dumps({
            "reference_number": "TEST-NSFAS-APPROVED",
            "status": "approved",
            "funding_amount": "R98000",
            "covers": ["tuition", "accommodation", "books", "transport"],
            "academic_year": 2026
        }))

        mock_response_cm = AsyncMock()
        mock_response_cm.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session = AsyncMock()
        mock_session.get = MagicMock(return_value=mock_response_cm)

        mock_session_cm = MagicMock()
        mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session_class.return_value = mock_session_cm

        with patch.dict('os.environ', {'BACKEND_URL': 'http://test-api.example.com'}):
            with patch('one_for_all.tools.nsfas_status_tool.BACKEND_URL', 'http://test-api.example.com'):
                result = nsfas_status_tool.func("TEST-NSFAS-APPROVED")

        assert "approved" in result.lower()

    @patch('one_for_all.tools.nsfas_status_tool.aiohttp.ClientSession')
    def test_check_declined_status(self, mock_session_class):
        """
        Test checking NSFAS declined status.

        Expected behavior:
        - Returns declined status
        - Includes reason for declining
        """
        mock_response = AsyncMock()
        mock_response.text = AsyncMock(return_value=json.dumps({
            "reference_number": "TEST-NSFAS-DECLINED",
            "status": "declined",
            "reason": "Household income exceeds threshold",
            "appeal_deadline": "2026-03-31"
        }))

        mock_response_cm = AsyncMock()
        mock_response_cm.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session = AsyncMock()
        mock_session.get = MagicMock(return_value=mock_response_cm)

        mock_session_cm = MagicMock()
        mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session_class.return_value = mock_session_cm

        with patch.dict('os.environ', {'BACKEND_URL': 'http://test-api.example.com'}):
            with patch('one_for_all.tools.nsfas_status_tool.BACKEND_URL', 'http://test-api.example.com'):
                result = nsfas_status_tool.func("TEST-NSFAS-DECLINED")

        assert "declined" in result.lower()


# =============================================================================
# Student Number Tool Tests
# =============================================================================

class TestGenerateStudentNumber:
    """Test student number generation tool."""

    @patch('one_for_all.tools.student_number_tool.supabase')
    @patch('one_for_all.tools.student_number_tool.TEST_MODE', True)
    def test_generate_student_number_success(self, mock_supabase):
        """
        Test successful student number generation.

        Expected behavior:
        - Calls Supabase RPC function
        - Returns generated student number
        - Prefixes with TEST- in test mode
        """
        # Mock RPC response
        mock_result = MagicMock()
        mock_result.data = "u26012345"
        mock_supabase.rpc.return_value.execute.return_value = mock_result

        # Mock update for TEST- prefix
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()

        result = generate_student_number.func(
            institution_id="test-inst-uuid",
            applicant_id="test-applicant-uuid"
        )

        assert "TEST-" in result or "generated" in result.lower()
        mock_supabase.rpc.assert_called_once()

    @patch('one_for_all.tools.student_number_tool.supabase')
    @patch('one_for_all.tools.student_number_tool.TEST_MODE', False)
    def test_generate_student_number_production(self, mock_supabase):
        """
        Test student number generation in production mode.

        Expected behavior:
        - Does not add TEST- prefix in production
        - Returns raw student number
        """
        mock_result = MagicMock()
        mock_result.data = "u26012345"
        mock_supabase.rpc.return_value.execute.return_value = mock_result

        result = generate_student_number.func(
            institution_id="inst-uuid",
            applicant_id="applicant-uuid"
        )

        assert "u26012345" in result or "generated" in result.lower()

    @patch('one_for_all.tools.student_number_tool.supabase')
    def test_generate_student_number_rpc_not_found(self, mock_supabase):
        """
        Test handling when RPC function doesn't exist.

        Expected behavior:
        - Returns helpful error message
        - Suggests running migration
        """
        mock_supabase.rpc.return_value.execute.side_effect = Exception(
            "function generate_student_number(p_institution_id, p_applicant_id) does not exist"
        )

        result = generate_student_number.func(
            institution_id="test-inst-uuid",
            applicant_id="test-applicant-uuid"
        )

        assert "ERROR" in result
        assert "not found" in result.lower() or "migration" in result.lower()

    @patch('one_for_all.tools.student_number_tool.supabase', None)
    def test_generate_student_number_no_client(self):
        """
        Test handling when Supabase client is not configured.

        Expected behavior:
        - Returns error about missing configuration
        """
        result = generate_student_number.func(
            institution_id="test-inst-uuid",
            applicant_id="test-applicant-uuid"
        )

        assert "ERROR" in result
        assert "not configured" in result.lower()


class TestGetApplicantStudentNumbers:
    """Test student number lookup tool."""

    @patch('one_for_all.tools.student_number_tool.supabase')
    def test_get_student_numbers_success(self, mock_supabase):
        """
        Test successful retrieval of student numbers.

        Expected behavior:
        - Returns all student numbers for applicant
        - Includes primary student number
        """
        mock_result = MagicMock()
        mock_result.data = {
            "id": "test-applicant-uuid",
            "student_numbers": {
                "UP": "u26012345",
                "UCT": "SMTH26001"
            },
            "primary_student_number": "u26012345",
            "student_number_generated_at": "2026-01-09T10:00:00Z"
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = mock_result

        result = get_applicant_student_numbers.func("test-applicant-uuid")

        assert "u26012345" in result
        assert "UP" in result or "student_numbers" in result

    @patch('one_for_all.tools.student_number_tool.supabase')
    def test_get_student_numbers_not_found(self, mock_supabase):
        """
        Test handling when applicant has no student numbers.

        Expected behavior:
        - Returns appropriate message
        - Does not crash
        """
        mock_result = MagicMock()
        mock_result.data = {
            "id": "test-applicant-uuid",
            "student_numbers": {},
            "primary_student_number": None,
            "student_number_generated_at": None
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = mock_result

        result = get_applicant_student_numbers.func("test-applicant-uuid")

        assert "NO_STUDENT_NUMBERS" in result or "no student numbers" in result.lower()

    @patch('one_for_all.tools.student_number_tool.supabase')
    def test_get_student_numbers_applicant_not_found(self, mock_supabase):
        """
        Test handling when applicant doesn't exist.

        Expected behavior:
        - Returns error about missing applicant
        """
        mock_result = MagicMock()
        mock_result.data = None
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = mock_result

        result = get_applicant_student_numbers.func("nonexistent-uuid")

        assert "ERROR" in result
        assert "not found" in result.lower()


class TestValidateStudentNumber:
    """Test student number validation tool."""

    @patch('one_for_all.tools.student_number_tool.supabase')
    def test_validate_up_student_number_valid(self, mock_supabase):
        """
        Test validating a valid UP student number.

        Expected behavior:
        - Returns VALID for correct format
        - Format: u + 8 digits (e.g., u26012345)
        """
        mock_result = MagicMock()
        mock_result.data = {
            "format_regex": r"^u\d{8}$",
            "format_pattern": "u + 8 digits",
            "example": "u26012345"
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = mock_result

        result = validate_student_number.func("UP", "u26012345")

        assert "VALID" in result

    @patch('one_for_all.tools.student_number_tool.supabase')
    def test_validate_student_number_invalid(self, mock_supabase):
        """
        Test validating an invalid student number.

        Expected behavior:
        - Returns INVALID for incorrect format
        - Includes expected pattern and example
        """
        mock_result = MagicMock()
        mock_result.data = {
            "format_regex": r"^u\d{8}$",
            "format_pattern": "u + 8 digits",
            "example": "u26012345"
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = mock_result

        result = validate_student_number.func("UP", "invalid123")

        assert "INVALID" in result
        assert "u26012345" in result or "example" in result.lower()

    @patch('one_for_all.tools.student_number_tool.supabase')
    def test_validate_student_number_unknown_institution(self, mock_supabase):
        """
        Test validating student number for unknown institution.

        Expected behavior:
        - Returns error about missing format rules
        """
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.side_effect = Exception(
            "No rows returned"
        )

        result = validate_student_number.func("UNKNOWN", "test12345")

        assert "ERROR" in result
        assert "not found" in result.lower() or "UNKNOWN" in result


class TestAssignStudentNumberManually:
    """Test manual student number assignment tool."""

    @patch('one_for_all.tools.student_number_tool.supabase')
    def test_assign_student_number_success(self, mock_supabase):
        """
        Test successful manual assignment.

        Expected behavior:
        - Updates applicant record
        - Adds to student_numbers mapping
        - Returns confirmation
        """
        # Mock get current student numbers
        mock_current = MagicMock()
        mock_current.data = {
            "student_numbers": {}
        }

        # Mock update
        mock_update = MagicMock()
        mock_update.data = [{"id": "test-applicant-uuid"}]

        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = mock_current
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_update

        result = assign_student_number_manually.func(
            applicant_id="test-applicant-uuid",
            institution_code="UP",
            student_number="u26012345",
            set_as_primary=False
        )

        assert "u26012345" in result
        assert "assigned" in result.lower()

    @patch('one_for_all.tools.student_number_tool.supabase')
    def test_assign_student_number_as_primary(self, mock_supabase):
        """
        Test assignment as primary student number.

        Expected behavior:
        - Sets primary_student_number field
        - Indicates primary status in response
        """
        mock_current = MagicMock()
        mock_current.data = {
            "student_numbers": {"UCT": "SMTH26001"}
        }

        mock_update = MagicMock()
        mock_update.data = [{"id": "test-applicant-uuid"}]

        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = mock_current
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_update

        result = assign_student_number_manually.func(
            applicant_id="test-applicant-uuid",
            institution_code="UP",
            student_number="u26012345",
            set_as_primary=True
        )

        assert "primary" in result.lower()
        assert "u26012345" in result

    @patch('one_for_all.tools.student_number_tool.supabase')
    def test_assign_student_number_applicant_not_found(self, mock_supabase):
        """
        Test assignment to non-existent applicant.

        Expected behavior:
        - Returns error about missing applicant
        """
        mock_current = MagicMock()
        mock_current.data = None

        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = mock_current

        result = assign_student_number_manually.func(
            applicant_id="nonexistent-uuid",
            institution_code="UP",
            student_number="u26012345",
            set_as_primary=False
        )

        assert "ERROR" in result
        assert "not found" in result.lower()


# =============================================================================
# Edge Cases and Error Handling
# =============================================================================

class TestSubmissionToolsEdgeCases:
    """Test edge cases and boundary conditions for submission tools."""

    @patch('one_for_all.tools.application_submission_tool.aiohttp.ClientSession')
    def test_submission_timeout(self, mock_session_class, sample_application_data):
        """
        Test handling of request timeout.

        Expected behavior:
        - Raises or handles timeout exception
        """
        import asyncio
        mock_session_class.side_effect = asyncio.TimeoutError("Request timed out")

        with patch.dict('os.environ', {'BACKEND_URL': 'http://test-api.example.com'}):
            with patch('one_for_all.tools.application_submission_tool.BACKEND_URL', 'http://test-api.example.com'):
                with pytest.raises(asyncio.TimeoutError):
                    application_submission_tool.func(sample_application_data)

    @patch('one_for_all.tools.application_submission_tool.aiohttp.ClientSession')
    def test_submission_with_special_characters(self, mock_session_class):
        """
        Test submission with special characters in data.

        Expected behavior:
        - Handles Unicode and special chars properly
        - Doesn't break JSON encoding
        """
        special_data = {
            "full_name": "Test O'Malley-Smith",
            "address": "123 Main St, Apt #5",
            "notes": "Student with special needs: hearing-impaired (cochlear implant)"
        }

        mock_response = AsyncMock()
        mock_response.text = AsyncMock(return_value=json.dumps({
            "confirmation": "TEST-SPECIAL-001",
            "status": "submitted"
        }))

        mock_response_cm = AsyncMock()
        mock_response_cm.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session = AsyncMock()
        mock_session.post = MagicMock(return_value=mock_response_cm)

        mock_session_cm = MagicMock()
        mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session_class.return_value = mock_session_cm

        with patch.dict('os.environ', {'BACKEND_URL': 'http://test-api.example.com'}):
            with patch('one_for_all.tools.application_submission_tool.BACKEND_URL', 'http://test-api.example.com'):
                result = application_submission_tool.func(special_data)

        assert result is not None  # Should not crash

    @patch('one_for_all.tools.application_submission_tool.aiohttp.ClientSession')
    def test_submission_with_large_payload(self, mock_session_class):
        """
        Test submission with large data payload.

        Expected behavior:
        - Handles large documents/attachments references
        - Doesn't timeout or fail
        """
        large_data = {
            "full_name": "Test Large Payload",
            "documents": [{"name": f"doc_{i}", "size": 1000000} for i in range(100)],
            "matric_results": {f"subject_{i}": {"mark": 80, "level": "HL"} for i in range(20)}
        }

        mock_response = AsyncMock()
        mock_response.text = AsyncMock(return_value=json.dumps({
            "confirmation": "TEST-LARGE-001",
            "status": "submitted"
        }))

        mock_response_cm = AsyncMock()
        mock_response_cm.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session = AsyncMock()
        mock_session.post = MagicMock(return_value=mock_response_cm)

        mock_session_cm = MagicMock()
        mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session_cm.__aexit__ = AsyncMock(return_value=None)

        mock_session_class.return_value = mock_session_cm

        with patch.dict('os.environ', {'BACKEND_URL': 'http://test-api.example.com'}):
            with patch('one_for_all.tools.application_submission_tool.BACKEND_URL', 'http://test-api.example.com'):
                result = application_submission_tool.func(large_data)

        assert result is not None


class TestMockToolsConsistency:
    """Test that mock tools follow the same patterns as real tools."""

    def test_mock_submission_generates_test_prefix(self):
        """Verify mock submission tool uses TEST- prefix."""
        from one_for_all.tools.mocks.mock_submission_tool import (
            generate_fake_confirmation_number,
            mock_submission_tool
        )

        confirmation = generate_fake_confirmation_number()
        assert confirmation.startswith("TEST-"), "Mock should use TEST- prefix"

        # Verify format: TEST-YYYYMMDD-XXXXX
        parts = confirmation.split("-")
        assert len(parts) == 3, "Should have 3 parts separated by hyphens"
        assert len(parts[1]) == 8, "Date part should be 8 digits"
        assert len(parts[2]) == 5, "Random part should be 5 characters"

    def test_mock_nsfas_generates_test_prefix(self):
        """Verify mock NSFAS tool uses TEST-NSFAS- prefix."""
        from one_for_all.tools.mocks.mock_nsfas_tool import generate_fake_nsfas_reference

        reference = generate_fake_nsfas_reference()
        assert reference.startswith("TEST-NSFAS-"), "NSFAS mock should use TEST-NSFAS- prefix"

    def test_mock_status_recognizes_test_applications(self):
        """Verify mock status tool handles TEST- prefixed IDs correctly."""
        from one_for_all.tools.mocks.mock_status_tool import mock_status_tool, mock_nsfas_status_tool

        # Test with TEST- prefix
        result = mock_status_tool.func("TEST-20260109-A1B2C")
        assert "PENDING" in result or "test application" in result.lower()

        # Test with non-TEST prefix
        result_non_test = mock_status_tool.func("REAL-APP-12345")
        assert "UNDER_REVIEW" in result_non_test

        # NSFAS mock
        nsfas_result = mock_nsfas_status_tool.func("TEST-NSFAS-20260109-X1Y2Z")
        assert "PENDING_VERIFICATION" in nsfas_result


# =============================================================================
# Integration-Style Tests (Still Unit Tests with Mocks)
# =============================================================================

class TestSubmissionWorkflow:
    """Test complete submission workflows with mocks."""

    @patch('one_for_all.tools.application_submission_tool.aiohttp.ClientSession')
    def test_submit_then_check_status_part1_submit(
        self,
        mock_submit_session,
        sample_application_data
    ):
        """
        Test workflow part 1: submit application.

        Expected behavior:
        - Submit returns confirmation number
        """
        # Mock submission
        submit_response = AsyncMock()
        submit_response.text = AsyncMock(return_value=json.dumps({
            "confirmation": "TEST-WORKFLOW-001",
            "status": "submitted"
        }))

        submit_response_cm = AsyncMock()
        submit_response_cm.__aenter__ = AsyncMock(return_value=submit_response)
        submit_response_cm.__aexit__ = AsyncMock(return_value=None)

        submit_session = AsyncMock()
        submit_session.post = MagicMock(return_value=submit_response_cm)

        submit_session_cm = MagicMock()
        submit_session_cm.__aenter__ = AsyncMock(return_value=submit_session)
        submit_session_cm.__aexit__ = AsyncMock(return_value=None)

        mock_submit_session.return_value = submit_session_cm

        with patch.dict('os.environ', {'BACKEND_URL': 'http://test-api.example.com'}):
            with patch('one_for_all.tools.application_submission_tool.BACKEND_URL', 'http://test-api.example.com'):
                # Submit
                submit_result = application_submission_tool.func(sample_application_data)
                assert "TEST-WORKFLOW-001" in submit_result
                assert "submitted" in submit_result.lower()

    @patch('one_for_all.tools.application_status_tool.aiohttp.ClientSession')
    def test_submit_then_check_status_part2_status(
        self,
        mock_status_session
    ):
        """
        Test workflow part 2: check status after submission.

        Expected behavior:
        - Status check with confirmation number returns valid status
        """
        # Mock status check
        status_response = AsyncMock()
        status_response.text = AsyncMock(return_value=json.dumps({
            "application_id": "TEST-WORKFLOW-001",
            "status": "pending",
            "stage": "document_verification"
        }))

        status_response_cm = AsyncMock()
        status_response_cm.__aenter__ = AsyncMock(return_value=status_response)
        status_response_cm.__aexit__ = AsyncMock(return_value=None)

        status_session = AsyncMock()
        status_session.get = MagicMock(return_value=status_response_cm)

        status_session_cm = MagicMock()
        status_session_cm.__aenter__ = AsyncMock(return_value=status_session)
        status_session_cm.__aexit__ = AsyncMock(return_value=None)

        mock_status_session.return_value = status_session_cm

        with patch.dict('os.environ', {'BACKEND_URL': 'http://test-api.example.com'}):
            with patch('one_for_all.tools.application_status_tool.BACKEND_URL', 'http://test-api.example.com'):
                # Check status
                status_result = application_status_tool.func("TEST-WORKFLOW-001")
                assert "pending" in status_result.lower()
                assert "TEST-WORKFLOW-001" in status_result
