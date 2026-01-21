"""
Unit tests for Document Review Tools.

Tests the document review tools:
- document_flag_tool - flags documents with issues requiring applicant action
- document_approve_tool - approves documents as valid and complete
- get_application_documents - retrieves all documents for an application

All tests use mocks to avoid actual database calls.
"""

import pytest
from datetime import datetime
from unittest.mock import MagicMock, patch, AsyncMock
import sys
from pathlib import Path

# Add src to path
src_path = Path(__file__).resolve().parent.parent.parent.parent / "src"
sys.path.insert(0, str(src_path))

from one_for_all.tools.document_review_tools import (
    document_flag_tool,
    document_approve_tool,
    get_application_documents,
)


# =============================================================================
# Test Fixtures
# =============================================================================


@pytest.fixture
def mock_supabase_table():
    """Create a mock Supabase table interface with chainable methods."""
    mock_table = MagicMock()

    # Configure chainable methods for SELECT operations
    mock_table.select.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.order.return_value = mock_table
    mock_table.single.return_value = mock_table
    mock_table.update.return_value = mock_table

    return mock_table


@pytest.fixture
def test_document_data():
    """Sample document data for testing with TEST- prefix."""
    return {
        "id": "TEST-DOC-001",
        "document_type": "id_document",
        "application_id": "TEST-APP-001",
        "file_name": "id_document.pdf",
        "file_url": "https://storage.example.com/docs/id_document.pdf",
        "uploaded_at": datetime.utcnow().isoformat(),
        "review_status": "pending",
        "flag_reason": None,
        "flagged_by": None,
        "flagged_at": None,
        "reviewed_by": None,
        "reviewed_at": None,
    }


@pytest.fixture
def test_flagged_document_data():
    """Sample flagged document data for testing."""
    return {
        "id": "TEST-DOC-002",
        "document_type": "matric_certificate",
        "application_id": "TEST-APP-001",
        "file_name": "matric_cert.pdf",
        "file_url": "https://storage.example.com/docs/matric_cert.pdf",
        "uploaded_at": datetime.utcnow().isoformat(),
        "review_status": "flagged",
        "flag_reason": "Document is illegible",
        "flagged_by": "TEST-REVIEWER-001",
        "flagged_at": datetime.utcnow().isoformat(),
        "reviewed_by": "TEST-REVIEWER-001",
        "reviewed_at": datetime.utcnow().isoformat(),
    }


@pytest.fixture
def test_application_documents_list():
    """Sample list of documents for an application."""
    return [
        {
            "id": "TEST-DOC-001",
            "document_type": "id_document",
            "file_name": "id_document.pdf",
            "file_url": "https://storage.example.com/docs/id_document.pdf",
            "uploaded_at": "2026-01-15T10:00:00",
            "review_status": "approved",
            "flag_reason": None,
            "flagged_by": None,
            "flagged_at": None,
            "reviewed_by": "TEST-REVIEWER-001",
            "reviewed_at": "2026-01-15T12:00:00",
        },
        {
            "id": "TEST-DOC-002",
            "document_type": "matric_certificate",
            "file_name": "matric_cert.pdf",
            "file_url": "https://storage.example.com/docs/matric_cert.pdf",
            "uploaded_at": "2026-01-15T10:05:00",
            "review_status": "pending",
            "flag_reason": None,
            "flagged_by": None,
            "flagged_at": None,
            "reviewed_by": None,
            "reviewed_at": None,
        },
        {
            "id": "TEST-DOC-003",
            "document_type": "proof_of_residence",
            "file_name": "residence_proof.pdf",
            "file_url": "https://storage.example.com/docs/residence_proof.pdf",
            "uploaded_at": "2026-01-15T10:10:00",
            "review_status": "flagged",
            "flag_reason": "Address does not match application",
            "flagged_by": "TEST-REVIEWER-001",
            "flagged_at": "2026-01-15T14:00:00",
            "reviewed_by": "TEST-REVIEWER-001",
            "reviewed_at": "2026-01-15T14:00:00",
        },
    ]


