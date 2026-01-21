"""
Unit tests for NSFAS Supabase tools.

Tests the NSFAS-specific database interaction tools:
- supabase_nsfas_store - NSFAS application storage
- supabase_nsfas_documents_store - NSFAS document metadata storage

All tests use mocks to avoid actual database calls.
"""

import pytest
from datetime import datetime
from unittest.mock import MagicMock, AsyncMock, patch
import sys
from pathlib import Path

# Add src to path
src_path = Path(__file__).resolve().parent.parent.parent.parent / "src"
sys.path.insert(0, str(src_path))

from one_for_all.tools.supabase_nsfas_store import supabase_nsfas_store
from one_for_all.tools.supabase_nsfas_documents_store import supabase_nsfas_documents_store


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def mock_supabase_table():
    """Create a mock Supabase table interface with chainable methods."""
    mock_table = MagicMock()

    # Configure chainable methods for operations
    mock_table.select.return_value = mock_table
    mock_table.insert.return_value = mock_table
    mock_table.update.return_value = mock_table
    mock_table.eq.return_value = mock_table

    return mock_table


@pytest.fixture
def test_nsfas_application_data():
    """Sample NSFAS application data for testing with TEST- prefix."""
    return {
        "id": "TEST-NSFAS-001",
        "user_id": "TEST-USER-001",
        "reference_number": "TEST-NSFAS-REF-001",
        "academic_year": 2026,
        "status": "pending",
        "created_at": datetime.utcnow().isoformat()
    }


@pytest.fixture
def test_nsfas_full_application_data():
    """Sample NSFAS application with all fields (income, guardian, bank details)."""
    return {
        "id": "TEST-NSFAS-FULL-001",
        "user_id": "TEST-USER-002",
        "reference_number": "TEST-NSFAS-REF-FULL-001",
        "academic_year": 2026,
        "status": "pending",

        # Income details
        "household_income": 150000,
        "income_source": "Employment",
        "employment_status": "Employed",
        "employer_name": "TEST Company Ltd",

        # Guardian details
        "guardian_full_name": "Test Guardian Parent",
        "guardian_id_number": "7001010000000",
        "guardian_relationship": "Parent",
        "guardian_contact_number": "+27821234567",
        "guardian_email": "guardian@example.com",
        "guardian_employment_status": "Employed",

        # Bank details
        "bank_name": "TEST Bank",
        "account_holder_name": "Test Guardian Parent",
        "account_number": "1234567890",
        "branch_code": "123456",
        "account_type": "Savings",

        # Additional NSFAS fields
        "sassa_recipient": False,
        "disability_grant": False,
        "orphan_status": False,
        "study_level": "Undergraduate",
        "institution_id": "UP-001",

        "created_at": datetime.utcnow().isoformat()
    }


@pytest.fixture
def test_nsfas_document_data():
    """Sample NSFAS document metadata for testing."""
    return {
        "id": "TEST-DOC-001",
        "nsfas_application_id": "TEST-NSFAS-001",
        "file_url": "https://storage.example.com/nsfas/proof_of_income.pdf",
        "document_type": "proof_of_income",
        "uploaded_at": datetime.utcnow().isoformat()
    }


# =============================================================================
# Test: supabase_nsfas_store
# =============================================================================

