"""
Unit tests for Supabase tools.

Tests the Supabase database interaction tools:
- supabase_user_store - user account storage
- supabase_user_lookup - user lookup by email/phone
- supabase_session_create - session creation
- supabase_session_extend - session TTL extension
- supabase_session_lookup - session validation
- supabase_application_store - application storage

All tests use mocks to avoid actual database calls.

Coverage target: 80%+ for all modules.
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch, MagicMock, AsyncMock
import sys
from pathlib import Path

# Add src to path
src_path = Path(__file__).resolve().parent.parent.parent.parent / "src"
sys.path.insert(0, str(src_path))

from one_for_all.tools.supabase_user_store import supabase_user_store
from one_for_all.tools.supabase_user_lookup import supabase_user_lookup
from one_for_all.tools.supabase_session_create import supabase_session_create
from one_for_all.tools.supabase_session_extend import supabase_session_extend
from one_for_all.tools.supabase_session_lookup import supabase_session_lookup
from one_for_all.tools.supabase_application_store import supabase_application_store


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def mock_supabase_table():
    """Create a mock Supabase table interface with chainable methods."""
    mock_table = MagicMock()

    # Configure chainable methods for SELECT operations
    mock_table.select.return_value = mock_table
    mock_table.or_.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.order.return_value = mock_table
    mock_table.limit.return_value = mock_table
    mock_table.insert.return_value = mock_table
    mock_table.update.return_value = mock_table

    return mock_table


@pytest.fixture
def test_user_data():
    """Sample user data for testing with TEST- prefix."""
    return {
        "id": "TEST-USER-001",
        "username": "test_user",
        "email": "test@example.com",
        "phone": "+27821234567",
        "full_name": "Test User",
        "id_number": "0001010000000",
        "created_at": datetime.utcnow().isoformat()
    }


@pytest.fixture
def test_session_data():
    """Sample session data for testing."""
    return {
        "id": "TEST-SESSION-001",
        "user_id": "TEST-USER-001",
        "session_token": "TEST-TOKEN-ABC123",
        "expires_at": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
        "created_at": datetime.utcnow().isoformat()
    }


@pytest.fixture
def test_application_data():
    """Sample application data for testing."""
    return {
        "id": "TEST-APP-001",
        "user_id": "TEST-USER-001",
        "confirmation_number": "TEST-CONF-123",
        "institution": "University of Pretoria",
        "programme": "BSc Computer Science",
        "status": "pending",
        "submitted_at": datetime.utcnow().isoformat()
    }


# =============================================================================
# Test: supabase_user_store
# =============================================================================

class TestSupabaseUserStore:
    """Test user account storage tool."""

    @patch('one_for_all.tools.supabase_user_store.supabase')
    def test_user_store_success(self, mock_supabase, test_user_data):
        """
        Test successful user storage.

        Expected behavior:
        - Calls supabase.table("user_accounts").insert()
        - Returns string representation of stored data
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[test_user_data])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_user_store.func(test_user_data)

        # Assert
        assert result is not None
        assert "TEST-USER-001" in result or "test_user" in result
        mock_supabase.table.assert_called_with("user_accounts")

    @patch('one_for_all.tools.supabase_user_store.supabase')
    def test_user_store_empty_result(self, mock_supabase, test_user_data):
        """
        Test user storage with empty result.

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
        result = supabase_user_store.func(test_user_data)

        # Assert
        assert result == "[]"

    @patch('one_for_all.tools.supabase_user_store.supabase')
    def test_user_store_with_minimal_data(self, mock_supabase):
        """
        Test user storage with minimal required fields.

        Expected behavior:
        - Accepts dict with basic user info
        - Successfully inserts to database
        """
        # Arrange
        minimal_user = {
            "email": "minimal@example.com",
            "full_name": "TEST-Minimal User"
        }
        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[{"id": "TEST-MIN-001", **minimal_user}])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_user_store.func(minimal_user)

        # Assert
        assert "minimal@example.com" in result or "TEST-MIN-001" in result

    @patch('one_for_all.tools.supabase_user_store.supabase')
    def test_user_store_exception_handling(self, mock_supabase, test_user_data):
        """
        Test user storage exception handling.

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
            supabase_user_store.func(test_user_data)

        assert "Database connection error" in str(exc_info.value)


# =============================================================================
# Test: supabase_user_lookup
# =============================================================================