# =============================================================================
# Test: document_flag_tool
# =============================================================================


@pytest.mark.unit
class TestDocumentFlagTool:
    """Test document flagging tool."""

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_flag_document_success(self, mock_supabase, test_document_data):
        """
        Test successful document flagging returns DOCUMENT_FLAGGED.

        Expected behavior:
        - Verifies document exists
        - Updates review_status, flagged_at, flag_reason fields
        - Returns success message with document ID
        """
        # Arrange
        mock_table = MagicMock()

        # Mock the document existence check
        mock_table.select.return_value.eq.return_value.single.return_value.execute = (
            AsyncMock(return_value=MagicMock(data=test_document_data))
        )

        # Mock the update operation
        mock_table.update.return_value.eq.return_value.execute = AsyncMock(
            return_value=MagicMock(
                data=[{"id": "TEST-DOC-001", "review_status": "flagged"}], error=None
            )
        )

        mock_supabase.table.return_value = mock_table

        # Act
        result = document_flag_tool.func(
            document_id="TEST-DOC-001",
            flag_reason="Document is illegible - please upload a clearer image",
            flagged_by="TEST-REVIEWER-001",
        )

        # Assert
        assert "DOCUMENT_FLAGGED" in result
        assert "TEST-DOC-001" in result
        assert "Document is illegible" in result
        mock_supabase.table.assert_called_with("application_documents")

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_flag_document_not_found(self, mock_supabase):
        """
        Test document flagging when document doesn't exist returns error.

        Expected behavior:
        - Returns FLAG_ERROR when document not found
        """
        # Arrange
        mock_table = MagicMock()

        # Mock the document existence check returning no data
        mock_table.select.return_value.eq.return_value.single.return_value.execute = (
            AsyncMock(return_value=MagicMock(data=None))
        )

        mock_supabase.table.return_value = mock_table

        # Act
        result = document_flag_tool.func(
            document_id="NONEXISTENT-DOC-001",
            flag_reason="Document is illegible",
            flagged_by="TEST-REVIEWER-001",
        )

        # Assert
        assert "FLAG_ERROR" in result
        assert "not found" in result.lower()

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_flag_document_missing_reason_validates(self, mock_supabase):
        """
        Test document flagging with empty reason returns validation error.

        Expected behavior:
        - Returns FLAG_ERROR when flag_reason is empty or whitespace
        """
        # Arrange - No need to mock supabase as validation happens first

        # Act - Test empty string
        result_empty = document_flag_tool.func(
            document_id="TEST-DOC-001", flag_reason="", flagged_by="TEST-REVIEWER-001"
        )

        # Act - Test whitespace only
        result_whitespace = document_flag_tool.func(
            document_id="TEST-DOC-001",
            flag_reason="   ",
            flagged_by="TEST-REVIEWER-001",
        )

        # Assert
        assert "FLAG_ERROR" in result_empty
        assert "flag_reason is required" in result_empty

        assert "FLAG_ERROR" in result_whitespace
        assert "flag_reason is required" in result_whitespace

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_flag_document_missing_document_id(self, mock_supabase):
        """
        Test document flagging with missing document_id returns validation error.

        Expected behavior:
        - Returns FLAG_ERROR when document_id is empty
        """
        # Act
        result = document_flag_tool.func(
            document_id="", flag_reason="Document is illegible", flagged_by="TEST-REVIEWER-001"
        )

        # Assert
        assert "FLAG_ERROR" in result
        assert "document_id is required" in result

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_flag_document_missing_flagged_by(self, mock_supabase):
        """
        Test document flagging with missing flagged_by returns validation error.

        Expected behavior:
        - Returns FLAG_ERROR when flagged_by is empty
        """
        # Act
        result = document_flag_tool.func(
            document_id="TEST-DOC-001", flag_reason="Document is illegible", flagged_by=""
        )

        # Assert
        assert "FLAG_ERROR" in result
        assert "flagged_by is required" in result

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_flag_document_updates_correct_fields(self, mock_supabase, test_document_data):
        """
        Test that flagging updates review_status, flagged_at, flag_reason fields.

        Expected behavior:
        - Update payload contains review_status = 'flagged'
        - Update payload contains flag_reason
        - Update payload contains flagged_at timestamp
        - Update payload contains flagged_by
        """
        # Arrange
        mock_table = MagicMock()
        captured_update_data = None

        def capture_update(data):
            nonlocal captured_update_data
            captured_update_data = data
            return mock_table

        # Mock the document existence check
        mock_table.select.return_value.eq.return_value.single.return_value.execute = (
            AsyncMock(return_value=MagicMock(data=test_document_data))
        )

        # Capture the update call
        mock_table.update = capture_update
        mock_table.eq.return_value.execute = AsyncMock(
            return_value=MagicMock(
                data=[{"id": "TEST-DOC-001", "review_status": "flagged"}], error=None
            )
        )

        mock_supabase.table.return_value = mock_table

        # Act
        document_flag_tool.func(
            document_id="TEST-DOC-001",
            flag_reason="Document is illegible",
            flagged_by="TEST-REVIEWER-001",
        )

        # Assert
        assert captured_update_data is not None
        assert captured_update_data["review_status"] == "flagged"
        assert captured_update_data["flag_reason"] == "Document is illegible"
        assert captured_update_data["flagged_by"] == "TEST-REVIEWER-001"
        assert "flagged_at" in captured_update_data
        assert "reviewed_at" in captured_update_data

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_flag_document_database_error_handled(self, mock_supabase, test_document_data):
        """
        Test database errors are handled gracefully.

        Expected behavior:
        - Returns FLAG_ERROR when database operation fails
        """
        # Arrange
        mock_table = MagicMock()

        # Mock the document existence check
        mock_table.select.return_value.eq.return_value.single.return_value.execute = (
            AsyncMock(return_value=MagicMock(data=test_document_data))
        )

        # Mock the update operation failing
        mock_table.update.return_value.eq.return_value.execute = AsyncMock(
            return_value=MagicMock(
                data=None, error="Database connection failed"
            )
        )

        mock_supabase.table.return_value = mock_table

        # Act
        result = document_flag_tool.func(
            document_id="TEST-DOC-001",
            flag_reason="Document is illegible",
            flagged_by="TEST-REVIEWER-001",
        )

        # Assert
        assert "FLAG_ERROR" in result
        assert "Failed to update document" in result

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_flag_document_exception_handling(self, mock_supabase):
        """
        Test unexpected exceptions are caught and handled.

        Expected behavior:
        - Returns FLAG_ERROR with exception details
        """
        # Arrange
        mock_table = MagicMock()

        # Mock the document existence check raising an exception
        mock_table.select.return_value.eq.return_value.single.return_value.execute = (
            AsyncMock(side_effect=Exception("Unexpected database error"))
        )

        mock_supabase.table.return_value = mock_table

        # Act
        result = document_flag_tool.func(
            document_id="TEST-DOC-001",
            flag_reason="Document is illegible",
            flagged_by="TEST-REVIEWER-001",
        )

        # Assert
        assert "FLAG_ERROR" in result
        assert "Unexpected error" in result


