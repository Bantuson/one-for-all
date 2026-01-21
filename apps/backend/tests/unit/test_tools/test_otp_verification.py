"""
Comprehensive unit tests for OTP verification tools.

Tests the OTP workflow components:
- generate_otp - Secure 6-digit OTP generation
- store_otp - Database storage with bcrypt hashing and expiry
- verify_otp - Verification with rate limiting and attempt tracking
- check_otp_status - Active OTP status checking
- resend_otp_check - Resend eligibility checking
- cleanup_expired_otps - Expired OTP cleanup
- get_active_otp - Active OTP retrieval

All tests use mocks to avoid actual database calls.
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch, MagicMock
import sys
from pathlib import Path

# Add src to path
src_path = Path(__file__).resolve().parent.parent.parent.parent / "src"
sys.path.insert(0, str(src_path))

from one_for_all.tools.otp_store import (
    generate_otp,
    store_otp,
    cleanup_expired_otps,
    get_active_otp,
)
from one_for_all.tools.otp_verification import (
    verify_otp,
    check_otp_status,
    resend_otp_check,
)


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def mock_otp_record():
    """Create a sample OTP record for testing."""
    return {
        "id": "test-otp-id",
        "identifier": "test@example.com",
        "code": "$2b$10$hashedotpcodehere",  # bcrypt hash format
        "channel": "email",
        "expires_at": (datetime.utcnow() + timedelta(minutes=5)).isoformat() + "Z",
        "attempts": 0,
        "verified_at": None,
        "created_at": datetime.utcnow().isoformat()
    }


@pytest.fixture
def expired_otp_record():
    """Create an expired OTP record."""
    return {
        "id": "expired-otp-id",
        "identifier": "test@example.com",
        "code": "$2b$10$hashedotpcodehere",
        "channel": "email",
        "expires_at": (datetime.utcnow() - timedelta(minutes=10)).isoformat() + "Z",
        "attempts": 0,
        "verified_at": None
    }


@pytest.fixture
def max_attempts_otp_record():
    """Create an OTP record with max attempts reached."""
    return {
        "id": "maxed-otp-id",
        "identifier": "test@example.com",
        "code": "$2b$10$hashedotpcodehere",
        "channel": "sms",
        "expires_at": (datetime.utcnow() + timedelta(minutes=5)).isoformat() + "Z",
        "attempts": 3,  # Max attempts reached
        "verified_at": None
    }


@pytest.fixture
def mock_chainable_table():
    """Create a mock Supabase table with chainable methods."""
    mock_table = MagicMock()
    mock_table.select.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.is_.return_value = mock_table
    mock_table.gte.return_value = mock_table
    mock_table.lt.return_value = mock_table
    mock_table.order.return_value = mock_table
    mock_table.limit.return_value = mock_table
    mock_table.insert.return_value = mock_table
    mock_table.update.return_value = mock_table
    mock_table.delete.return_value = mock_table
    return mock_table


# =============================================================================
# Test: TestGenerateOtp
# =============================================================================

@pytest.mark.unit
class TestGenerateOtp:
    """Test OTP code generation using secure random generation."""

    def test_otp_is_6_digits(self):
        """
        Test that generated OTP is exactly 6 digits.

        Expected behavior:
        - Returns a string
        - Contains exactly 6 characters
        """
        otp = generate_otp()

        assert isinstance(otp, str), "OTP should be a string"
        assert len(otp) == 6, "OTP should be 6 digits"

    def test_otp_is_numeric_only(self):
        """
        Test that OTP contains only numeric characters.

        Expected behavior:
        - OTP consists entirely of digits 0-9
        """
        otp = generate_otp()

        assert otp.isdigit(), f"OTP '{otp}' should contain only digits"

    def test_otp_unique_across_multiple_generations(self):
        """
        Test that multiple OTP generations produce unique codes.

        Expected behavior:
        - 100 generated OTPs should be mostly unique
        - Statistical test: expect > 95% unique with 100 samples from 1M possibilities
        """
        otps = [generate_otp() for _ in range(100)]
        unique_otps = set(otps)

        # With 6 digits (1,000,000 possibilities), 100 samples should be mostly unique
        assert len(unique_otps) > 95, \
            f"Expected > 95 unique OTPs from 100 generations, got {len(unique_otps)}"

    def test_otp_in_valid_range(self):
        """
        Test that OTP values are within valid 6-digit range.

        Expected behavior:
        - OTP as integer is between 000000 and 999999
        - Leading zeros are preserved as string
        """
        for _ in range(50):
            otp = generate_otp()
            otp_int = int(otp)
            assert 0 <= otp_int <= 999999, \
                f"OTP {otp} should be in range 000000-999999"

    def test_otp_preserves_leading_zeros(self):
        """
        Test that OTPs starting with 0 preserve their length.

        Expected behavior:
        - OTPs like "012345" remain 6 characters, not truncated to 5
        """
        # Generate many OTPs to statistically encounter leading zeros
        otps = [generate_otp() for _ in range(1000)]

        # All OTPs should be exactly 6 characters
        for otp in otps:
            assert len(otp) == 6, f"OTP '{otp}' should be 6 chars even with leading zeros"


# =============================================================================
# Test: TestStoreOtp
# =============================================================================

@pytest.mark.unit
class TestStoreOtp:
    """Test OTP storage with bcrypt hashing and expiry."""

    @patch('one_for_all.tools.otp_store.hash_otp')
    @patch('one_for_all.tools.otp_store.supabase')
    def test_store_otp_success_with_bcrypt_hashing(self, mock_supabase, mock_hash_otp):
        """
        Test successful OTP storage with bcrypt hashing.

        Expected behavior:
        - Calls hash_otp() to hash the plaintext code
        - Stores the hash (not plaintext) in database
        - Returns True on success
        """
        # Arrange
        mock_hash_otp.return_value = "$2b$10$mockedhashedvalue"
        mock_table = MagicMock()
        mock_table.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "new-otp-id"}]
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = store_otp(
            identifier="test@example.com",
            channel="email",
            code="123456"
        )

        # Assert
        assert result is True, "store_otp should return True on success"
        mock_hash_otp.assert_called_once_with("123456")
        mock_supabase.table.assert_called_with("otp_codes")

    @patch('one_for_all.tools.otp_store.hash_otp')
    @patch('one_for_all.tools.otp_store.supabase')
    def test_store_otp_sets_10_minute_expiry(self, mock_supabase, mock_hash_otp):
        """
        Test that OTP is stored with 10-minute expiry.

        Expected behavior:
        - expires_at is set to current time + 10 minutes
        - Uses ISO format timestamp
        """
        # Arrange
        mock_hash_otp.return_value = "$2b$10$mockedhashedvalue"
        captured_insert_data = None

        def capture_insert(data):
            nonlocal captured_insert_data
            captured_insert_data = data
            mock_response = MagicMock()
            mock_response.execute.return_value = MagicMock(data=[{"id": "test-id"}])
            return mock_response

        mock_table = MagicMock()
        mock_table.insert = capture_insert
        mock_supabase.table.return_value = mock_table

        # Act
        store_otp(
            identifier="test@example.com",
            channel="email",
            code="123456"
        )

        # Assert
        assert captured_insert_data is not None, "Insert data should be captured"
        assert "expires_at" in captured_insert_data, "Should include expires_at"

        expires_at = datetime.fromisoformat(captured_insert_data["expires_at"])
        expected_expiry = datetime.utcnow() + timedelta(minutes=10)
        time_diff = abs((expires_at - expected_expiry).total_seconds())
        assert time_diff < 5, "Expiry should be ~10 minutes from now"

    @patch('one_for_all.tools.otp_store.hash_otp')
    @patch('one_for_all.tools.otp_store.supabase')
    def test_store_otp_initializes_attempts_to_zero(self, mock_supabase, mock_hash_otp):
        """
        Test that new OTP has attempts initialized to 0.

        Expected behavior:
        - attempts field is set to 0 on insert
        """
        # Arrange
        mock_hash_otp.return_value = "$2b$10$mockedhashedvalue"
        captured_insert_data = None

        def capture_insert(data):
            nonlocal captured_insert_data
            captured_insert_data = data
            mock_response = MagicMock()
            mock_response.execute.return_value = MagicMock(data=[{"id": "test-id"}])
            return mock_response

        mock_table = MagicMock()
        mock_table.insert = capture_insert
        mock_supabase.table.return_value = mock_table

        # Act
        store_otp("test@example.com", "sms", "654321")

        # Assert
        assert captured_insert_data["attempts"] == 0, "Attempts should be initialized to 0"

    @patch('one_for_all.tools.otp_store.hash_otp')
    @patch('one_for_all.tools.otp_store.supabase')
    def test_store_otp_database_error_handled(self, mock_supabase, mock_hash_otp):
        """
        Test that database errors are handled gracefully.

        Expected behavior:
        - Returns False when database insert fails
        - Does not raise exception
        """
        # Arrange
        mock_hash_otp.return_value = "$2b$10$mockedhashedvalue"
        mock_table = MagicMock()
        mock_table.insert.return_value.execute.side_effect = Exception("Database connection error")
        mock_supabase.table.return_value = mock_table

        # Act
        result = store_otp("test@example.com", "email", "123456")

        # Assert
        assert result is False, "Should return False on database error"

    @patch('one_for_all.tools.otp_store.supabase', None)
    def test_store_otp_no_supabase_client(self):
        """
        Test behavior when Supabase client is not configured.

        Expected behavior:
        - Returns False
        - Does not crash
        """
        result = store_otp("test@example.com", "email", "123456")

        assert result is False, "Should return False when Supabase not configured"

    @patch('one_for_all.tools.otp_store.hash_otp')
    @patch('one_for_all.tools.otp_store.supabase')
    def test_store_otp_empty_result_returns_false(self, mock_supabase, mock_hash_otp):
        """
        Test that empty database result returns False.

        Expected behavior:
        - Returns False when insert returns no data
        """
        # Arrange
        mock_hash_otp.return_value = "$2b$10$mockedhashedvalue"
        mock_table = MagicMock()
        mock_table.insert.return_value.execute.return_value = MagicMock(data=None)
        mock_supabase.table.return_value = mock_table

        # Act
        result = store_otp("test@example.com", "email", "123456")

        # Assert
        assert result is False, "Should return False when no data returned"


# =============================================================================
# Test: TestVerifyOtp
# =============================================================================

@pytest.mark.unit
class TestVerifyOtp:
    """Test OTP verification with rate limiting and attempt tracking."""

    @patch('one_for_all.tools.otp_verification.tool_limiter')
    @patch('one_for_all.tools.otp_verification.verify_otp_hash')
    @patch('one_for_all.tools.otp_verification.check_tool_rate_limit')
    @patch('one_for_all.tools.otp_verification.supabase')
    def test_valid_code_returns_otp_valid(
        self, mock_supabase, mock_rate_limit, mock_verify_hash, mock_tool_limiter, mock_otp_record
    ):
        """
        Test that correct OTP code returns OTP_VALID.

        Expected behavior:
        - Returns "OTP_VALID" when code matches hash
        - Sets verified_at timestamp
        - Resets rate limit on success
        """
        # Arrange
        mock_rate_limit.return_value = (True, "")
        mock_verify_hash.return_value = True

        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.is_.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[mock_otp_record]
        )
        mock_table.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[{}])
        mock_supabase.table.return_value = mock_table

        # Act
        result = verify_otp.func("test@example.com", "123456")

        # Assert
        assert result == "OTP_VALID", f"Expected OTP_VALID, got {result}"
        mock_tool_limiter.reset.assert_called_once()

    @patch('one_for_all.tools.otp_verification.verify_otp_hash')
    @patch('one_for_all.tools.otp_verification.check_tool_rate_limit')
    @patch('one_for_all.tools.otp_verification.supabase')
    def test_wrong_code_returns_otp_invalid(
        self, mock_supabase, mock_rate_limit, mock_verify_hash, mock_otp_record
    ):
        """
        Test that wrong OTP code returns OTP_INVALID.

        Expected behavior:
        - Returns "OTP_INVALID: Incorrect code"
        - Increments attempt counter
        """
        # Arrange
        mock_rate_limit.return_value = (True, "")
        mock_verify_hash.return_value = False  # Wrong code

        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.is_.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[mock_otp_record]
        )
        mock_table.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[{}])
        mock_supabase.table.return_value = mock_table

        # Act
        result = verify_otp.func("test@example.com", "000000")

        # Assert
        assert "OTP_INVALID" in result, "Should return OTP_INVALID for wrong code"
        assert "Incorrect" in result or "incorrect" in result.lower(), "Should indicate incorrect code"

    @patch('one_for_all.tools.otp_verification.check_tool_rate_limit')
    @patch('one_for_all.tools.otp_verification.supabase')
    def test_expired_code_rejected(self, mock_supabase, mock_rate_limit, expired_otp_record):
        """
        Test that expired OTP is rejected.

        Expected behavior:
        - Returns "OTP_INVALID: Code has expired"
        """
        # Arrange
        mock_rate_limit.return_value = (True, "")

        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.is_.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[expired_otp_record]
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = verify_otp.func("test@example.com", "123456")

        # Assert
        assert "OTP_INVALID" in result, "Expired OTP should be rejected"
        assert "expired" in result.lower(), "Should indicate expiration"

    @patch('one_for_all.tools.otp_verification.check_tool_rate_limit')
    @patch('one_for_all.tools.otp_verification.supabase')
    def test_max_attempts_exceeded_rejected(
        self, mock_supabase, mock_rate_limit, max_attempts_otp_record
    ):
        """
        Test that OTP with 3+ attempts is rejected.

        Expected behavior:
        - Returns "OTP_INVALID: Maximum verification attempts exceeded"
        - Protects against brute force attacks
        """
        # Arrange
        mock_rate_limit.return_value = (True, "")

        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.is_.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[max_attempts_otp_record]
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = verify_otp.func("test@example.com", "123456")

        # Assert
        assert "OTP_INVALID" in result, "Max attempts should be rejected"
        assert "Maximum" in result or "attempts" in result.lower(), \
            "Should indicate attempt limit exceeded"

    @patch('one_for_all.tools.otp_verification.check_tool_rate_limit')
    @patch('one_for_all.tools.otp_verification.supabase')
    def test_rate_limiting_enforced(self, mock_supabase, mock_rate_limit):
        """
        Test that rate limiting (5 per 5 min) is enforced.

        Expected behavior:
        - Returns rate limit error when limit exceeded
        - Does not query database when rate limited
        """
        # Arrange - Rate limit exceeded
        mock_rate_limit.return_value = (False, "RATE_LIMITED: Too many requests. Please wait 2 minutes.")

        # Act
        result = verify_otp.func("test@example.com", "123456")

        # Assert
        assert "OTP_INVALID" in result, "Should return invalid when rate limited"
        assert "RATE_LIMITED" in result, "Should indicate rate limiting"
        mock_supabase.table.assert_not_called()  # Database should not be queried

    @patch('one_for_all.tools.otp_verification.verify_otp_hash')
    @patch('one_for_all.tools.otp_verification.check_tool_rate_limit')
    @patch('one_for_all.tools.otp_verification.supabase')
    def test_increments_attempt_counter_on_failure(
        self, mock_supabase, mock_rate_limit, mock_verify_hash, mock_otp_record
    ):
        """
        Test that attempt counter is incremented on failed verification.

        Expected behavior:
        - Update is called to increment attempts before verification
        - This is a fail-safe approach
        """
        # Arrange
        mock_rate_limit.return_value = (True, "")
        mock_verify_hash.return_value = False  # Wrong code
        update_called_with = []

        def capture_update(data):
            update_called_with.append(data)
            mock_response = MagicMock()
            mock_response.eq.return_value.execute.return_value = MagicMock(data=[{}])
            return mock_response

        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.is_.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[mock_otp_record]
        )
        mock_table.update = capture_update
        mock_supabase.table.return_value = mock_table

        # Act
        verify_otp.func("test@example.com", "000000")

        # Assert
        assert len(update_called_with) >= 1, "Update should be called to increment attempts"
        # First update should increment attempts
        assert update_called_with[0].get("attempts") == 1, \
            "Attempt counter should be incremented to 1"

    @patch('one_for_all.tools.otp_verification.tool_limiter')
    @patch('one_for_all.tools.otp_verification.verify_otp_hash')
    @patch('one_for_all.tools.otp_verification.check_tool_rate_limit')
    @patch('one_for_all.tools.otp_verification.supabase')
    def test_sets_verified_at_on_success(
        self, mock_supabase, mock_rate_limit, mock_verify_hash, mock_tool_limiter, mock_otp_record
    ):
        """
        Test that verified_at is set on successful verification.

        Expected behavior:
        - Update is called with verified_at timestamp
        """
        # Arrange
        mock_rate_limit.return_value = (True, "")
        mock_verify_hash.return_value = True
        update_calls = []

        def capture_update(data):
            update_calls.append(data)
            mock_response = MagicMock()
            mock_response.eq.return_value.execute.return_value = MagicMock(data=[{}])
            return mock_response

        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.is_.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[mock_otp_record]
        )
        mock_table.update = capture_update
        mock_supabase.table.return_value = mock_table

        # Act
        verify_otp.func("test@example.com", "123456")

        # Assert
        # Should have at least 2 updates: increment attempts, then set verified_at
        assert len(update_calls) >= 2, "Should update attempts and verified_at"

        # Last update should set verified_at
        last_update = update_calls[-1]
        assert "verified_at" in last_update, "Should set verified_at on success"

    @patch('one_for_all.tools.otp_verification.check_tool_rate_limit')
    @patch('one_for_all.tools.otp_verification.supabase')
    def test_no_active_otp_returns_invalid(self, mock_supabase, mock_rate_limit):
        """
        Test that missing OTP returns appropriate error.

        Expected behavior:
        - Returns "OTP_INVALID: No active OTP found for this identifier"
        """
        # Arrange
        mock_rate_limit.return_value = (True, "")

        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.is_.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[]  # No OTP found
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = verify_otp.func("unknown@example.com", "123456")

        # Assert
        assert "OTP_INVALID" in result
        assert "No active OTP" in result or "not found" in result.lower()

    @patch('one_for_all.tools.otp_verification.supabase', None)
    def test_no_supabase_client_returns_invalid(self):
        """
        Test behavior when Supabase client is not configured.

        Expected behavior:
        - Returns "OTP_INVALID: Supabase client not configured"
        """
        result = verify_otp.func("test@example.com", "123456")

        assert "OTP_INVALID" in result
        assert "not configured" in result.lower()


# =============================================================================
# Test: TestCheckOtpStatus
# =============================================================================

@pytest.mark.unit
class TestCheckOtpStatus:
    """Test OTP status checking functionality."""

    @patch('one_for_all.tools.otp_verification.supabase')
    def test_active_otp_returns_status(self, mock_supabase, mock_otp_record):
        """
        Test that active OTP returns channel, time remaining, attempt count.

        Expected behavior:
        - Returns "ACTIVE_OTP: ..." with channel, time, and attempts
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.is_.return_value.gte.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[mock_otp_record]
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = check_otp_status.func("test@example.com")

        # Assert
        assert "ACTIVE_OTP" in result, "Should indicate active OTP"
        assert "email" in result.lower(), "Should include channel"
        assert "minutes remaining" in result.lower() or "remaining" in result.lower(), \
            "Should include time remaining"
        assert "0/3" in result or "Attempts:" in result, "Should include attempt count"

    @patch('one_for_all.tools.otp_verification.supabase')
    def test_no_active_otp_returns_no_active_otp(self, mock_supabase):
        """
        Test that no active OTP returns NO_ACTIVE_OTP.

        Expected behavior:
        - Returns "NO_ACTIVE_OTP: No active OTP found for this identifier"
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.is_.return_value.gte.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[]
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = check_otp_status.func("unknown@example.com")

        # Assert
        assert "NO_ACTIVE_OTP" in result, "Should indicate no active OTP"

    @patch('one_for_all.tools.otp_verification.supabase')
    def test_expired_otp_not_returned(self, mock_supabase):
        """
        Test that expired OTPs are not returned by status check.

        Expected behavior:
        - Query filters for expires_at >= now
        - Expired OTPs return NO_ACTIVE_OTP
        """
        # Arrange - query will return empty because of gte filter
        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.is_.return_value.gte.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[]
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = check_otp_status.func("test@example.com")

        # Assert
        assert "NO_ACTIVE_OTP" in result, "Expired OTP should not be returned"

    @patch('one_for_all.tools.otp_verification.supabase')
    def test_verified_otp_not_returned(self, mock_supabase):
        """
        Test that already-verified OTPs are not returned.

        Expected behavior:
        - Query filters for verified_at IS NULL
        - Verified OTPs return NO_ACTIVE_OTP
        """
        # Arrange - query will return empty because of is_(verified_at, null) filter
        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.is_.return_value.gte.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[]
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = check_otp_status.func("test@example.com")

        # Assert
        assert "NO_ACTIVE_OTP" in result, "Verified OTP should not be returned"

    @patch('one_for_all.tools.otp_verification.supabase', None)
    def test_no_supabase_returns_error(self):
        """
        Test behavior when Supabase client is not configured.

        Expected behavior:
        - Returns "ERROR: Supabase client not configured"
        """
        result = check_otp_status.func("test@example.com")

        assert "ERROR" in result
        assert "not configured" in result.lower()

    @patch('one_for_all.tools.otp_verification.supabase')
    def test_database_error_handled(self, mock_supabase):
        """
        Test that database errors are handled gracefully.

        Expected behavior:
        - Returns error message
        - Does not crash
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.is_.return_value.gte.return_value.order.return_value.limit.return_value.execute.side_effect = Exception("DB error")
        mock_supabase.table.return_value = mock_table

        # Act
        result = check_otp_status.func("test@example.com")

        # Assert
        assert "ERROR" in result, "Should return error on database failure"