class TestSupabaseUserLookup:
    """Test user lookup tool."""

    @patch('one_for_all.tools.supabase_user_lookup.supabase')
    def test_user_lookup_by_email_success(self, mock_supabase, test_user_data):
        """
        Test successful user lookup by email.

        Expected behavior:
        - Queries user_accounts table
        - Uses OR condition for username and email
        - Returns user data as string
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.select.return_value.or_.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[test_user_data])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_user_lookup.func("test@example.com")

        # Assert
        assert "test@example.com" in result or "TEST-USER-001" in result
        mock_supabase.table.assert_called_with("user_accounts")

    @patch('one_for_all.tools.supabase_user_lookup.supabase')
    def test_user_lookup_by_username_success(self, mock_supabase, test_user_data):
        """
        Test successful user lookup by username.

        Expected behavior:
        - Accepts username as search parameter
        - Returns matching user data
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.select.return_value.or_.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[test_user_data])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_user_lookup.func("test_user")

        # Assert
        assert result is not None
        assert "USER_NOT_FOUND" not in result

    @patch('one_for_all.tools.supabase_user_lookup.supabase')
    def test_user_lookup_not_found(self, mock_supabase):
        """
        Test user lookup when user doesn't exist.

        Expected behavior:
        - Returns "USER_NOT_FOUND" when no matching user
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.select.return_value.or_.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_user_lookup.func("nonexistent@example.com")

        # Assert
        assert result == "USER_NOT_FOUND"

    @patch('one_for_all.tools.supabase_user_lookup.supabase')
    def test_user_lookup_empty_result(self, mock_supabase):
        """
        Test user lookup with None data result.

        Expected behavior:
        - Handles None/empty data gracefully
        - Returns "USER_NOT_FOUND"
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.select.return_value.or_.return_value.execute = AsyncMock(
            return_value=MagicMock(data=None)
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_user_lookup.func("test@example.com")

        # Assert
        assert result == "USER_NOT_FOUND"

    @patch('one_for_all.tools.supabase_user_lookup.supabase')
    def test_user_lookup_query_format(self, mock_supabase, test_user_data):
        """
        Test that lookup uses correct OR query format.

        Expected behavior:
        - Query includes both username.eq and email.eq conditions
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.select.return_value.or_.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[test_user_data])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        supabase_user_lookup.func("test@example.com")

        # Assert - verify OR condition is used
        mock_table.select.assert_called_with("*")
        mock_table.select.return_value.or_.assert_called_once()


# =============================================================================
# Test: supabase_session_create
# =============================================================================

class TestSupabaseSessionCreate:
    """Test session creation tool."""

    @patch('one_for_all.tools.supabase_session_create.supabase')
    @patch('one_for_all.tools.supabase_session_create.uuid4')
    def test_session_create_success(self, mock_uuid, mock_supabase):
        """
        Test successful session creation.

        Expected behavior:
        - Generates UUID for session token
        - Sets 24-hour expiry
        - Returns SESSION_CREATED::<token> format
        """
        # Arrange
        mock_uuid.return_value = "TEST-UUID-12345"
        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[{"id": "session-1"}])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_session_create.func("TEST-USER-001")

        # Assert
        assert result.startswith("SESSION_CREATED::")
        assert "TEST-UUID-12345" in result
        mock_supabase.table.assert_called_with("user_sessions")

    @patch('one_for_all.tools.supabase_session_create.supabase')
    def test_session_create_inserts_correct_data(self, mock_supabase):
        """
        Test that session creation inserts correct fields.

        Expected behavior:
        - Insert includes user_id, session_token, expires_at
        - expires_at is ~24 hours from now
        - token_version is initialized to 1
        - last_activity_at is set
        """
        # Arrange
        mock_table = MagicMock()
        inserted_data = None

        def capture_insert(data):
            nonlocal inserted_data
            inserted_data = data
            return mock_table

        mock_table.insert = capture_insert
        mock_table.execute = AsyncMock(
            return_value=MagicMock(data=[{"id": "session-1"}])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        supabase_session_create.func("TEST-USER-001")

        # Assert
        assert inserted_data is not None
        assert inserted_data["user_id"] == "TEST-USER-001"
        assert "session_token" in inserted_data
        assert "expires_at" in inserted_data
        assert inserted_data["token_version"] == 1
        assert "last_activity_at" in inserted_data

        # Verify expiry is approximately 24 hours from now (timezone-aware)
        # Handle both timezone-aware and naive datetime strings
        expires_at_str = inserted_data["expires_at"]
        if expires_at_str.endswith('+00:00') or expires_at_str.endswith('Z'):
            expires_at = datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
        else:
            expires_at = datetime.fromisoformat(expires_at_str).replace(tzinfo=timezone.utc)

        expected_expiry = datetime.now(timezone.utc) + timedelta(hours=24)
        time_diff = abs((expires_at - expected_expiry).total_seconds())
        assert time_diff < 60, "Expiry should be ~24 hours from now"

    @patch('one_for_all.tools.supabase_session_create.supabase')
    def test_session_create_unique_tokens(self, mock_supabase):
        """
        Test that multiple session creations generate unique tokens.

        Expected behavior:
        - Each call generates a different session token
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[{"id": "session-1"}])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result1 = supabase_session_create.func("TEST-USER-001")
        result2 = supabase_session_create.func("TEST-USER-001")

        # Assert
        token1 = result1.split("::")[-1]
        token2 = result2.split("::")[-1]
        assert token1 != token2, "Session tokens should be unique"


# =============================================================================
# Test: supabase_session_extend
# =============================================================================

class TestSupabaseSessionExtend:
    """Test session extension tool."""

    @patch('one_for_all.tools.supabase_session_extend.supabase')
    def test_session_extend_success(self, mock_supabase):
        """
        Test successful session extension.

        Expected behavior:
        - Updates expires_at for matching session_token
        - Returns "SESSION_EXTENDED"
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.update.return_value.eq.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[{"id": "session-1"}])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_session_extend.func("TEST-TOKEN-ABC123")

        # Assert
        assert result == "SESSION_EXTENDED"
        mock_supabase.table.assert_called_with("user_sessions")

    @patch('one_for_all.tools.supabase_session_extend.supabase')
    def test_session_extend_updates_correct_field(self, mock_supabase):
        """
        Test that session extension updates expires_at field.

        Expected behavior:
        - Update call includes expires_at with new timestamp
        - New expiry is ~24 hours from now
        """
        # Arrange
        mock_table = MagicMock()
        update_data = None

        def capture_update(data):
            nonlocal update_data
            update_data = data
            return mock_table

        mock_table.update = capture_update
        mock_table.eq.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[{"id": "session-1"}])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        supabase_session_extend.func("TEST-TOKEN-ABC123")

        # Assert
        assert update_data is not None
        assert "expires_at" in update_data

        new_expiry = datetime.fromisoformat(update_data["expires_at"])
        expected_expiry = datetime.utcnow() + timedelta(hours=24)
        time_diff = abs((new_expiry - expected_expiry).total_seconds())
        assert time_diff < 60, "New expiry should be ~24 hours from now"

    @patch('one_for_all.tools.supabase_session_extend.supabase')
    def test_session_extend_with_nonexistent_token(self, mock_supabase):
        """
        Test session extension with non-existent token.

        Expected behavior:
        - Still returns "SESSION_EXTENDED" (no error check in implementation)
        - Update query is executed
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.update.return_value.eq.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[])  # No matching records
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_session_extend.func("NONEXISTENT-TOKEN")

        # Assert
        assert result == "SESSION_EXTENDED"