# =============================================================================
# Test: document_approve_tool
# =============================================================================


@pytest.mark.unit
class TestDocumentApproveTool:
    """Test document approval tool."""

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_approve_document_success(self, mock_supabase, test_document_data):
        """
        Test successful document approval returns DOCUMENT_APPROVED.

        Expected behavior:
        - Verifies document exists
        - Updates review_status to 'approved'
        - Returns success message with document ID
        """
        # Arrange
        mock_table = MagicMock()

        # Mock the document existence check
        mock_table.select.return_value.eq.return_value.single.return_value.execute = (
            AsyncMock(return_value=MagicMock(data=test_document_data))
        )

        # Mock the update operation
        mock_table.update.return_value.eq.return_value.execute = AsyncMock(
            return_value=MagicMock(
                data=[{"id": "TEST-DOC-001", "review_status": "approved"}], error=None
            )
        )

        mock_supabase.table.return_value = mock_table

        # Act
        result = document_approve_tool.func(
            document_id="TEST-DOC-001", reviewed_by="TEST-REVIEWER-001"
        )

        # Assert
        assert "DOCUMENT_APPROVED" in result
        assert "TEST-DOC-001" in result
        mock_supabase.table.assert_called_with("application_documents")

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_approve_document_not_found(self, mock_supabase):
        """
        Test document approval when document doesn't exist returns error.

        Expected behavior:
        - Returns APPROVE_ERROR when document not found
        """
        # Arrange
        mock_table = MagicMock()

        # Mock the document existence check returning no data
        mock_table.select.return_value.eq.return_value.single.return_value.execute = (
            AsyncMock(return_value=MagicMock(data=None))
        )

        mock_supabase.table.return_value = mock_table

        # Act
        result = document_approve_tool.func(
            document_id="NONEXISTENT-DOC-001", reviewed_by="TEST-REVIEWER-001"
        )

        # Assert
        assert "APPROVE_ERROR" in result
        assert "not found" in result.lower()

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_approve_previously_flagged_document(
        self, mock_supabase, test_flagged_document_data
    ):
        """
        Test that previously flagged document can be approved.

        Expected behavior:
        - Returns DOCUMENT_APPROVED with note about clearing flag
        """
        # Arrange
        mock_table = MagicMock()

        # Mock the document existence check returning flagged document
        mock_table.select.return_value.eq.return_value.single.return_value.execute = (
            AsyncMock(return_value=MagicMock(data=test_flagged_document_data))
        )

        # Mock the update operation
        mock_table.update.return_value.eq.return_value.execute = AsyncMock(
            return_value=MagicMock(
                data=[{"id": "TEST-DOC-002", "review_status": "approved"}], error=None
            )
        )

        mock_supabase.table.return_value = mock_table

        # Act
        result = document_approve_tool.func(
            document_id="TEST-DOC-002", reviewed_by="TEST-REVIEWER-002"
        )

        # Assert
        assert "DOCUMENT_APPROVED" in result
        assert "previously flagged" in result.lower()

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_approve_document_updates_review_status(
        self, mock_supabase, test_document_data
    ):
        """
        Test that approval updates review_status to approved.

        Expected behavior:
        - Update payload contains review_status = 'approved'
        """
        # Arrange
        mock_table = MagicMock()
        captured_update_data = None

        def capture_update(data):
            nonlocal captured_update_data
            captured_update_data = data
            return mock_table

        # Mock the document existence check
        mock_table.select.return_value.eq.return_value.single.return_value.execute = (
            AsyncMock(return_value=MagicMock(data=test_document_data))
        )

        # Capture the update call
        mock_table.update = capture_update
        mock_table.eq.return_value.execute = AsyncMock(
            return_value=MagicMock(
                data=[{"id": "TEST-DOC-001", "review_status": "approved"}], error=None
            )
        )

        mock_supabase.table.return_value = mock_table

        # Act
        document_approve_tool.func(
            document_id="TEST-DOC-001", reviewed_by="TEST-REVIEWER-001"
        )

        # Assert
        assert captured_update_data is not None
        assert captured_update_data["review_status"] == "approved"

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_approve_document_sets_reviewed_at_timestamp(
        self, mock_supabase, test_document_data
    ):
        """
        Test that approval sets reviewed_at timestamp.

        Expected behavior:
        - Update payload contains reviewed_at timestamp
        - Update payload contains reviewed_by
        """
        # Arrange
        mock_table = MagicMock()
        captured_update_data = None

        def capture_update(data):
            nonlocal captured_update_data
            captured_update_data = data
            return mock_table

        # Mock the document existence check
        mock_table.select.return_value.eq.return_value.single.return_value.execute = (
            AsyncMock(return_value=MagicMock(data=test_document_data))
        )

        # Capture the update call
        mock_table.update = capture_update
        mock_table.eq.return_value.execute = AsyncMock(
            return_value=MagicMock(
                data=[{"id": "TEST-DOC-001", "review_status": "approved"}], error=None
            )
        )

        mock_supabase.table.return_value = mock_table

        # Act
        document_approve_tool.func(
            document_id="TEST-DOC-001", reviewed_by="TEST-REVIEWER-001"
        )

        # Assert
        assert captured_update_data is not None
        assert "reviewed_at" in captured_update_data
        assert captured_update_data["reviewed_by"] == "TEST-REVIEWER-001"

        # Verify timestamp is approximately current
        reviewed_at = datetime.fromisoformat(captured_update_data["reviewed_at"])
        time_diff = abs((reviewed_at - datetime.now()).total_seconds())
        assert time_diff < 5, "reviewed_at should be approximately current time"

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_approve_document_missing_document_id(self, mock_supabase):
        """
        Test document approval with missing document_id returns validation error.

        Expected behavior:
        - Returns APPROVE_ERROR when document_id is empty
        """
        # Act
        result = document_approve_tool.func(
            document_id="", reviewed_by="TEST-REVIEWER-001"
        )

        # Assert
        assert "APPROVE_ERROR" in result
        assert "document_id is required" in result

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_approve_document_missing_reviewed_by(self, mock_supabase):
        """
        Test document approval with missing reviewed_by returns validation error.

        Expected behavior:
        - Returns APPROVE_ERROR when reviewed_by is empty
        """
        # Act
        result = document_approve_tool.func(
            document_id="TEST-DOC-001", reviewed_by=""
        )

        # Assert
        assert "APPROVE_ERROR" in result
        assert "reviewed_by is required" in result

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_approve_document_database_error_handled(
        self, mock_supabase, test_document_data
    ):
        """
        Test database errors are handled gracefully.

        Expected behavior:
        - Returns APPROVE_ERROR when database operation fails
        """
        # Arrange
        mock_table = MagicMock()

        # Mock the document existence check
        mock_table.select.return_value.eq.return_value.single.return_value.execute = (
            AsyncMock(return_value=MagicMock(data=test_document_data))
        )

        # Mock the update operation failing
        mock_table.update.return_value.eq.return_value.execute = AsyncMock(
            return_value=MagicMock(data=None, error="Database connection failed")
        )

        mock_supabase.table.return_value = mock_table

        # Act
        result = document_approve_tool.func(
            document_id="TEST-DOC-001", reviewed_by="TEST-REVIEWER-001"
        )

        # Assert
        assert "APPROVE_ERROR" in result
        assert "Failed to update document" in result

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_approve_document_exception_handling(self, mock_supabase):
        """
        Test unexpected exceptions are caught and handled.

        Expected behavior:
        - Returns APPROVE_ERROR with exception details
        """
        # Arrange
        mock_table = MagicMock()

        # Mock the document existence check raising an exception
        mock_table.select.return_value.eq.return_value.single.return_value.execute = (
            AsyncMock(side_effect=Exception("Unexpected database error"))
        )

        mock_supabase.table.return_value = mock_table

        # Act
        result = document_approve_tool.func(
            document_id="TEST-DOC-001", reviewed_by="TEST-REVIEWER-001"
        )

        # Assert
        assert "APPROVE_ERROR" in result
        assert "Unexpected error" in result