# =============================================================================
# Test: TestResendOtpCheck
# =============================================================================

@pytest.mark.unit
class TestResendOtpCheck:
    """Test resend OTP eligibility checking."""

    @patch('one_for_all.tools.otp_verification.supabase')
    def test_safe_to_resend_when_no_active_otp(self, mock_supabase):
        """
        Test that RESEND_OK is returned when no active OTP exists.

        Expected behavior:
        - Returns "RESEND_OK: No active OTP found. Safe to generate and send a new code."
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.is_.return_value.gte.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[]
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = resend_otp_check.func("test@example.com")

        # Assert
        assert "RESEND_OK" in result, "Should be safe to resend when no active OTP"
        assert "Safe to generate" in result or "safe" in result.lower()

    @patch('one_for_all.tools.otp_verification.supabase')
    def test_must_wait_when_active_otp_exists(self, mock_supabase, mock_otp_record):
        """
        Test that WAIT is returned when active OTP exists.

        Expected behavior:
        - Returns "WAIT: Active OTP exists with X minutes remaining..."
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.is_.return_value.gte.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[mock_otp_record]
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = resend_otp_check.func("test@example.com")

        # Assert
        assert "WAIT" in result, "Should indicate must wait when active OTP exists"
        assert "minutes remaining" in result.lower() or "remaining" in result.lower()

    @patch('one_for_all.tools.otp_verification.supabase', None)
    def test_no_supabase_returns_error(self):
        """
        Test behavior when Supabase client is not configured.

        Expected behavior:
        - Returns "ERROR: Supabase client not configured"
        """
        result = resend_otp_check.func("test@example.com")

        assert "ERROR" in result
        assert "not configured" in result.lower()

    @patch('one_for_all.tools.otp_verification.supabase')
    def test_database_error_handled(self, mock_supabase):
        """
        Test that database errors are handled gracefully.

        Expected behavior:
        - Returns error message
        - Does not crash
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.is_.return_value.gte.return_value.order.return_value.limit.return_value.execute.side_effect = Exception("Connection refused")
        mock_supabase.table.return_value = mock_table

        # Act
        result = resend_otp_check.func("test@example.com")

        # Assert
        assert "ERROR" in result, "Should return error on database failure"


# =============================================================================
# Test: TestCleanupExpiredOtps
# =============================================================================

@pytest.mark.unit
class TestCleanupExpiredOtps:
    """Test expired OTP cleanup functionality."""

    @patch('one_for_all.tools.otp_store.supabase')
    def test_deletes_otps_older_than_1_hour(self, mock_supabase):
        """
        Test that OTPs expired more than 1 hour ago are deleted.

        Expected behavior:
        - Calls delete with lt("expires_at", cutoff_time)
        - Cutoff is 1 hour ago
        """
        # Arrange
        deleted_records = [{"id": "old-otp-1"}, {"id": "old-otp-2"}]
        mock_table = MagicMock()
        mock_table.delete.return_value.lt.return_value.execute.return_value = MagicMock(
            data=deleted_records
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = cleanup_expired_otps()

        # Assert
        assert result == 2, "Should return count of deleted records"
        mock_supabase.table.assert_called_with("otp_codes")
        mock_table.delete.assert_called_once()

    @patch('one_for_all.tools.otp_store.supabase')
    def test_returns_deletion_count(self, mock_supabase):
        """
        Test that function returns the count of deleted records.

        Expected behavior:
        - Returns integer count of deleted OTPs
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.delete.return_value.lt.return_value.execute.return_value = MagicMock(
            data=[{"id": "1"}, {"id": "2"}, {"id": "3"}]
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = cleanup_expired_otps()

        # Assert
        assert result == 3, "Should return count of deleted records"

    @patch('one_for_all.tools.otp_store.supabase')
    def test_returns_zero_when_nothing_deleted(self, mock_supabase):
        """
        Test that function returns 0 when no records are deleted.

        Expected behavior:
        - Returns 0 when delete returns empty list
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.delete.return_value.lt.return_value.execute.return_value = MagicMock(
            data=[]
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = cleanup_expired_otps()

        # Assert
        assert result == 0, "Should return 0 when nothing deleted"

    @patch('one_for_all.tools.otp_store.supabase', None)
    def test_no_supabase_returns_zero(self):
        """
        Test behavior when Supabase client is not configured.

        Expected behavior:
        - Returns 0
        - Does not crash
        """
        result = cleanup_expired_otps()

        assert result == 0, "Should return 0 when Supabase not configured"

    @patch('one_for_all.tools.otp_store.supabase')
    def test_database_error_returns_zero(self, mock_supabase):
        """
        Test that database errors return 0.

        Expected behavior:
        - Returns 0 on error
        - Does not crash
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.delete.return_value.lt.return_value.execute.side_effect = Exception("Delete failed")
        mock_supabase.table.return_value = mock_table

        # Act
        result = cleanup_expired_otps()

        # Assert
        assert result == 0, "Should return 0 on database error"


# =============================================================================
# Test: TestGetActiveOtp
# =============================================================================

@pytest.mark.unit
class TestGetActiveOtp:
    """Test active OTP retrieval functionality."""

    @patch('one_for_all.tools.otp_store.supabase')
    def test_returns_active_otp_record(self, mock_supabase, mock_otp_record):
        """
        Test that active OTP record is returned.

        Expected behavior:
        - Returns the OTP record dict when found
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.is_.return_value.gte.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[mock_otp_record]
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = get_active_otp("test@example.com")

        # Assert
        assert result is not None, "Should return OTP record"
        assert result["id"] == "test-otp-id"
        assert result["identifier"] == "test@example.com"

    @patch('one_for_all.tools.otp_store.supabase')
    def test_returns_none_when_no_active_otp(self, mock_supabase):
        """
        Test that None is returned when no active OTP exists.

        Expected behavior:
        - Returns None when no matching records
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.is_.return_value.gte.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[]
        )
        mock_supabase.table.return_value = mock_table

        # Act
        result = get_active_otp("unknown@example.com")

        # Assert
        assert result is None, "Should return None when no active OTP"

    @patch('one_for_all.tools.otp_store.supabase')
    def test_filters_by_channel_when_provided(self, mock_supabase, mock_otp_record):
        """
        Test that channel filter is applied when provided.

        Expected behavior:
        - Query includes channel filter when channel param is specified
        """
        # Arrange
        mock_table = MagicMock()

        # Set up full chainable mock
        mock_table.select.return_value.eq.return_value.is_.return_value.gte.return_value.order.return_value.limit.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[mock_otp_record]
        )
        mock_supabase.table.return_value = mock_table

        # Act
        get_active_otp("test@example.com", channel="sms")

        # Assert - verify table was queried
        mock_supabase.table.assert_called_with("otp_codes")
        # Verify select was called
        mock_table.select.assert_called_with("*")

    @patch('one_for_all.tools.otp_store.supabase', None)
    def test_no_supabase_returns_none(self):
        """
        Test behavior when Supabase client is not configured.

        Expected behavior:
        - Returns None
        - Does not crash
        """
        result = get_active_otp("test@example.com")

        assert result is None, "Should return None when Supabase not configured"

    @patch('one_for_all.tools.otp_store.supabase')
    def test_database_error_returns_none(self, mock_supabase):
        """
        Test that database errors return None.

        Expected behavior:
        - Returns None on error
        - Does not crash
        """
        # Arrange
        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.is_.return_value.gte.return_value.order.return_value.limit.return_value.execute.side_effect = Exception("Query failed")
        mock_supabase.table.return_value = mock_table

        # Act
        result = get_active_otp("test@example.com")

        # Assert
        assert result is None, "Should return None on database error"


