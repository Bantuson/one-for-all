"""
Unit tests for unified notification tools.

Tests the notification router and unified notification entry points.
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from decimal import Decimal

# Import the modules under test
from one_for_all.tools.notification_router import (
    NotificationChannel,
    NotificationStatus,
    NotificationType,
    NotificationPriority,
    NotificationResult,
    normalize_phone_number,
    format_whatsapp_number,
    is_valid_phone_number,
    is_valid_email,
    check_whatsapp_availability,
    check_sms_availability,
    check_email_availability,
    select_channel,
    get_failover_channel,
    CHANNEL_COSTS,
)


class TestPhoneNumberFormatting:
    """Tests for phone number formatting utilities."""

    def test_normalize_south_african_local(self):
        """Test normalizing local SA number starting with 0."""
        result = normalize_phone_number("0821234567")
        assert result == "+27821234567"

    def test_normalize_with_country_code_no_plus(self):
        """Test normalizing number with 27 prefix but no +."""
        result = normalize_phone_number("27821234567")
        assert result == "+27821234567"

    def test_normalize_with_plus_prefix(self):
        """Test normalizing number already with + prefix."""
        result = normalize_phone_number("+27821234567")
        assert result == "+27821234567"

    def test_normalize_with_spaces_and_dashes(self):
        """Test normalizing number with formatting characters."""
        result = normalize_phone_number("082 123-4567")
        assert result == "+27821234567"

    def test_normalize_short_number(self):
        """Test normalizing short number assumes SA."""
        result = normalize_phone_number("821234567")
        assert result == "+27821234567"

    def test_format_whatsapp_number(self):
        """Test WhatsApp format includes prefix."""
        result = format_whatsapp_number("0821234567")
        assert result == "whatsapp:+27821234567"


class TestPhoneValidation:
    """Tests for phone number validation."""

    def test_valid_sa_mobile_082(self):
        """Test valid SA mobile starting with 082."""
        assert is_valid_phone_number("0821234567") is True

    def test_valid_sa_mobile_072(self):
        """Test valid SA mobile starting with 072."""
        assert is_valid_phone_number("0721234567") is True

    def test_valid_sa_mobile_083(self):
        """Test valid SA mobile starting with 083."""
        assert is_valid_phone_number("0831234567") is True

    def test_invalid_landline(self):
        """Test SA landline (011) is invalid for mobile channels."""
        assert is_valid_phone_number("0111234567") is False

    def test_invalid_too_short(self):
        """Test too short number is invalid."""
        assert is_valid_phone_number("082123456") is False

    def test_invalid_too_long(self):
        """Test too long number is invalid."""
        assert is_valid_phone_number("08212345678") is False


class TestEmailValidation:
    """Tests for email validation."""

    def test_valid_email(self):
        """Test valid email format."""
        assert is_valid_email("test@example.com") is True

    def test_valid_email_with_subdomain(self):
        """Test valid email with subdomain."""
        assert is_valid_email("user@mail.example.co.za") is True

    def test_invalid_email_no_at(self):
        """Test invalid email without @."""
        assert is_valid_email("testexample.com") is False

    def test_invalid_email_no_domain(self):
        """Test invalid email without domain."""
        assert is_valid_email("test@") is False

    def test_invalid_email_no_tld(self):
        """Test invalid email without TLD."""
        assert is_valid_email("test@example") is False


class TestChannelAvailability:
    """Tests for channel availability checks."""

    @patch.dict("one_for_all.tools.notification_router.__dict__", {
        "TWILIO_SID": "test_sid",
        "TWILIO_AUTH_TOKEN": "test_token",
        "TWILIO_WHATSAPP_NUMBER": "+14155238886"
    })
    def test_whatsapp_available_with_credentials(self):
        """Test WhatsApp available when credentials configured."""
        result = check_whatsapp_availability("0821234567")
        assert result.available is True

    @patch("one_for_all.tools.notification_router.TWILIO_SID", None)
    def test_whatsapp_unavailable_without_credentials(self):
        """Test WhatsApp unavailable without credentials."""
        result = check_whatsapp_availability("0821234567")
        assert result.available is False
        assert "credentials" in result.reason.lower()

    @patch.dict("one_for_all.tools.notification_router.__dict__", {
        "TWILIO_SID": "test_sid",
        "TWILIO_AUTH_TOKEN": "test_token",
        "TWILIO_WHATSAPP_NUMBER": "+14155238886"
    })
    def test_whatsapp_unavailable_invalid_phone(self):
        """Test WhatsApp unavailable with invalid phone."""
        result = check_whatsapp_availability("0111234567")  # Landline
        assert result.available is False
        assert "invalid" in result.reason.lower()

    @patch("one_for_all.tools.notification_router.SENDGRID_API_KEY", "test_key")
    def test_email_available_with_credentials(self):
        """Test email available when credentials configured."""
        result = check_email_availability("test@example.com")
        assert result.available is True

    @patch("one_for_all.tools.notification_router.SENDGRID_API_KEY", None)
    def test_email_unavailable_without_credentials(self):
        """Test email unavailable without credentials."""
        result = check_email_availability("test@example.com")
        assert result.available is False


class TestChannelSelection:
    """Tests for channel selection logic."""

    @patch("one_for_all.tools.notification_router.get_user_preferences")
    @patch("one_for_all.tools.notification_router.check_whatsapp_availability")
    def test_selects_whatsapp_by_default(self, mock_whatsapp, mock_prefs):
        """Test WhatsApp is selected as primary by default."""
        mock_prefs.return_value = None
        mock_whatsapp.return_value = MagicMock(available=True)

        channel, error = select_channel("0821234567")

        assert channel == NotificationChannel.WHATSAPP
        assert error is None

    @patch("one_for_all.tools.notification_router.get_user_preferences")
    @patch("one_for_all.tools.notification_router.check_whatsapp_availability")
    @patch("one_for_all.tools.notification_router.check_sms_availability")
    def test_selects_sms_when_whatsapp_unavailable(self, mock_sms, mock_whatsapp, mock_prefs):
        """Test SMS is selected when WhatsApp unavailable."""
        mock_prefs.return_value = None
        mock_whatsapp.return_value = MagicMock(available=False)
        mock_sms.return_value = MagicMock(available=True)

        channel, error = select_channel("0821234567")

        assert channel == NotificationChannel.SMS
        assert error is None

    @patch("one_for_all.tools.notification_router.check_email_availability")
    def test_selects_email_for_email_recipient(self, mock_email):
        """Test email is selected for email recipients."""
        mock_email.return_value = MagicMock(available=True)

        channel, error = select_channel("test@example.com")

        assert channel == NotificationChannel.EMAIL
        assert error is None

    @patch("one_for_all.tools.notification_router.get_user_preferences")
    @patch("one_for_all.tools.notification_router.check_whatsapp_availability")
    @patch("one_for_all.tools.notification_router.check_sms_availability")
    def test_respects_user_preference_sms(self, mock_sms, mock_whatsapp, mock_prefs):
        """Test user preference for SMS is respected."""
        mock_prefs.return_value = {
            "channel_priority": {"sms": 1, "whatsapp": 2, "email": 3},
            "sms_opt_in": True
        }
        mock_sms.return_value = MagicMock(available=True)
        mock_whatsapp.return_value = MagicMock(available=True)

        channel, error = select_channel("0821234567")

        assert channel == NotificationChannel.SMS

    def test_invalid_recipient_returns_error(self):
        """Test invalid recipient returns error."""
        channel, error = select_channel("not-a-phone-or-email")

        assert channel is None
        assert error is not None


class TestFailover:
    """Tests for failover logic."""

    @patch("one_for_all.tools.notification_router.NOTIFICATION_FAILOVER_ENABLED", True)
    @patch("one_for_all.tools.notification_router.check_sms_availability")
    def test_failover_whatsapp_to_sms(self, mock_sms):
        """Test failover from WhatsApp to SMS."""
        mock_sms.return_value = MagicMock(available=True)

        next_channel = get_failover_channel(
            NotificationChannel.WHATSAPP,
            "0821234567"
        )

        assert next_channel == NotificationChannel.SMS

    @patch("one_for_all.tools.notification_router.NOTIFICATION_FAILOVER_ENABLED", True)
    @patch("one_for_all.tools.notification_router.check_email_availability")
    def test_failover_sms_to_email(self, mock_email):
        """Test failover from SMS to email."""
        mock_email.return_value = MagicMock(available=True)

        next_channel = get_failover_channel(
            NotificationChannel.SMS,
            "0821234567",
            email_fallback="test@example.com"
        )

        assert next_channel == NotificationChannel.EMAIL

    @patch("one_for_all.tools.notification_router.NOTIFICATION_FAILOVER_ENABLED", False)
    def test_no_failover_when_disabled(self):
        """Test no failover when feature disabled."""
        next_channel = get_failover_channel(
            NotificationChannel.WHATSAPP,
            "0821234567"
        )

        assert next_channel is None

    @patch("one_for_all.tools.notification_router.NOTIFICATION_FAILOVER_ENABLED", True)
    def test_no_failover_from_email(self):
        """Test no further failover after email."""
        next_channel = get_failover_channel(
            NotificationChannel.EMAIL,
            "test@example.com"
        )

        assert next_channel is None


class TestNotificationResult:
    """Tests for NotificationResult dataclass."""

    def test_success_result(self):
        """Test creating a success result."""
        result = NotificationResult(
            success=True,
            channel="whatsapp",
            status=NotificationStatus.SENT,
            provider_message_id="SM123",
            cost_usd=Decimal("0.005")
        )

        assert result.success is True
        assert result.channel == "whatsapp"
        assert result.provider_message_id == "SM123"
        assert result.cost_usd == Decimal("0.005")
        assert result.was_failover is False

    def test_failure_result(self):
        """Test creating a failure result."""
        result = NotificationResult(
            success=False,
            channel="whatsapp",
            status=NotificationStatus.FAILED,
            error_code="21211",
            error_message="Invalid phone number"
        )

        assert result.success is False
        assert result.error_code == "21211"
        assert result.error_message == "Invalid phone number"

    def test_failover_result(self):
        """Test creating a failover result."""
        result = NotificationResult(
            success=True,
            channel="sms",
            status=NotificationStatus.SENT,
            was_failover=True,
            original_channel="whatsapp"
        )

        assert result.was_failover is True
        assert result.original_channel == "whatsapp"


class TestChannelCosts:
    """Tests for channel cost constants."""

    def test_whatsapp_cost(self):
        """Test WhatsApp cost is lowest."""
        assert CHANNEL_COSTS["whatsapp"] == Decimal("0.005")

    def test_sms_cost(self):
        """Test SMS cost is highest."""
        assert CHANNEL_COSTS["sms"] == Decimal("0.04")

    def test_email_cost(self):
        """Test email cost is lowest."""
        assert CHANNEL_COSTS["email"] == Decimal("0.001")

    def test_cost_ordering(self):
        """Test costs are in expected order: email < whatsapp < sms."""
        assert CHANNEL_COSTS["email"] < CHANNEL_COSTS["whatsapp"] < CHANNEL_COSTS["sms"]


class TestUnifiedNotificationTools:
    """Tests for unified notification CrewAI tools."""

    @patch("one_for_all.tools.unified_notification.route_notification")
    def test_send_notification_success(self, mock_route):
        """Test send_notification tool success."""
        mock_route.return_value = NotificationResult(
            success=True,
            channel="whatsapp",
            status=NotificationStatus.SENT,
            provider_message_id="SM123",
            cost_usd=Decimal("0.005")
        )

        from one_for_all.tools.unified_notification import send_notification
        result = send_notification.func(
            recipient="0821234567",
            message="Test message",
            notification_type="application_update"
        )

        assert "WHATSAPP" in result
        assert "SM123" in result
        assert "0.005" in result

    @patch("one_for_all.tools.unified_notification.route_notification")
    def test_send_notification_failure(self, mock_route):
        """Test send_notification tool failure."""
        mock_route.return_value = NotificationResult(
            success=False,
            channel="whatsapp",
            status=NotificationStatus.FAILED,
            error_code="21211",
            error_message="Invalid phone"
        )

        from one_for_all.tools.unified_notification import send_notification
        result = send_notification.func(
            recipient="0821234567",
            message="Test message"
        )

        assert "failed" in result.lower()
        assert "21211" in result

    @patch("one_for_all.tools.unified_notification.route_notification")
    def test_send_notification_failover(self, mock_route):
        """Test send_notification tool with failover."""
        mock_route.return_value = NotificationResult(
            success=True,
            channel="sms",
            status=NotificationStatus.SENT,
            was_failover=True,
            original_channel="whatsapp"
        )

        from one_for_all.tools.unified_notification import send_notification
        result = send_notification.func(
            recipient="0821234567",
            message="Test message"
        )

        assert "SMS" in result
        assert "failover" in result.lower()
        assert "whatsapp" in result.lower()

    @patch("one_for_all.tools.unified_notification.route_notification")
    @patch("one_for_all.tools.unified_notification.store_otp")
    @patch("one_for_all.tools.unified_notification.generate_otp")
    def test_send_otp_notification_success(self, mock_gen, mock_store, mock_route):
        """Test send_otp_notification tool success."""
        mock_gen.return_value = "123456"
        mock_store.return_value = True
        mock_route.return_value = NotificationResult(
            success=True,
            channel="whatsapp",
            status=NotificationStatus.SENT
        )

        from one_for_all.tools.unified_notification import send_otp_notification
        result = send_otp_notification.func(phone_number="0821234567")

        assert "OTP sent" in result
        assert "WHATSAPP" in result
        mock_store.assert_called_once()

    @patch("one_for_all.tools.unified_notification.store_otp")
    @patch("one_for_all.tools.unified_notification.generate_otp")
    def test_send_otp_notification_store_failure(self, mock_gen, mock_store):
        """Test send_otp_notification fails gracefully when store fails."""
        mock_gen.return_value = "123456"
        mock_store.return_value = False

        from one_for_all.tools.unified_notification import send_otp_notification
        result = send_otp_notification.func(phone_number="0821234567")

        assert "Failed to store OTP" in result

    def test_send_otp_notification_invalid_phone(self):
        """Test send_otp_notification rejects invalid phone."""
        from one_for_all.tools.unified_notification import send_otp_notification
        result = send_otp_notification.func(phone_number="0111234567")  # Landline

        assert "Invalid phone number" in result