# =============================================================================
# Test: supabase_session_lookup
# =============================================================================

class TestSupabaseSessionLookup:
    """Test session lookup/validation tool."""

    @patch('one_for_all.tools.supabase_session_lookup.supabase')
    def test_session_lookup_valid_session(self, mock_supabase):
        """
        Test lookup of valid, non-expired session.

        Expected behavior:
        - Returns "VALID_SESSION::<token>" for active session
        """
        # Arrange
        future_expiry = (datetime.utcnow() + timedelta(hours=12)).isoformat()
        mock_session = {
            "session_token": "TEST-TOKEN-ABC123",
            "expires_at": future_expiry
        }

        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.order.return_value.limit.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[mock_session])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_session_lookup.func("TEST-USER-001")

        # Assert
        assert result.startswith("VALID_SESSION::")
        assert "TEST-TOKEN-ABC123" in result

    @patch('one_for_all.tools.supabase_session_lookup.supabase')
    def test_session_lookup_expired_session(self, mock_supabase):
        """
        Test lookup of expired session.

        Expected behavior:
        - Returns "EXPIRED_SESSION" for session past expiry
        """
        # Arrange
        past_expiry = (datetime.utcnow() - timedelta(hours=1)).isoformat()
        mock_session = {
            "session_token": "TEST-TOKEN-EXPIRED",
            "expires_at": past_expiry
        }

        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.order.return_value.limit.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[mock_session])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_session_lookup.func("TEST-USER-001")

        # Assert
        assert result == "EXPIRED_SESSION"

    @patch('one_for_all.tools.supabase_session_lookup.supabase')
    def test_session_lookup_no_session(self, mock_supabase):
        """
        Test lookup when no session exists for user.

        Expected behavior:
        - Returns "NO_SESSION" when user has no sessions
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.order.return_value.limit.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_session_lookup.func("TEST-USER-NOSESSION")

        # Assert
        assert result == "NO_SESSION"

    @patch('one_for_all.tools.supabase_session_lookup.supabase')
    def test_session_lookup_orders_by_expiry_desc(self, mock_supabase):
        """
        Test that session lookup orders by expires_at descending.

        Expected behavior:
        - Gets most recent session first
        - Uses desc=True for ordering
        """
        # Arrange
        future_expiry = (datetime.utcnow() + timedelta(hours=12)).isoformat()
        mock_session = {
            "session_token": "TEST-TOKEN-LATEST",
            "expires_at": future_expiry
        }

        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.order.return_value.limit.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[mock_session])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        supabase_session_lookup.func("TEST-USER-001")

        # Assert
        mock_table.select.return_value.eq.return_value.order.assert_called_once()

    @patch('one_for_all.tools.supabase_session_lookup.supabase')
    def test_session_lookup_just_expired(self, mock_supabase):
        """
        Test lookup of session that just expired (edge case).

        Expected behavior:
        - Session expired 1 second ago is still "EXPIRED_SESSION"
        """
        # Arrange
        just_expired = (datetime.utcnow() - timedelta(seconds=1)).isoformat()
        mock_session = {
            "session_token": "TEST-TOKEN-JUSTEXPIRED",
            "expires_at": just_expired
        }

        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.order.return_value.limit.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[mock_session])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_session_lookup.func("TEST-USER-001")

        # Assert
        assert result == "EXPIRED_SESSION"

    @patch('one_for_all.tools.supabase_session_lookup.supabase')
    def test_session_lookup_about_to_expire(self, mock_supabase):
        """
        Test lookup of session about to expire in 1 second.

        Expected behavior:
        - Session expiring in 1 second is still "VALID_SESSION"
        """
        # Arrange
        about_to_expire = (datetime.utcnow() + timedelta(seconds=10)).isoformat()
        mock_session = {
            "session_token": "TEST-TOKEN-ALMOSTEXPIRED",
            "expires_at": about_to_expire
        }

        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.order.return_value.limit.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[mock_session])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_session_lookup.func("TEST-USER-001")

        # Assert
        assert result.startswith("VALID_SESSION::")


# =============================================================================
# Test: supabase_application_store
# =============================================================================

class TestSupabaseApplicationStore:
    """Test application storage tool."""

    @patch('one_for_all.tools.supabase_application_store.supabase')
    def test_application_store_success(self, mock_supabase, test_application_data):
        """
        Test successful application storage.

        Expected behavior:
        - Calls supabase.table("applications").insert()
        - Returns string representation of stored data
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[test_application_data])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_application_store.func(test_application_data)

        # Assert
        assert result is not None
        assert "TEST-APP-001" in result or "TEST-CONF-123" in result
        mock_supabase.table.assert_called_with("applications")

    @patch('one_for_all.tools.supabase_application_store.supabase')
    def test_application_store_empty_result(self, mock_supabase, test_application_data):
        """
        Test application storage with empty result.

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
        result = supabase_application_store.func(test_application_data)

        # Assert
        assert result == "[]"

    @patch('one_for_all.tools.supabase_application_store.supabase')
    def test_application_store_with_multiple_courses(self, mock_supabase):
        """
        Test application storage for multi-course application.

        Expected behavior:
        - Accepts application with multiple programme choices
        - Successfully inserts to database
        """
        # Arrange
        multi_course_app = {
            "id": "TEST-APP-MULTI",
            "user_id": "TEST-USER-001",
            "confirmation_number": "TEST-CONF-MULTI",
            "institution": "University of Pretoria",
            "programmes": [
                "BSc Computer Science",
                "BSc Information Technology",
                "BEng Software Engineering"
            ],
            "status": "pending"
        }

        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[multi_course_app])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_application_store.func(multi_course_app)

        # Assert
        assert "TEST-APP-MULTI" in result or "TEST-CONF-MULTI" in result

    @patch('one_for_all.tools.supabase_application_store.supabase')
    def test_application_store_with_documents(self, mock_supabase):
        """
        Test application storage with attached document references.

        Expected behavior:
        - Accepts application with document references
        - Successfully inserts to database
        """
        # Arrange
        app_with_docs = {
            "id": "TEST-APP-DOCS",
            "user_id": "TEST-USER-001",
            "confirmation_number": "TEST-CONF-DOCS",
            "institution": "University of Cape Town",
            "programme": "BSc Medicine",
            "status": "pending",
            "documents": [
                {"type": "id_document", "url": "https://storage.example.com/id.pdf"},
                {"type": "matric_certificate", "url": "https://storage.example.com/matric.pdf"}
            ]
        }

        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[app_with_docs])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_application_store.func(app_with_docs)

        # Assert
        assert "TEST-APP-DOCS" in result or "TEST-CONF-DOCS" in result

    @patch('one_for_all.tools.supabase_application_store.supabase')
    def test_application_store_exception_handling(self, mock_supabase, test_application_data):
        """
        Test application storage exception handling.

        Expected behavior:
        - Propagates exception when database operation fails
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            side_effect=Exception("Database write error")
        )
        mock_supabase.table.return_value = mock_table

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            supabase_application_store.func(test_application_data)

        assert "Database write error" in str(exc_info.value)