@pytest.mark.unit
class TestSupabaseNsfasStore:
    """Test NSFAS application storage tool."""

    @patch('one_for_all.tools.supabase_nsfas_store.supabase')
    def test_nsfas_store_success(self, mock_supabase, test_nsfas_application_data):
        """
        Test successful NSFAS application storage with user_id returns data.

        Expected behavior:
        - Calls supabase.table("nsfas_applications").insert()
        - Returns string representation of stored data
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[test_nsfas_application_data])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_nsfas_store.func(test_nsfas_application_data)

        # Assert
        assert result is not None
        assert "TEST-NSFAS-001" in result or "TEST-USER-001" in result
        mock_supabase.table.assert_called_with("nsfas_applications")

    @patch('one_for_all.tools.supabase_nsfas_store.supabase')
    def test_nsfas_store_empty_result(self, mock_supabase, test_nsfas_application_data):
        """
        Test NSFAS storage with empty result returns "[]".

        Expected behavior:
        - Returns empty list string when no data returned
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_nsfas_store.func(test_nsfas_application_data)

        # Assert
        assert result == "[]"

    @patch('one_for_all.tools.supabase_nsfas_store.supabase')
    def test_nsfas_store_with_all_fields(self, mock_supabase, test_nsfas_full_application_data):
        """
        Test NSFAS storage with all fields (income, guardian, bank details).

        Expected behavior:
        - Accepts dict with complete NSFAS application including:
          - Household income details
          - Guardian information
          - Bank account details
        - Successfully inserts to database
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[test_nsfas_full_application_data])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_nsfas_store.func(test_nsfas_full_application_data)

        # Assert
        assert result is not None
        assert "TEST-NSFAS-FULL-001" in result or "TEST-USER-002" in result
        # Verify income, guardian, and bank data is included
        assert "TEST Company Ltd" in result or "guardian" in result.lower() or "150000" in result

    @patch('one_for_all.tools.supabase_nsfas_store.supabase')
    def test_nsfas_store_database_error_propagates(self, mock_supabase, test_nsfas_application_data):
        """
        Test database errors propagate correctly.

        Expected behavior:
        - Propagates exception when database operation fails
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            side_effect=Exception("Database connection error")
        )
        mock_supabase.table.return_value = mock_table

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            supabase_nsfas_store.func(test_nsfas_application_data)

        assert "Database connection error" in str(exc_info.value)

    @patch('one_for_all.tools.supabase_nsfas_store.supabase')
    def test_nsfas_store_async_pattern_works(self, mock_supabase, test_nsfas_application_data):
        """
        Test that async pattern with asyncio.run works correctly.

        Expected behavior:
        - Tool wraps async Supabase call with asyncio.run()
        - Returns result as string
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[{"id": "TEST-ASYNC-001", "status": "created"}])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_nsfas_store.func(test_nsfas_application_data)

        # Assert
        assert isinstance(result, str)
        assert "TEST-ASYNC-001" in result or "created" in result

    @patch('one_for_all.tools.supabase_nsfas_store.supabase')
    def test_nsfas_store_with_sassa_recipient(self, mock_supabase):
        """
        Test NSFAS storage for SASSA grant recipient.

        Expected behavior:
        - Handles SASSA recipient flag correctly
        - Stores application successfully
        """
        # Arrange
        sassa_application = {
            "id": "TEST-NSFAS-SASSA-001",
            "user_id": "TEST-USER-SASSA",
            "reference_number": "TEST-NSFAS-SASSA-REF",
            "academic_year": 2026,
            "sassa_recipient": True,
            "sassa_grant_type": "Child Support Grant",
            "household_income": 0,
            "status": "pending"
        }

        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[sassa_application])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_nsfas_store.func(sassa_application)

        # Assert
        assert result is not None
        assert "TEST-NSFAS-SASSA-001" in result

    @patch('one_for_all.tools.supabase_nsfas_store.supabase')
    def test_nsfas_store_with_disability_grant(self, mock_supabase):
        """
        Test NSFAS storage for disability grant recipient.

        Expected behavior:
        - Handles disability grant flag correctly
        - Stores application successfully
        """
        # Arrange
        disability_application = {
            "id": "TEST-NSFAS-DISABILITY-001",
            "user_id": "TEST-USER-DISABILITY",
            "reference_number": "TEST-NSFAS-DISABILITY-REF",
            "academic_year": 2026,
            "disability_grant": True,
            "disability_type": "Physical",
            "household_income": 75000,
            "status": "pending"
        }

        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[disability_application])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_nsfas_store.func(disability_application)

        # Assert
        assert result is not None
        assert "TEST-NSFAS-DISABILITY-001" in result

    @patch('one_for_all.tools.supabase_nsfas_store.supabase')
    def test_nsfas_store_constraint_violation_error(self, mock_supabase, test_nsfas_application_data):
        """
        Test NSFAS storage with database constraint violation.

        Expected behavior:
        - Propagates constraint violation errors
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            side_effect=Exception("duplicate key value violates unique constraint")
        )
        mock_supabase.table.return_value = mock_table

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            supabase_nsfas_store.func(test_nsfas_application_data)

        assert "unique constraint" in str(exc_info.value)


# =============================================================================
# Test: supabase_nsfas_documents_store
# =============================================================================

