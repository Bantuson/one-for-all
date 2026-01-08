"""
Unit tests for OTP generation, storage, and verification.

Tests the OTP workflow components:
- OTP code generation
- Storage in database
- Verification logic
- Expiry handling
- Attempt limiting
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
import sys
from pathlib import Path

# Add src to path
src_path = Path(__file__).resolve().parent.parent.parent / "src"
sys.path.insert(0, str(src_path))

from one_for_all.tools.otp_store import generate_otp, store_otp, get_active_otp
from one_for_all.tools.otp_verification import verify_otp


class TestOtpGeneration:
    """Test OTP code generation."""

    def test_generate_otp_format(self):
        """
        Test that generated OTP is 6 digits.

        Expected behavior:
        - Returns a string
        - Contains exactly 6 characters
        - All characters are numeric
        """
        otp = generate_otp()

        assert isinstance(otp, str), "OTP should be a string"
        assert len(otp) == 6, "OTP should be 6 digits"
        assert otp.isdigit(), "OTP should contain only digits"

    def test_generate_otp_randomness(self):
        """
        Test that OTP generation produces different codes.

        Expected behavior:
        - Multiple calls produce different codes (statistically)
        - Codes are within valid range (100000-999999)
        """
        otps = [generate_otp() for _ in range(10)]

        # Check all are unique (statistically likely with 10 samples)
        assert len(set(otps)) > 1, "OTP should be random, not always identical"

        # Check range
        for otp in otps:
            otp_int = int(otp)
            assert 100000 <= otp_int <= 999999, \
                f"OTP {otp} should be in range 100000-999999"


class TestOtpStorage:
    """Test OTP storage functionality."""

    @patch('one_for_all.tools.otp_store.supabase')
    def test_store_otp_success(self, mock_supabase):
        """
        Test successful OTP storage.

        Expected behavior:
        - Calls supabase.table("otp_codes").insert()
        - Includes identifier, channel, code, expires_at, attempts
        - Returns True on success
        """
        # Mock successful insert
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
            {"id": "test-id"}
        ]

        result = store_otp(
            identifier="test@example.com",
            channel="email",
            code="123456"
        )

        assert result is True, "store_otp should return True on success"

        # Verify insert was called
        mock_supabase.table.assert_called_with("otp_codes")

    @patch('one_for_all.tools.otp_store.supabase')
    def test_store_otp_failure(self, mock_supabase):
        """
        Test OTP storage failure handling.

        Expected behavior:
        - Returns False when database insert fails
        - Handles exceptions gracefully
        """
        # Mock failed insert (no data)
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = None

        result = store_otp(
            identifier="test@example.com",
            channel="email",
            code="123456"
        )

        assert result is False, "store_otp should return False on failure"

    @patch('one_for_all.tools.otp_store.supabase')
    def test_store_otp_expiry_time(self, mock_supabase):
        """
        Test that OTP is stored with 10-minute expiry.

        Expected behavior:
        - expires_at is set to current time + 10 minutes
        - Uses ISO format timestamp
        """
        # Mock successful insert
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
            {"id": "test-id"}
        ]

        store_otp(
            identifier="test@example.com",
            channel="email",
            code="123456"
        )

        # Get the insert call args
        insert_call = mock_supabase.table.return_value.insert.call_args[0][0]

        assert "expires_at" in insert_call, "Should include expires_at field"

        # Verify expiry is approximately 10 minutes from now
        # (allowing for test execution time)
        expires_at = datetime.fromisoformat(insert_call["expires_at"])
        expected_expiry = datetime.utcnow() + timedelta(minutes=10)
        time_diff = abs((expires_at - expected_expiry).total_seconds())

        assert time_diff < 5, "Expiry should be ~10 minutes from now"


class TestOtpVerification:
    """Test OTP verification logic."""

    @patch('one_for_all.tools.otp_verification.supabase')
    def test_valid_otp_verifies(self, mock_supabase):
        """
        Test that correct OTP verifies successfully.

        Expected behavior:
        - Returns "OTP_VALID"
        - Marks OTP as verified in database
        - Increments attempt counter
        """
        # Mock finding valid OTP
        mock_otp = {
            "id": "test-otp-id",
            "identifier": "test@example.com",
            "code": "123456",
            "expires_at": (datetime.utcnow() + timedelta(minutes=5)).isoformat() + "Z",
            "attempts": 0,
            "verified_at": None
        }

        mock_select = Mock()
        mock_select.select.return_value.eq.return_value.eq.return_value.is_.return_value.order.return_value.limit.return_value.execute.return_value.data = [mock_otp]
        mock_supabase.table.return_value = mock_select

        # Mock update
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = Mock()

        result = verify_otp.func("test@example.com", "123456")

        assert result == "OTP_VALID", "Valid OTP should verify successfully"

    @patch('one_for_all.tools.otp_verification.supabase')
    def test_wrong_code_fails(self, mock_supabase):
        """
        Test that wrong code is rejected.

        Expected behavior:
        - Returns "OTP_INVALID: Code not found or already used"
        - Does not mark any record as verified
        """
        # Mock no matching OTP found
        mock_select = Mock()
        mock_select.select.return_value.eq.return_value.eq.return_value.is_.return_value.order.return_value.limit.return_value.execute.return_value.data = []
        mock_supabase.table.return_value = mock_select

        result = verify_otp.func("test@example.com", "000000")

        assert "OTP_INVALID" in result, "Wrong code should be rejected"
        assert "not found" in result.lower() or "already used" in result.lower(), \
            "Should indicate code not found"

    @patch('one_for_all.tools.otp_verification.supabase')
    def test_expired_otp_fails(self, mock_supabase):
        """
        Test that expired OTP is rejected.

        Expected behavior:
        - Returns "OTP_INVALID: Code has expired"
        - Does not mark as verified
        """
        # Mock expired OTP (10 minutes ago)
        mock_otp = {
            "id": "test-otp-id",
            "identifier": "test@example.com",
            "code": "123456",
            "expires_at": (datetime.utcnow() - timedelta(minutes=10)).isoformat() + "Z",
            "attempts": 0,
            "verified_at": None
        }

        mock_select = Mock()
        mock_select.select.return_value.eq.return_value.eq.return_value.is_.return_value.order.return_value.limit.return_value.execute.return_value.data = [mock_otp]
        mock_supabase.table.return_value = mock_select

        result = verify_otp.func("test@example.com", "123456")

        assert "OTP_INVALID" in result, "Expired OTP should be rejected"
        assert "expired" in result.lower(), "Should indicate expiration"

    @patch('one_for_all.tools.otp_verification.supabase')
    def test_max_attempts_exceeded(self, mock_supabase):
        """
        Test that OTP with 3+ attempts is rejected.

        Expected behavior:
        - Returns "OTP_INVALID: Maximum verification attempts exceeded"
        - Protects against brute force attacks
        """
        # Mock OTP with 3 failed attempts
        mock_otp = {
            "id": "test-otp-id",
            "identifier": "test@example.com",
            "code": "123456",
            "expires_at": (datetime.utcnow() + timedelta(minutes=5)).isoformat() + "Z",
            "attempts": 3,  # Max attempts reached
            "verified_at": None
        }

        mock_select = Mock()
        mock_select.select.return_value.eq.return_value.eq.return_value.is_.return_value.order.return_value.limit.return_value.execute.return_value.data = [mock_otp]
        mock_supabase.table.return_value = mock_select

        result = verify_otp.func("test@example.com", "123456")

        assert "OTP_INVALID" in result, "Max attempts should be rejected"
        assert "maximum" in result.lower() or "attempts" in result.lower(), \
            "Should indicate attempt limit"

    @patch('one_for_all.tools.otp_verification.supabase')
    def test_already_verified_otp_rejected(self, mock_supabase):
        """
        Test that already-verified OTP cannot be reused.

        Expected behavior:
        - Query filters for verified_at IS NULL
        - Returns "OTP_INVALID" for already-used codes
        """
        # Mock no unverified OTP found (already verified)
        mock_select = Mock()
        mock_select.select.return_value.eq.return_value.eq.return_value.is_.return_value.order.return_value.limit.return_value.execute.return_value.data = []
        mock_supabase.table.return_value = mock_select

        result = verify_otp.func("test@example.com", "123456")

        assert "OTP_INVALID" in result, "Already-verified OTP should be rejected"


class TestOtpEdgeCases:
    """Test edge cases and boundary conditions."""

    @patch('one_for_all.tools.otp_verification.supabase', None)
    def test_verification_without_supabase(self):
        """
        Test OTP verification when Supabase client is not configured.

        Expected behavior:
        - Returns "OTP_INVALID: Supabase client not configured"
        - Doesn't crash
        """
        result = verify_otp.func("test@example.com", "123456")

        assert "OTP_INVALID" in result, "Should return invalid when no DB"
        assert "not configured" in result.lower(), \
            "Should indicate configuration issue"

    def test_generate_otp_no_duplicates_in_batch(self):
        """
        Test that generating many OTPs produces mostly unique codes.

        Statistical test - not guaranteed but highly likely.
        """
        otps = [generate_otp() for _ in range(100)]
        unique_otps = set(otps)

        # With 100 samples from 900,000 possibilities, expect mostly unique
        assert len(unique_otps) > 95, \
            "Should generate mostly unique OTPs in batch of 100"

    @patch('one_for_all.tools.otp_store.supabase')
    def test_store_otp_different_channels(self, mock_supabase):
        """
        Test storing OTPs via different channels.

        Expected behavior:
        - Can store for email, sms, whatsapp
        - Channel is recorded in database
        """
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
            {"id": "test-id"}
        ]

        channels = ["email", "sms", "whatsapp"]

        for channel in channels:
            result = store_otp(
                identifier="test@example.com",
                channel=channel,
                code="123456"
            )

            assert result is True, f"Should store OTP for channel {channel}"


class TestOtpWorkflow:
    """Integration-style tests for complete OTP workflow."""

    @patch('one_for_all.tools.otp_store.supabase')
    @patch('one_for_all.tools.otp_verification.supabase')
    def test_generate_store_verify_workflow(
        self,
        mock_verify_supabase,
        mock_store_supabase
    ):
        """
        Test complete workflow: generate → store → verify.

        Expected behavior:
        - Generate creates valid 6-digit code
        - Store saves to database
        - Verify accepts correct code
        """
        # Step 1: Generate
        code = generate_otp()
        assert len(code) == 6

        # Step 2: Store
        mock_store_supabase.table.return_value.insert.return_value.execute.return_value.data = [
            {"id": "test-id"}
        ]

        stored = store_otp("test@example.com", "email", code)
        assert stored is True

        # Step 3: Verify
        mock_otp = {
            "id": "test-otp-id",
            "identifier": "test@example.com",
            "code": code,
            "expires_at": (datetime.utcnow() + timedelta(minutes=5)).isoformat() + "Z",
            "attempts": 0,
            "verified_at": None
        }

        mock_select = Mock()
        mock_select.select.return_value.eq.return_value.eq.return_value.is_.return_value.order.return_value.limit.return_value.execute.return_value.data = [mock_otp]
        mock_verify_supabase.table.return_value = mock_select

        mock_verify_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = Mock()

        result = verify_otp.func("test@example.com", code)
        assert result == "OTP_VALID"