# =============================================================================
# Integration-Style Tests
# =============================================================================

class TestSupabaseToolsWorkflow:
    """Integration-style tests for complete tool workflows."""

    @patch('one_for_all.tools.supabase_user_store.supabase')
    @patch('one_for_all.tools.supabase_session_create.supabase')
    def test_user_registration_workflow(
        self,
        mock_session_supabase,
        mock_user_supabase,
        test_user_data
    ):
        """
        Test complete user registration workflow: store user -> create session.

        Expected behavior:
        - User is stored successfully
        - Session is created for the new user
        - Both operations complete without errors
        """
        # Step 1: Store user
        mock_user_table = MagicMock()
        mock_user_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[test_user_data])
        )
        mock_user_supabase.table.return_value = mock_user_table

        user_result = supabase_user_store.func(test_user_data)
        assert "TEST-USER-001" in user_result or "test@example.com" in user_result

        # Step 2: Create session
        mock_session_table = MagicMock()
        mock_session_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[{"id": "session-1"}])
        )
        mock_session_supabase.table.return_value = mock_session_table

        session_result = supabase_session_create.func("TEST-USER-001")
        assert session_result.startswith("SESSION_CREATED::")

    @patch('one_for_all.tools.supabase_session_create.supabase')
    @patch('one_for_all.tools.supabase_session_lookup.supabase')
    @patch('one_for_all.tools.supabase_session_extend.supabase')
    def test_session_lifecycle_workflow(
        self,
        mock_extend_supabase,
        mock_lookup_supabase,
        mock_create_supabase
    ):
        """
        Test complete session lifecycle: create -> lookup -> extend.

        Expected behavior:
        - Session is created successfully
        - Session can be looked up and is valid
        - Session can be extended
        """
        # Step 1: Create session
        mock_create_table = MagicMock()
        mock_create_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[{"id": "session-1"}])
        )
        mock_create_supabase.table.return_value = mock_create_table

        create_result = supabase_session_create.func("TEST-USER-001")
        assert create_result.startswith("SESSION_CREATED::")
        session_token = create_result.split("::")[-1]

        # Step 2: Lookup session
        future_expiry = (datetime.utcnow() + timedelta(hours=12)).isoformat()
        mock_lookup_table = MagicMock()
        mock_lookup_table.select.return_value.eq.return_value.order.return_value.limit.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[{
                "session_token": session_token,
                "expires_at": future_expiry
            }])
        )
        mock_lookup_supabase.table.return_value = mock_lookup_table

        lookup_result = supabase_session_lookup.func("TEST-USER-001")
        assert lookup_result.startswith("VALID_SESSION::")

        # Step 3: Extend session
        mock_extend_table = MagicMock()
        mock_extend_table.update.return_value.eq.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[{"id": "session-1"}])
        )
        mock_extend_supabase.table.return_value = mock_extend_table

        extend_result = supabase_session_extend.func(session_token)
        assert extend_result == "SESSION_EXTENDED"

    @patch('one_for_all.tools.supabase_user_store.supabase')
    @patch('one_for_all.tools.supabase_application_store.supabase')
    def test_user_application_workflow(
        self,
        mock_app_supabase,
        mock_user_supabase,
        test_user_data,
        test_application_data
    ):
        """
        Test complete user application workflow: store user -> store application.

        Expected behavior:
        - User is stored successfully
        - Application linked to user is stored successfully
        """
        # Step 1: Store user
        mock_user_table = MagicMock()
        mock_user_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[test_user_data])
        )
        mock_user_supabase.table.return_value = mock_user_table

        user_result = supabase_user_store.func(test_user_data)
        assert user_result is not None

        # Step 2: Store application
        mock_app_table = MagicMock()
        mock_app_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[test_application_data])
        )
        mock_app_supabase.table.return_value = mock_app_table

        app_result = supabase_application_store.func(test_application_data)
        assert "TEST-APP-001" in app_result or "TEST-CONF-123" in app_result


# =============================================================================
# Edge Cases and Error Handling
# =============================================================================