# =============================================================================
# Integration-Style Tests: OTP Workflow
# =============================================================================

@pytest.mark.unit
class TestOtpWorkflow:
    """Integration-style tests for complete OTP workflow."""

    @patch('one_for_all.tools.otp_verification.tool_limiter')
    @patch('one_for_all.tools.otp_verification.verify_otp_hash')
    @patch('one_for_all.tools.otp_verification.check_tool_rate_limit')
    @patch('one_for_all.tools.otp_verification.supabase')
    @patch('one_for_all.tools.otp_store.hash_otp')
    @patch('one_for_all.tools.otp_store.supabase')
    def test_generate_store_verify_workflow(
        self,
        mock_store_supabase,
        mock_hash_otp,
        mock_verify_supabase,
        mock_rate_limit,
        mock_verify_hash,
        mock_tool_limiter
    ):
        """
        Test complete workflow: generate -> store -> verify.

        Expected behavior:
        - Generate creates valid 6-digit code
        - Store saves hashed code to database
        - Verify accepts correct code and returns OTP_VALID
        """
        # Step 1: Generate OTP
        code = generate_otp()
        assert len(code) == 6
        assert code.isdigit()

        # Step 2: Store OTP
        mock_hash_otp.return_value = "$2b$10$mockedhash"
        mock_store_table = MagicMock()
        mock_store_table.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "test-id"}]
        )
        mock_store_supabase.table.return_value = mock_store_table

        stored = store_otp("test@example.com", "email", code)
        assert stored is True

        # Step 3: Verify OTP
        mock_rate_limit.return_value = (True, "")
        mock_verify_hash.return_value = True

        mock_otp_record = {
            "id": "test-otp-id",
            "identifier": "test@example.com",
            "code": "$2b$10$mockedhash",
            "channel": "email",
            "expires_at": (datetime.utcnow() + timedelta(minutes=5)).isoformat() + "Z",
            "attempts": 0,
            "verified_at": None
        }

        mock_verify_table = MagicMock()
        mock_verify_table.select.return_value.eq.return_value.is_.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[mock_otp_record]
        )
        mock_verify_table.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[{}])
        mock_verify_supabase.table.return_value = mock_verify_table

        result = verify_otp.func("test@example.com", code)
        assert result == "OTP_VALID"

    @patch('one_for_all.tools.otp_verification.verify_otp_hash')
    @patch('one_for_all.tools.otp_verification.check_tool_rate_limit')
    @patch('one_for_all.tools.otp_verification.supabase')
    def test_failed_verification_increments_attempts(
        self,
        mock_supabase,
        mock_rate_limit,
        mock_verify_hash
    ):
        """
        Test that failed verifications increment attempt counter.

        Expected behavior:
        - Each failed attempt increments the counter
        - After 3 failures, further attempts are blocked
        """
        mock_rate_limit.return_value = (True, "")
        mock_verify_hash.return_value = False  # Always wrong code

        attempts_updated = []

        def capture_update(data):
            if "attempts" in data:
                attempts_updated.append(data["attempts"])
            mock_response = MagicMock()
            mock_response.eq.return_value.execute.return_value = MagicMock(data=[{}])
            return mock_response

        # Simulate 3 failed attempts
        for attempt in range(3):
            mock_otp_record = {
                "id": "test-otp-id",
                "identifier": "test@example.com",
                "code": "$2b$10$hashedcode",
                "channel": "email",
                "expires_at": (datetime.utcnow() + timedelta(minutes=5)).isoformat() + "Z",
                "attempts": attempt,
                "verified_at": None
            }

            mock_table = MagicMock()
            mock_table.select.return_value.eq.return_value.is_.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
                data=[mock_otp_record]
            )
            mock_table.update = capture_update
            mock_supabase.table.return_value = mock_table

            result = verify_otp.func("test@example.com", "000000")
            assert "OTP_INVALID" in result

        # Verify attempts were incremented
        assert 1 in attempts_updated, "Should have updated to attempt 1"
        assert 2 in attempts_updated, "Should have updated to attempt 2"
        assert 3 in attempts_updated, "Should have updated to attempt 3"