# =============================================================================
# Test: get_application_documents
# =============================================================================


@pytest.mark.unit
class TestGetApplicationDocuments:
    """Test get application documents tool."""

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_get_documents_returns_list(
        self, mock_supabase, test_application_documents_list
    ):
        """
        Test that get_application_documents returns list of documents.

        Expected behavior:
        - Returns documents for the application
        - Includes all document fields
        """
        # Arrange
        mock_table = MagicMock()

        mock_table.select.return_value.eq.return_value.order.return_value.execute = (
            AsyncMock(
                return_value=MagicMock(data=test_application_documents_list, error=None)
            )
        )

        mock_supabase.table.return_value = mock_table

        # Act
        result = get_application_documents.func(application_id="TEST-APP-001")

        # Assert
        assert "TEST-APP-001" in result
        assert "TEST-DOC-001" in result
        assert "TEST-DOC-002" in result
        assert "TEST-DOC-003" in result
        mock_supabase.table.assert_called_with("application_documents")

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_get_documents_empty_application_returns_empty_list(self, mock_supabase):
        """
        Test that empty application returns empty list.

        Expected behavior:
        - Returns response with total_documents: 0
        - Empty documents array
        """
        # Arrange
        mock_table = MagicMock()

        mock_table.select.return_value.eq.return_value.order.return_value.execute = (
            AsyncMock(return_value=MagicMock(data=[], error=None))
        )

        mock_supabase.table.return_value = mock_table

        # Act
        result = get_application_documents.func(application_id="TEST-APP-EMPTY")

        # Assert
        assert "TEST-APP-EMPTY" in result
        assert "'total_documents': 0" in result
        assert "'documents': []" in result

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_get_documents_returns_review_summary(
        self, mock_supabase, test_application_documents_list
    ):
        """
        Test that response includes review summary with counts.

        Expected behavior:
        - Returns review_summary with pending/approved/flagged counts
        """
        # Arrange
        mock_table = MagicMock()

        mock_table.select.return_value.eq.return_value.order.return_value.execute = (
            AsyncMock(
                return_value=MagicMock(data=test_application_documents_list, error=None)
            )
        )

        mock_supabase.table.return_value = mock_table

        # Act
        result = get_application_documents.func(application_id="TEST-APP-001")

        # Assert
        assert "'review_summary'" in result
        assert "'pending': 1" in result
        assert "'approved': 1" in result
        assert "'flagged': 1" in result

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_get_documents_missing_application_id(self, mock_supabase):
        """
        Test get_application_documents with missing application_id.

        Expected behavior:
        - Returns GET_DOCS_ERROR when application_id is empty
        """
        # Act
        result = get_application_documents.func(application_id="")

        # Assert
        assert "GET_DOCS_ERROR" in result
        assert "application_id is required" in result

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_get_documents_database_error_handled(self, mock_supabase):
        """
        Test database errors are handled gracefully.

        Expected behavior:
        - Returns GET_DOCS_ERROR when database operation fails
        """
        # Arrange
        mock_table = MagicMock()

        mock_table.select.return_value.eq.return_value.order.return_value.execute = (
            AsyncMock(return_value=MagicMock(data=None, error="Database error"))
        )

        mock_supabase.table.return_value = mock_table

        # Act
        result = get_application_documents.func(application_id="TEST-APP-001")

        # Assert
        assert "GET_DOCS_ERROR" in result
        assert "Failed to fetch documents" in result

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_get_documents_exception_handling(self, mock_supabase):
        """
        Test unexpected exceptions are caught and handled.

        Expected behavior:
        - Returns GET_DOCS_ERROR with exception details
        """
        # Arrange
        mock_table = MagicMock()

        mock_table.select.return_value.eq.return_value.order.return_value.execute = (
            AsyncMock(side_effect=Exception("Unexpected database error"))
        )

        mock_supabase.table.return_value = mock_table

        # Act
        result = get_application_documents.func(application_id="TEST-APP-001")

        # Assert
        assert "GET_DOCS_ERROR" in result
        assert "Unexpected error" in result

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_get_documents_handles_null_data(self, mock_supabase):
        """
        Test handling of None data from database.

        Expected behavior:
        - Treats None as empty list
        - Returns response with total_documents: 0
        """
        # Arrange
        mock_table = MagicMock()

        mock_table.select.return_value.eq.return_value.order.return_value.execute = (
            AsyncMock(return_value=MagicMock(data=None, error=None))
        )

        mock_supabase.table.return_value = mock_table

        # Act
        result = get_application_documents.func(application_id="TEST-APP-001")

        # Assert
        assert "'total_documents': 0" in result
        assert "'documents': []" in result

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_get_documents_orders_by_uploaded_at(self, mock_supabase):
        """
        Test that documents are ordered by uploaded_at ascending.

        Expected behavior:
        - Calls order() with correct parameters
        """
        # Arrange
        mock_table = MagicMock()

        mock_table.select.return_value.eq.return_value.order.return_value.execute = (
            AsyncMock(return_value=MagicMock(data=[], error=None))
        )

        mock_supabase.table.return_value = mock_table

        # Act
        get_application_documents.func(application_id="TEST-APP-001")

        # Assert
        mock_table.select.return_value.eq.return_value.order.assert_called_once_with(
            "uploaded_at", desc=False
        )