class TestSupabaseToolsEdgeCases:
    """Test edge cases and boundary conditions."""

    @patch('one_for_all.tools.supabase_user_store.supabase')
    def test_user_store_with_special_characters(self, mock_supabase):
        """
        Test user storage with special characters in fields.

        Expected behavior:
        - Handles special characters in names, addresses, etc.
        """
        # Arrange
        special_user = {
            "id": "TEST-SPECIAL-001",
            "full_name": "O'Brien-Smith, Mary-Jane",
            "email": "test+special@example.com",
            "address": "123 Main St, Apt #5 & Suite 10"
        }

        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[special_user])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_user_store.func(special_user)

        # Assert
        assert result is not None
        assert "TEST-SPECIAL-001" in result

    @patch('one_for_all.tools.supabase_user_lookup.supabase')
    def test_user_lookup_with_email_special_chars(self, mock_supabase):
        """
        Test user lookup with special characters in email.

        Expected behavior:
        - Handles + and . characters in email addresses
        """
        # Arrange
        special_email = "test+tag@example.co.za"
        mock_table = MagicMock()
        mock_table.select.return_value.or_.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[{"email": special_email}])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_user_lookup.func(special_email)

        # Assert
        assert "USER_NOT_FOUND" not in result

    @patch('one_for_all.tools.supabase_application_store.supabase')
    def test_application_store_large_payload(self, mock_supabase):
        """
        Test application storage with large data payload.

        Expected behavior:
        - Handles applications with extensive data
        """
        # Arrange
        large_app = {
            "id": "TEST-LARGE-001",
            "user_id": "TEST-USER-001",
            "confirmation_number": "TEST-CONF-LARGE",
            "institution": "University of Pretoria",
            "programmes": [f"Programme {i}" for i in range(10)],
            "matric_results": {
                f"Subject {i}": {"mark": 70 + i, "level": "HL"}
                for i in range(7)
            },
            "personal_statement": "A" * 5000,  # 5KB text
            "status": "pending"
        }

        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[large_app])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_application_store.func(large_app)

        # Assert
        assert "TEST-LARGE-001" in result or "TEST-CONF-LARGE" in result

    @patch('one_for_all.tools.supabase_session_lookup.supabase')
    def test_session_lookup_with_timezone_aware_datetime_raises_error(self, mock_supabase):
        """
        Test session lookup with timezone-aware datetime raises TypeError.

        KNOWN ISSUE: The current implementation cannot handle timezone-aware
        datetime strings (ISO format with 'Z' suffix). This test documents
        the current behavior - a TypeError is raised when comparing
        timezone-aware and timezone-naive datetimes.

        TODO: Fix supabase_session_lookup.py to handle timezone-aware datetimes
        by stripping the 'Z' suffix or using timezone-aware comparison.

        Expected behavior (current - BUG):
        - Raises TypeError when expires_at has 'Z' suffix
        """
        # Arrange - ISO format with Z suffix (common from Supabase/PostgreSQL)
        future_expiry = (datetime.utcnow() + timedelta(hours=12)).isoformat() + "Z"
        mock_session = {
            "session_token": "TEST-TOKEN-TZ",
            "expires_at": future_expiry
        }

        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.order.return_value.limit.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[mock_session])
        )
        mock_supabase.table.return_value = mock_table

        # Act & Assert - current behavior raises TypeError
        # This test documents the bug - when fixed, update to expect proper handling
        with pytest.raises(TypeError) as exc_info:
            supabase_session_lookup.func("TEST-USER-001")

        assert "can't compare offset-naive and offset-aware datetimes" in str(exc_info.value)

    @patch('one_for_all.tools.supabase_session_lookup.supabase')
    def test_session_lookup_with_naive_datetime_works(self, mock_supabase):
        """
        Test session lookup works correctly with timezone-naive datetime.

        Expected behavior:
        - Successfully processes datetime without timezone suffix
        - Returns VALID_SESSION for non-expired session
        """
        # Arrange - ISO format without Z suffix (timezone-naive)
        future_expiry = (datetime.utcnow() + timedelta(hours=12)).isoformat()
        mock_session = {
            "session_token": "TEST-TOKEN-NAIVE",
            "expires_at": future_expiry
        }

        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.order.return_value.limit.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[mock_session])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_session_lookup.func("TEST-USER-001")

        # Assert
        assert result.startswith("VALID_SESSION::")
        assert "TEST-TOKEN-NAIVE" in result


# =============================================================================
# Coverage Enhancement Tests - Session Create
# =============================================================================