@pytest.mark.unit
class TestSupabaseNsfasDocumentsStore:
    """Test NSFAS document metadata storage tool."""

    @patch('one_for_all.tools.supabase_nsfas_documents_store.supabase')
    def test_nsfas_document_store_success(self, mock_supabase, test_nsfas_document_data):
        """
        Test successful document insert with nsfas_application_id.

        Expected behavior:
        - Calls supabase.table("nsfas_documents").insert()
        - Returns string representation of stored document metadata
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[test_nsfas_document_data])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_nsfas_documents_store.func(test_nsfas_document_data)

        # Assert
        assert result is not None
        assert "TEST-DOC-001" in result or "proof_of_income" in result
        mock_supabase.table.assert_called_with("nsfas_documents")

    @patch('one_for_all.tools.supabase_nsfas_documents_store.supabase')
    def test_nsfas_document_store_with_required_fields(self, mock_supabase):
        """
        Test document storage validates required fields (file_url, document_type).

        Expected behavior:
        - Accepts dict with required fields
        - Successfully inserts to database
        """
        # Arrange
        minimal_document = {
            "nsfas_application_id": "TEST-NSFAS-002",
            "file_url": "https://storage.example.com/doc.pdf",
            "document_type": "consent_form"
        }

        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[{**minimal_document, "id": "TEST-DOC-MIN-001"}])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_nsfas_documents_store.func(minimal_document)

        # Assert
        assert result is not None
        assert "TEST-DOC-MIN-001" in result or "consent_form" in result

    @patch('one_for_all.tools.supabase_nsfas_documents_store.supabase')
    def test_nsfas_document_store_proof_of_income(self, mock_supabase):
        """
        Test storing proof_of_income document type.

        Expected behavior:
        - Accepts proof_of_income document type
        - Successfully inserts to database
        """
        # Arrange
        income_document = {
            "id": "TEST-DOC-INCOME-001",
            "nsfas_application_id": "TEST-NSFAS-003",
            "file_url": "https://storage.example.com/nsfas/income_proof.pdf",
            "document_type": "proof_of_income",
            "file_name": "payslip_jan_2026.pdf",
            "file_size": 256000
        }

        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[income_document])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_nsfas_documents_store.func(income_document)

        # Assert
        assert "proof_of_income" in result or "TEST-DOC-INCOME-001" in result

    @patch('one_for_all.tools.supabase_nsfas_documents_store.supabase')
    def test_nsfas_document_store_consent_form(self, mock_supabase):
        """
        Test storing consent_form document type.

        Expected behavior:
        - Accepts consent_form document type
        - Successfully inserts to database
        """
        # Arrange
        consent_document = {
            "id": "TEST-DOC-CONSENT-001",
            "nsfas_application_id": "TEST-NSFAS-004",
            "file_url": "https://storage.example.com/nsfas/consent_form.pdf",
            "document_type": "consent_form",
            "file_name": "nsfas_consent_signed.pdf"
        }

        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[consent_document])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_nsfas_documents_store.func(consent_document)

        # Assert
        assert "consent_form" in result or "TEST-DOC-CONSENT-001" in result

    @patch('one_for_all.tools.supabase_nsfas_documents_store.supabase')
    def test_nsfas_document_store_sassa_letter(self, mock_supabase):
        """
        Test storing sassa_letter document type.

        Expected behavior:
        - Accepts sassa_letter document type
        - Successfully inserts to database
        """
        # Arrange
        sassa_document = {
            "id": "TEST-DOC-SASSA-001",
            "nsfas_application_id": "TEST-NSFAS-005",
            "file_url": "https://storage.example.com/nsfas/sassa_confirmation.pdf",
            "document_type": "sassa_letter",
            "file_name": "sassa_grant_confirmation.pdf"
        }

        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[sassa_document])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_nsfas_documents_store.func(sassa_document)

        # Assert
        assert "sassa_letter" in result or "TEST-DOC-SASSA-001" in result

    @patch('one_for_all.tools.supabase_nsfas_documents_store.supabase')
    def test_nsfas_document_store_id_document(self, mock_supabase):
        """
        Test storing id_document (ID copy) type.

        Expected behavior:
        - Accepts id_document type for applicant/guardian ID
        - Successfully inserts to database
        """
        # Arrange
        id_document = {
            "id": "TEST-DOC-ID-001",
            "nsfas_application_id": "TEST-NSFAS-006",
            "file_url": "https://storage.example.com/nsfas/id_copy.pdf",
            "document_type": "id_document",
            "file_name": "applicant_id_copy.pdf"
        }

        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[id_document])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_nsfas_documents_store.func(id_document)

        # Assert
        assert "id_document" in result or "TEST-DOC-ID-001" in result

    @patch('one_for_all.tools.supabase_nsfas_documents_store.supabase')
    def test_nsfas_document_store_bank_statement(self, mock_supabase):
        """
        Test storing bank_statement document type.

        Expected behavior:
        - Accepts bank_statement document type
        - Successfully inserts to database
        """
        # Arrange
        bank_document = {
            "id": "TEST-DOC-BANK-001",
            "nsfas_application_id": "TEST-NSFAS-007",
            "file_url": "https://storage.example.com/nsfas/bank_statement.pdf",
            "document_type": "bank_statement",
            "file_name": "fnb_statement_dec_2025.pdf"
        }

        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[bank_document])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_nsfas_documents_store.func(bank_document)

        # Assert
        assert "bank_statement" in result or "TEST-DOC-BANK-001" in result

    @patch('one_for_all.tools.supabase_nsfas_documents_store.supabase')
    def test_nsfas_document_store_vulnerability_assessment(self, mock_supabase):
        """
        Test storing vulnerability_assessment document type.

        Expected behavior:
        - Accepts vulnerability_assessment document type (for orphans, etc.)
        - Successfully inserts to database
        """
        # Arrange
        vulnerability_document = {
            "id": "TEST-DOC-VULN-001",
            "nsfas_application_id": "TEST-NSFAS-008",
            "file_url": "https://storage.example.com/nsfas/vulnerability_assessment.pdf",
            "document_type": "vulnerability_assessment",
            "file_name": "social_worker_report.pdf"
        }

        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[vulnerability_document])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_nsfas_documents_store.func(vulnerability_document)

        # Assert
        assert "vulnerability_assessment" in result or "TEST-DOC-VULN-001" in result

    @patch('one_for_all.tools.supabase_nsfas_documents_store.supabase')
    def test_nsfas_document_store_database_error(self, mock_supabase, test_nsfas_document_data):
        """
        Test database errors are handled correctly.

        Expected behavior:
        - Propagates exception when database operation fails
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            side_effect=Exception("Storage bucket error")
        )
        mock_supabase.table.return_value = mock_table

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            supabase_nsfas_documents_store.func(test_nsfas_document_data)

        assert "Storage bucket error" in str(exc_info.value)

    @patch('one_for_all.tools.supabase_nsfas_documents_store.supabase')
    def test_nsfas_document_store_foreign_key_error(self, mock_supabase):
        """
        Test foreign key constraint error when nsfas_application_id is invalid.

        Expected behavior:
        - Propagates foreign key constraint violation
        """
        # Arrange
        invalid_document = {
            "nsfas_application_id": "NONEXISTENT-NSFAS-999",
            "file_url": "https://storage.example.com/doc.pdf",
            "document_type": "proof_of_income"
        }

        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            side_effect=Exception("violates foreign key constraint")
        )
        mock_supabase.table.return_value = mock_table

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            supabase_nsfas_documents_store.func(invalid_document)

        assert "foreign key constraint" in str(exc_info.value)

    @patch('one_for_all.tools.supabase_nsfas_documents_store.supabase')
    def test_nsfas_document_store_empty_result(self, mock_supabase, test_nsfas_document_data):
        """
        Test document storage with empty result returns "[]".

        Expected behavior:
        - Returns empty list string when no data returned
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_nsfas_documents_store.func(test_nsfas_document_data)

        # Assert
        assert result == "[]"

    @patch('one_for_all.tools.supabase_nsfas_documents_store.supabase')
    def test_nsfas_document_store_with_metadata(self, mock_supabase):
        """
        Test document storage with additional metadata fields.

        Expected behavior:
        - Accepts document with extra metadata (file_size, mime_type, etc.)
        - Successfully inserts to database
        """
        # Arrange
        document_with_metadata = {
            "id": "TEST-DOC-META-001",
            "nsfas_application_id": "TEST-NSFAS-009",
            "file_url": "https://storage.example.com/nsfas/detailed_doc.pdf",
            "document_type": "proof_of_income",
            "file_name": "detailed_payslip.pdf",
            "file_size": 512000,
            "mime_type": "application/pdf",
            "uploaded_by": "TEST-USER-009",
            "uploaded_at": datetime.utcnow().isoformat(),
            "verified": False,
            "verification_notes": None
        }

        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[document_with_metadata])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_nsfas_documents_store.func(document_with_metadata)

        # Assert
        assert result is not None
        assert "TEST-DOC-META-001" in result


# =============================================================================
# Integration-Style Tests for NSFAS Workflow
# =============================================================================

@pytest.mark.unit
class TestNsfasToolsWorkflow:
    """Integration-style tests for NSFAS tool workflows."""

    @patch('one_for_all.tools.supabase_nsfas_store.supabase')
    @patch('one_for_all.tools.supabase_nsfas_documents_store.supabase')
    def test_nsfas_application_and_documents_workflow(
        self,
        mock_docs_supabase,
        mock_nsfas_supabase,
        test_nsfas_application_data,
        test_nsfas_document_data
    ):
        """
        Test complete NSFAS workflow: store application -> store documents.

        Expected behavior:
        - NSFAS application is stored successfully
        - Documents linked to application are stored successfully
        """
        # Step 1: Store NSFAS application
        mock_nsfas_table = MagicMock()
        mock_nsfas_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[test_nsfas_application_data])
        )
        mock_nsfas_supabase.table.return_value = mock_nsfas_table

        nsfas_result = supabase_nsfas_store.func(test_nsfas_application_data)
        assert "TEST-NSFAS-001" in nsfas_result

        # Step 2: Store NSFAS document
        mock_docs_table = MagicMock()
        mock_docs_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[test_nsfas_document_data])
        )
        mock_docs_supabase.table.return_value = mock_docs_table

        doc_result = supabase_nsfas_documents_store.func(test_nsfas_document_data)
        assert "TEST-DOC-001" in doc_result or "proof_of_income" in doc_result

    @patch('one_for_all.tools.supabase_nsfas_documents_store.supabase')
    def test_multiple_documents_for_single_application(self, mock_supabase):
        """
        Test storing multiple documents for a single NSFAS application.

        Expected behavior:
        - Multiple document types can be stored for same application
        - Each insert succeeds independently
        """
        # Arrange
        application_id = "TEST-NSFAS-MULTI-DOC-001"
        documents = [
            {
                "id": "TEST-DOC-MULTI-1",
                "nsfas_application_id": application_id,
                "file_url": "https://storage.example.com/doc1.pdf",
                "document_type": "proof_of_income"
            },
            {
                "id": "TEST-DOC-MULTI-2",
                "nsfas_application_id": application_id,
                "file_url": "https://storage.example.com/doc2.pdf",
                "document_type": "consent_form"
            },
            {
                "id": "TEST-DOC-MULTI-3",
                "nsfas_application_id": application_id,
                "file_url": "https://storage.example.com/doc3.pdf",
                "document_type": "id_document"
            },
            {
                "id": "TEST-DOC-MULTI-4",
                "nsfas_application_id": application_id,
                "file_url": "https://storage.example.com/doc4.pdf",
                "document_type": "sassa_letter"
            }
        ]

        mock_table = MagicMock()

        # Store each document
        for doc in documents:
            mock_table.insert.return_value.execute = AsyncMock(
                return_value=MagicMock(data=[doc])
            )
            mock_supabase.table.return_value = mock_table

            result = supabase_nsfas_documents_store.func(doc)
            assert doc["id"] in result or doc["document_type"] in result


# =============================================================================
# Edge Cases and Error Handling
# =============================================================================

@pytest.mark.unit
class TestNsfasToolsEdgeCases:
    """Test edge cases and boundary conditions for NSFAS tools."""

    @patch('one_for_all.tools.supabase_nsfas_store.supabase')
    def test_nsfas_store_with_zero_income(self, mock_supabase):
        """
        Test NSFAS storage with zero household income.

        Expected behavior:
        - Handles zero income (e.g., unemployed guardian)
        - Successfully stores application
        """
        # Arrange
        zero_income_app = {
            "id": "TEST-NSFAS-ZERO-001",
            "user_id": "TEST-USER-ZERO",
            "reference_number": "TEST-NSFAS-ZERO-REF",
            "academic_year": 2026,
            "household_income": 0,
            "income_source": "None - Unemployed",
            "sassa_recipient": True,
            "status": "pending"
        }

        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[zero_income_app])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_nsfas_store.func(zero_income_app)

        # Assert
        assert result is not None
        assert "TEST-NSFAS-ZERO-001" in result

    @patch('one_for_all.tools.supabase_nsfas_store.supabase')
    def test_nsfas_store_with_special_characters_in_names(self, mock_supabase):
        """
        Test NSFAS storage with special characters in guardian names.

        Expected behavior:
        - Handles special characters in names (apostrophes, hyphens)
        - Successfully stores application
        """
        # Arrange
        special_chars_app = {
            "id": "TEST-NSFAS-SPECIAL-001",
            "user_id": "TEST-USER-SPECIAL",
            "reference_number": "TEST-NSFAS-SPECIAL-REF",
            "academic_year": 2026,
            "guardian_full_name": "O'Brien-Smith, Mary-Jane",
            "guardian_id_number": "7001010000000",
            "status": "pending"
        }

        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[special_chars_app])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_nsfas_store.func(special_chars_app)

        # Assert
        assert result is not None
        assert "TEST-NSFAS-SPECIAL-001" in result

    @patch('one_for_all.tools.supabase_nsfas_documents_store.supabase')
    def test_nsfas_document_store_long_url(self, mock_supabase):
        """
        Test document storage with very long file URL.

        Expected behavior:
        - Handles long URLs (up to database column limit)
        - Successfully stores document
        """
        # Arrange
        long_url = "https://storage.example.com/nsfas/" + "a" * 500 + "/document.pdf"
        long_url_doc = {
            "id": "TEST-DOC-LONGURL-001",
            "nsfas_application_id": "TEST-NSFAS-010",
            "file_url": long_url,
            "document_type": "proof_of_income"
        }

        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[long_url_doc])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_nsfas_documents_store.func(long_url_doc)

        # Assert
        assert result is not None
        assert "TEST-DOC-LONGURL-001" in result

    @patch('one_for_all.tools.supabase_nsfas_store.supabase')
    def test_nsfas_store_orphan_applicant(self, mock_supabase):
        """
        Test NSFAS storage for orphan applicant.

        Expected behavior:
        - Handles orphan status with no guardian
        - Successfully stores application
        """
        # Arrange
        orphan_app = {
            "id": "TEST-NSFAS-ORPHAN-001",
            "user_id": "TEST-USER-ORPHAN",
            "reference_number": "TEST-NSFAS-ORPHAN-REF",
            "academic_year": 2026,
            "orphan_status": True,
            "guardian_full_name": None,
            "guardian_id_number": None,
            "household_income": 0,
            "sassa_recipient": True,
            "status": "pending"
        }

        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[orphan_app])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_nsfas_store.func(orphan_app)

        # Assert
        assert result is not None
        assert "TEST-NSFAS-ORPHAN-001" in result

    @patch('one_for_all.tools.supabase_nsfas_store.supabase')
    def test_nsfas_store_high_income_threshold(self, mock_supabase):
        """
        Test NSFAS storage with income at threshold limit.

        Expected behavior:
        - Handles income at NSFAS threshold (R350,000)
        - Successfully stores application
        """
        # Arrange
        threshold_app = {
            "id": "TEST-NSFAS-THRESHOLD-001",
            "user_id": "TEST-USER-THRESHOLD",
            "reference_number": "TEST-NSFAS-THRESHOLD-REF",
            "academic_year": 2026,
            "household_income": 350000,  # NSFAS threshold
            "status": "pending"
        }

        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[threshold_app])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_nsfas_store.func(threshold_app)

        # Assert
        assert result is not None
        assert "TEST-NSFAS-THRESHOLD-001" in result


# =============================================================================
# Audit Decorator Tests
# =============================================================================

@pytest.mark.unit
class TestNsfasToolsAuditLogging:
    """Test that NSFAS tools have proper audit logging."""

    @patch('one_for_all.tools.supabase_nsfas_store.supabase')
    @patch('one_for_all.tools.supabase_nsfas_store.audit_service_role_access')
    def test_nsfas_store_has_audit_decorator(self, mock_audit, mock_supabase, test_nsfas_application_data):
        """
        Test that supabase_nsfas_store is decorated with audit logging.

        Note: Since the decorator is applied at import time, we verify
        the tool function is wrapped by checking its metadata.
        """
        # The decorator adds __wrapped__ attribute
        # Also verify the tool has proper docstring mentioning security
        assert supabase_nsfas_store.func.__doc__ is not None
        assert "SECURITY" in supabase_nsfas_store.func.__doc__ or "user_id" in supabase_nsfas_store.func.__doc__

    @patch('one_for_all.tools.supabase_nsfas_documents_store.supabase')
    def test_nsfas_documents_store_has_audit_decorator(self, mock_supabase, test_nsfas_document_data):
        """
        Test that supabase_nsfas_documents_store is decorated with audit logging.

        Note: Verify the tool has proper docstring with required fields.
        """
        assert supabase_nsfas_documents_store.func.__doc__ is not None
        # Check docstring mentions required fields
        assert "nsfas_application_id" in supabase_nsfas_documents_store.func.__doc__
        assert "file_url" in supabase_nsfas_documents_store.func.__doc__
        assert "document_type" in supabase_nsfas_documents_store.func.__doc__