# =============================================================================
# Integration-Style Tests
# =============================================================================


@pytest.mark.unit
class TestDocumentReviewWorkflows:
    """Integration-style tests for complete document review workflows."""

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_flag_then_approve_workflow(self, mock_supabase, test_document_data):
        """
        Test workflow: flag document -> then approve same document.

        Expected behavior:
        - Document can be flagged
        - Same document can be subsequently approved
        - Approval clears the previous flag
        """
        # Step 1: Flag the document
        mock_table = MagicMock()

        # Mock for flag operation
        mock_table.select.return_value.eq.return_value.single.return_value.execute = (
            AsyncMock(return_value=MagicMock(data=test_document_data))
        )
        mock_table.update.return_value.eq.return_value.execute = AsyncMock(
            return_value=MagicMock(
                data=[{"id": "TEST-DOC-001", "review_status": "flagged"}], error=None
            )
        )
        mock_supabase.table.return_value = mock_table

        flag_result = document_flag_tool.func(
            document_id="TEST-DOC-001",
            flag_reason="Document quality is low",
            flagged_by="TEST-REVIEWER-001",
        )
        assert "DOCUMENT_FLAGGED" in flag_result

        # Step 2: Approve the previously flagged document
        flagged_document = test_document_data.copy()
        flagged_document["review_status"] = "flagged"

        mock_table.select.return_value.eq.return_value.single.return_value.execute = (
            AsyncMock(return_value=MagicMock(data=flagged_document))
        )
        mock_table.update.return_value.eq.return_value.execute = AsyncMock(
            return_value=MagicMock(
                data=[{"id": "TEST-DOC-001", "review_status": "approved"}], error=None
            )
        )

        approve_result = document_approve_tool.func(
            document_id="TEST-DOC-001", reviewed_by="TEST-REVIEWER-002"
        )
        assert "DOCUMENT_APPROVED" in approve_result
        assert "previously flagged" in approve_result.lower()

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_review_all_documents_workflow(
        self, mock_supabase, test_application_documents_list
    ):
        """
        Test workflow: get documents -> review each -> get updated summary.

        Expected behavior:
        - Can retrieve all documents for application
        - Summary reflects actual review status counts
        """
        # Arrange
        mock_table = MagicMock()

        mock_table.select.return_value.eq.return_value.order.return_value.execute = (
            AsyncMock(
                return_value=MagicMock(data=test_application_documents_list, error=None)
            )
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = get_application_documents.func(application_id="TEST-APP-001")

        # Assert - verify we get all documents with their statuses
        assert "'total_documents': 3" in result
        assert "'pending': 1" in result
        assert "'approved': 1" in result
        assert "'flagged': 1" in result


# =============================================================================
# Edge Cases
# =============================================================================


@pytest.mark.unit
class TestDocumentReviewEdgeCases:
    """Test edge cases and boundary conditions."""

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_flag_document_with_long_reason(self, mock_supabase, test_document_data):
        """
        Test flagging document with very long reason.

        Expected behavior:
        - Accepts long flag reason
        - Successfully processes the request
        """
        # Arrange
        mock_table = MagicMock()
        long_reason = "A" * 1000  # 1000 character reason

        mock_table.select.return_value.eq.return_value.single.return_value.execute = (
            AsyncMock(return_value=MagicMock(data=test_document_data))
        )
        mock_table.update.return_value.eq.return_value.execute = AsyncMock(
            return_value=MagicMock(
                data=[{"id": "TEST-DOC-001", "review_status": "flagged"}], error=None
            )
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = document_flag_tool.func(
            document_id="TEST-DOC-001",
            flag_reason=long_reason,
            flagged_by="TEST-REVIEWER-001",
        )

        # Assert
        assert "DOCUMENT_FLAGGED" in result

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_flag_document_with_special_characters_in_reason(
        self, mock_supabase, test_document_data
    ):
        """
        Test flagging document with special characters in reason.

        Expected behavior:
        - Accepts special characters in flag reason
        - Successfully processes the request
        """
        # Arrange
        mock_table = MagicMock()
        special_reason = "Document has issues: <script>alert('XSS')</script> & 'quotes' \"double\""

        mock_table.select.return_value.eq.return_value.single.return_value.execute = (
            AsyncMock(return_value=MagicMock(data=test_document_data))
        )
        mock_table.update.return_value.eq.return_value.execute = AsyncMock(
            return_value=MagicMock(
                data=[{"id": "TEST-DOC-001", "review_status": "flagged"}], error=None
            )
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = document_flag_tool.func(
            document_id="TEST-DOC-001",
            flag_reason=special_reason,
            flagged_by="TEST-REVIEWER-001",
        )

        # Assert
        assert "DOCUMENT_FLAGGED" in result

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_get_documents_with_many_documents(self, mock_supabase):
        """
        Test getting documents when application has many documents.

        Expected behavior:
        - Returns all documents
        - Calculates correct summary counts
        """
        # Arrange
        many_documents = []
        for i in range(50):
            status = ["pending", "approved", "flagged"][i % 3]
            many_documents.append(
                {
                    "id": f"TEST-DOC-{i:03d}",
                    "document_type": "document",
                    "file_name": f"doc_{i}.pdf",
                    "file_url": f"https://storage.example.com/docs/doc_{i}.pdf",
                    "uploaded_at": f"2026-01-15T10:{i:02d}:00",
                    "review_status": status,
                    "flag_reason": "Issue" if status == "flagged" else None,
                    "flagged_by": "reviewer" if status == "flagged" else None,
                    "flagged_at": None,
                    "reviewed_by": None,
                    "reviewed_at": None,
                }
            )

        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.order.return_value.execute = (
            AsyncMock(return_value=MagicMock(data=many_documents, error=None))
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = get_application_documents.func(application_id="TEST-APP-001")

        # Assert
        assert "'total_documents': 50" in result
        # 50 documents, cycling through 3 statuses means ~17 each, 16 for the remainder
        assert "'pending': 17" in result
        assert "'approved': 17" in result
        assert "'flagged': 16" in result

    @patch("one_for_all.tools.document_review_tools.supabase")
    def test_flag_reason_stripped_of_whitespace(
        self, mock_supabase, test_document_data
    ):
        """
        Test that flag reason is stripped of leading/trailing whitespace.

        Expected behavior:
        - Whitespace-padded reason is trimmed before storage
        """
        # Arrange
        mock_table = MagicMock()
        captured_update_data = None

        def capture_update(data):
            nonlocal captured_update_data
            captured_update_data = data
            return mock_table

        mock_table.select.return_value.eq.return_value.single.return_value.execute = (
            AsyncMock(return_value=MagicMock(data=test_document_data))
        )
        mock_table.update = capture_update
        mock_table.eq.return_value.execute = AsyncMock(
            return_value=MagicMock(
                data=[{"id": "TEST-DOC-001", "review_status": "flagged"}], error=None
            )
        )
        mock_supabase.table.return_value = mock_table

        # Act
        document_flag_tool.func(
            document_id="TEST-DOC-001",
            flag_reason="   Document is illegible   ",
            flagged_by="TEST-REVIEWER-001",
        )

        # Assert
        assert captured_update_data is not None
        assert captured_update_data["flag_reason"] == "Document is illegible"