class TestSupabaseSessionCreateCoverage:
    """Additional tests for supabase_session_create coverage."""

    @patch('one_for_all.tools.supabase_session_create.supabase')
    def test_session_create_with_ip_address(self, mock_supabase):
        """
        Test session creation with IP address for hijacking detection (H4).

        Expected behavior:
        - ip_address is stored in both ip_address and created_ip_address fields
        """
        # Arrange
        mock_table = MagicMock()
        inserted_data = None

        def capture_insert(data):
            nonlocal inserted_data
            inserted_data = data
            return mock_table

        mock_table.insert = capture_insert
        mock_table.execute = AsyncMock(
            return_value=MagicMock(data=[{"id": "session-1"}])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_session_create.func(
            "TEST-USER-001",
            ip_address="192.168.1.100"
        )

        # Assert
        assert result.startswith("SESSION_CREATED::")
        assert inserted_data["ip_address"] == "192.168.1.100"
        assert inserted_data["created_ip_address"] == "192.168.1.100"

    @patch('one_for_all.tools.supabase_session_create.supabase')
    def test_session_create_with_user_agent(self, mock_supabase):
        """
        Test session creation with user agent for fingerprinting (H4).

        Expected behavior:
        - user_agent is stored in session data
        """
        # Arrange
        mock_table = MagicMock()
        inserted_data = None

        def capture_insert(data):
            nonlocal inserted_data
            inserted_data = data
            return mock_table

        mock_table.insert = capture_insert
        mock_table.execute = AsyncMock(
            return_value=MagicMock(data=[{"id": "session-1"}])
        )
        mock_supabase.table.return_value = mock_table

        user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0"

        # Act
        result = supabase_session_create.func(
            "TEST-USER-001",
            user_agent=user_agent
        )

        # Assert
        assert result.startswith("SESSION_CREATED::")
        assert inserted_data["user_agent"] == user_agent

    @patch('one_for_all.tools.supabase_session_create.supabase')
    def test_session_create_with_long_user_agent_truncates(self, mock_supabase):
        """
        Test session creation truncates user agent > 512 chars.

        Expected behavior:
        - user_agent longer than 512 chars is truncated to 512
        """
        # Arrange
        mock_table = MagicMock()
        inserted_data = None

        def capture_insert(data):
            nonlocal inserted_data
            inserted_data = data
            return mock_table

        mock_table.insert = capture_insert
        mock_table.execute = AsyncMock(
            return_value=MagicMock(data=[{"id": "session-1"}])
        )
        mock_supabase.table.return_value = mock_table

        # Create a user agent string > 512 characters
        long_user_agent = "A" * 600

        # Act
        result = supabase_session_create.func(
            "TEST-USER-001",
            user_agent=long_user_agent
        )

        # Assert
        assert result.startswith("SESSION_CREATED::")
        assert len(inserted_data["user_agent"]) == 512
        assert inserted_data["user_agent"] == "A" * 512

    @patch('one_for_all.tools.supabase_session_create.supabase')
    def test_session_create_with_exactly_512_char_user_agent(self, mock_supabase):
        """
        Test session creation with exactly 512 char user agent (edge case).

        Expected behavior:
        - user_agent of exactly 512 chars is stored as-is
        """
        # Arrange
        mock_table = MagicMock()
        inserted_data = None

        def capture_insert(data):
            nonlocal inserted_data
            inserted_data = data
            return mock_table

        mock_table.insert = capture_insert
        mock_table.execute = AsyncMock(
            return_value=MagicMock(data=[{"id": "session-1"}])
        )
        mock_supabase.table.return_value = mock_table

        # Create a user agent string of exactly 512 characters
        exact_user_agent = "B" * 512

        # Act
        result = supabase_session_create.func(
            "TEST-USER-001",
            user_agent=exact_user_agent
        )

        # Assert
        assert result.startswith("SESSION_CREATED::")
        assert len(inserted_data["user_agent"]) == 512
        assert inserted_data["user_agent"] == exact_user_agent

    @patch('one_for_all.tools.supabase_session_create.supabase')
    def test_session_create_with_all_optional_params(self, mock_supabase):
        """
        Test session creation with all optional parameters.

        Expected behavior:
        - Both ip_address and user_agent are stored
        """
        # Arrange
        mock_table = MagicMock()
        inserted_data = None

        def capture_insert(data):
            nonlocal inserted_data
            inserted_data = data
            return mock_table

        mock_table.insert = capture_insert
        mock_table.execute = AsyncMock(
            return_value=MagicMock(data=[{"id": "session-1"}])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_session_create.func(
            "TEST-USER-001",
            ip_address="10.0.0.1",
            user_agent="TestAgent/1.0"
        )

        # Assert
        assert result.startswith("SESSION_CREATED::")
        assert inserted_data["ip_address"] == "10.0.0.1"
        assert inserted_data["created_ip_address"] == "10.0.0.1"
        assert inserted_data["user_agent"] == "TestAgent/1.0"

    @patch('one_for_all.tools.supabase_session_create.supabase')
    def test_session_create_exception_handling(self, mock_supabase):
        """
        Test session creation exception handling.

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
            supabase_session_create.func("TEST-USER-001")

        assert "Database connection error" in str(exc_info.value)

    @patch('one_for_all.tools.supabase_session_create.supabase')
    def test_session_create_without_optional_params(self, mock_supabase):
        """
        Test session creation without optional parameters (base case).

        Expected behavior:
        - Session created without ip_address or user_agent fields
        """
        # Arrange
        mock_table = MagicMock()
        inserted_data = None

        def capture_insert(data):
            nonlocal inserted_data
            inserted_data = data
            return mock_table

        mock_table.insert = capture_insert
        mock_table.execute = AsyncMock(
            return_value=MagicMock(data=[{"id": "session-1"}])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_session_create.func("TEST-USER-001")

        # Assert
        assert result.startswith("SESSION_CREATED::")
        assert "ip_address" not in inserted_data
        assert "user_agent" not in inserted_data


# =============================================================================
# Coverage Enhancement Tests - Session Lookup
# =============================================================================

class TestSupabaseSessionLookupCoverage:
    """Additional tests for supabase_session_lookup coverage."""

    @patch('one_for_all.tools.supabase_session_lookup.supabase')
    def test_session_lookup_exception_handling(self, mock_supabase):
        """
        Test session lookup exception handling.

        Expected behavior:
        - Propagates exception when database operation fails
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.order.return_value.limit.return_value.execute = AsyncMock(
            side_effect=Exception("Database query error")
        )
        mock_supabase.table.return_value = mock_table

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            supabase_session_lookup.func("TEST-USER-001")

        assert "Database query error" in str(exc_info.value)

    @patch('one_for_all.tools.supabase_session_lookup.supabase')
    def test_session_lookup_with_none_data(self, mock_supabase):
        """
        Test session lookup when result.data is None (not empty list).

        Expected behavior:
        - Returns "NO_SESSION" when data is None
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.order.return_value.limit.return_value.execute = AsyncMock(
            return_value=MagicMock(data=None)
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_session_lookup.func("TEST-USER-001")

        # Assert
        assert result == "NO_SESSION"

    @patch('one_for_all.tools.supabase_session_lookup.supabase')
    def test_session_lookup_with_exactly_now_expiry(self, mock_supabase):
        """
        Test session lookup with expiry exactly at current time.

        Expected behavior:
        - Session expired if expires_at <= now (expired = not >)
        """
        # Arrange - expires_at is exactly now (should be expired)
        now = datetime.utcnow()
        mock_session = {
            "session_token": "TEST-TOKEN-EXACT-NOW",
            "expires_at": now.isoformat()
        }

        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.order.return_value.limit.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[mock_session])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_session_lookup.func("TEST-USER-001")

        # Assert - equal to now is considered expired (not strictly greater)
        assert result == "EXPIRED_SESSION"

    @patch('one_for_all.tools.supabase_session_lookup.supabase')
    def test_session_lookup_with_far_future_expiry(self, mock_supabase):
        """
        Test session lookup with expiry far in the future.

        Expected behavior:
        - Valid session even with very long expiry
        """
        # Arrange - expires_at is 1 year from now
        far_future = (datetime.utcnow() + timedelta(days=365)).isoformat()
        mock_session = {
            "session_token": "TEST-TOKEN-FAR-FUTURE",
            "expires_at": far_future
        }

        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.order.return_value.limit.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[mock_session])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_session_lookup.func("TEST-USER-001")

        # Assert
        assert result.startswith("VALID_SESSION::")
        assert "TEST-TOKEN-FAR-FUTURE" in result


# =============================================================================
# Coverage Enhancement Tests - Session Extend
# =============================================================================

class TestSupabaseSessionExtendCoverage:
    """Additional tests for supabase_session_extend coverage."""

    @patch('one_for_all.tools.supabase_session_extend.supabase')
    def test_session_extend_exception_handling(self, mock_supabase):
        """
        Test session extend exception handling.

        Expected behavior:
        - Propagates exception when database operation fails
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.update.return_value.eq.return_value.execute = AsyncMock(
            side_effect=Exception("Database update error")
        )
        mock_supabase.table.return_value = mock_table

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            supabase_session_extend.func("TEST-TOKEN-123")

        assert "Database update error" in str(exc_info.value)

    @patch('one_for_all.tools.supabase_session_extend.supabase')
    def test_session_extend_with_empty_token(self, mock_supabase):
        """
        Test session extend with empty token string.

        Expected behavior:
        - Still attempts update (no input validation in current impl)
        - Returns SESSION_EXTENDED
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.update.return_value.eq.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_session_extend.func("")

        # Assert
        assert result == "SESSION_EXTENDED"

    @patch('one_for_all.tools.supabase_session_extend.supabase')
    def test_session_extend_verifies_new_expiry_time(self, mock_supabase):
        """
        Test that session extend sets correct new expiry time.

        Expected behavior:
        - New expiry is ~24 hours from now
        """
        # Arrange
        mock_table = MagicMock()
        update_data = None

        def capture_update(data):
            nonlocal update_data
            update_data = data
            return mock_table

        mock_table.update = capture_update
        mock_table.eq.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[{"id": "session-1"}])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        supabase_session_extend.func("TEST-TOKEN-VERIFY")

        # Assert
        assert update_data is not None
        assert "expires_at" in update_data

        # Parse the new expiry and verify it's approximately 24 hours from now
        new_expiry_str = update_data["expires_at"]
        new_expiry = datetime.fromisoformat(new_expiry_str)
        expected_expiry = datetime.utcnow() + timedelta(hours=24)
        time_diff = abs((new_expiry - expected_expiry).total_seconds())
        assert time_diff < 60, "New expiry should be ~24 hours from now"


# =============================================================================
# Coverage Enhancement Tests - User Store
# =============================================================================

class TestSupabaseUserStoreCoverage:
    """Additional tests for supabase_user_store coverage."""

    @patch('one_for_all.tools.supabase_user_store.supabase')
    def test_user_store_with_none_data_in_result(self, mock_supabase):
        """
        Test user store when result.data is None.

        Expected behavior:
        - Returns string representation of None
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=None)
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_user_store.func({"email": "test@example.com"})

        # Assert
        assert result == "None"

    @patch('one_for_all.tools.supabase_user_store.supabase')
    def test_user_store_with_empty_dict(self, mock_supabase):
        """
        Test user store with empty dictionary.

        Expected behavior:
        - Attempts insert with empty dict
        - Returns result data as string
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[{"id": "TEST-EMPTY-001"}])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_user_store.func({})

        # Assert
        assert "TEST-EMPTY-001" in result

    @patch('one_for_all.tools.supabase_user_store.supabase')
    def test_user_store_with_unicode_characters(self, mock_supabase):
        """
        Test user store with unicode characters.

        Expected behavior:
        - Handles unicode names correctly
        """
        # Arrange
        unicode_user = {
            "id": "TEST-UNICODE-001",
            "full_name": "Thabo Mbeki",  # Nguni name
            "email": "test+unicode@example.com"
        }
        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[unicode_user])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_user_store.func(unicode_user)

        # Assert
        assert "TEST-UNICODE-001" in result

    @patch('one_for_all.tools.supabase_user_store.supabase')
    def test_user_store_with_nested_dict(self, mock_supabase):
        """
        Test user store with nested dictionary (e.g., metadata).

        Expected behavior:
        - Handles nested structures correctly
        """
        # Arrange
        nested_user = {
            "id": "TEST-NESTED-001",
            "email": "nested@example.com",
            "metadata": {
                "preferences": {"language": "en", "theme": "dark"},
                "flags": ["verified", "premium"]
            }
        }
        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[nested_user])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_user_store.func(nested_user)

        # Assert
        assert "TEST-NESTED-001" in result


# =============================================================================
# Coverage Enhancement Tests - User Lookup
# =============================================================================

class TestSupabaseUserLookupCoverage:
    """Additional tests for supabase_user_lookup coverage."""

    @patch('one_for_all.tools.supabase_user_lookup.supabase')
    def test_user_lookup_exception_handling(self, mock_supabase):
        """
        Test user lookup exception handling.

        Expected behavior:
        - Propagates exception when database operation fails
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.select.return_value.or_.return_value.execute = AsyncMock(
            side_effect=Exception("Database connection lost")
        )
        mock_supabase.table.return_value = mock_table

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            supabase_user_lookup.func("test@example.com")

        assert "Database connection lost" in str(exc_info.value)

    @patch('one_for_all.tools.supabase_user_lookup.supabase')
    def test_user_lookup_returns_first_match_only(self, mock_supabase):
        """
        Test user lookup returns only first match when multiple exist.

        Expected behavior:
        - Returns str(result.data[0]) - only first match
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.select.return_value.or_.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[
                {"id": "TEST-FIRST-001", "email": "test@example.com"},
                {"id": "TEST-SECOND-002", "email": "test@example.com"}  # Duplicate
            ])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_user_lookup.func("test@example.com")

        # Assert - should only contain first match
        assert "TEST-FIRST-001" in result
        assert "TEST-SECOND-002" not in result

    @patch('one_for_all.tools.supabase_user_lookup.supabase')
    def test_user_lookup_with_phone_number_format(self, mock_supabase):
        """
        Test user lookup with phone number (South African format).

        Expected behavior:
        - Handles +27 phone numbers in search
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.select.return_value.or_.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[{"id": "TEST-PHONE-001", "phone": "+27821234567"}])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_user_lookup.func("+27821234567")

        # Assert
        assert "TEST-PHONE-001" in result

    @patch('one_for_all.tools.supabase_user_lookup.supabase')
    def test_user_lookup_with_empty_string(self, mock_supabase):
        """
        Test user lookup with empty string.

        Expected behavior:
        - Returns USER_NOT_FOUND for empty query
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.select.return_value.or_.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_user_lookup.func("")

        # Assert
        assert result == "USER_NOT_FOUND"


# =============================================================================
# Coverage Enhancement Tests - Application Store
# =============================================================================

class TestSupabaseApplicationStoreCoverage:
    """Additional tests for supabase_application_store coverage."""

    @patch('one_for_all.tools.supabase_application_store.supabase')
    def test_application_store_with_none_data_in_result(self, mock_supabase):
        """
        Test application store when result.data is None.

        Expected behavior:
        - Returns string representation of None
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=None)
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_application_store.func({"user_id": "TEST-USER-001"})

        # Assert
        assert result == "None"

    @patch('one_for_all.tools.supabase_application_store.supabase')
    def test_application_store_with_nsfas_data(self, mock_supabase):
        """
        Test application store with NSFAS application data.

        Expected behavior:
        - Handles NSFAS-specific fields correctly
        """
        # Arrange
        nsfas_app = {
            "id": "TEST-NSFAS-001",
            "user_id": "TEST-USER-001",
            "type": "nsfas",
            "household_income": "R150000",
            "sassa_recipient": True,
            "status": "pending"
        }
        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[nsfas_app])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_application_store.func(nsfas_app)

        # Assert
        assert "TEST-NSFAS-001" in result

    @patch('one_for_all.tools.supabase_application_store.supabase')
    def test_application_store_with_empty_dict(self, mock_supabase):
        """
        Test application store with empty dictionary.

        Expected behavior:
        - Attempts insert with empty dict
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[{"id": "TEST-EMPTY-APP-001"}])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_application_store.func({})

        # Assert
        assert "TEST-EMPTY-APP-001" in result

    @patch('one_for_all.tools.supabase_application_store.supabase')
    def test_application_store_with_matric_results(self, mock_supabase):
        """
        Test application store with matric results (complex nested data).

        Expected behavior:
        - Handles nested matric results correctly
        """
        # Arrange
        app_with_matric = {
            "id": "TEST-MATRIC-APP-001",
            "user_id": "TEST-USER-001",
            "matric_results": {
                "Mathematics": {"level": "HL", "mark": 80, "aps": 7},
                "English": {"level": "HL", "mark": 75, "aps": 6},
                "Physical Sciences": {"level": "HL", "mark": 78, "aps": 6}
            },
            "total_aps": 40
        }
        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[app_with_matric])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_application_store.func(app_with_matric)

        # Assert
        assert "TEST-MATRIC-APP-001" in result


# =============================================================================
# Decorator Tests - Audit Service Role Access
# =============================================================================

class TestAuditDecoratorBehavior:
    """Test audit decorator doesn't break tool functionality."""

    @patch('one_for_all.tools.supabase_user_store.supabase')
    def test_user_store_audit_decorator_passes_through(self, mock_supabase):
        """
        Test that audit decorator on user_store passes through correctly.

        Expected behavior:
        - Decorator doesn't interfere with function execution
        - Function still returns expected result
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[{"id": "TEST-AUDIT-001"}])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_user_store.func({"email": "audit@example.com"})

        # Assert
        assert "TEST-AUDIT-001" in result

    @patch('one_for_all.tools.supabase_user_lookup.supabase')
    def test_user_lookup_audit_decorator_passes_through(self, mock_supabase):
        """
        Test that audit decorator on user_lookup passes through correctly.
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.select.return_value.or_.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[{"id": "TEST-AUDIT-002", "email": "audit@example.com"}])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_user_lookup.func("audit@example.com")

        # Assert
        assert "TEST-AUDIT-002" in result

    @patch('one_for_all.tools.supabase_application_store.supabase')
    def test_application_store_audit_decorator_passes_through(self, mock_supabase):
        """
        Test that audit decorator on application_store passes through correctly.
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.insert.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[{"id": "TEST-AUDIT-APP-001"}])
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = supabase_application_store.func({"user_id": "TEST-USER"})

        # Assert
        assert "TEST-AUDIT-APP-001" in result
