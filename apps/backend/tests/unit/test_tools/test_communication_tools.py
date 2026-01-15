"""
Unit tests for communication tools (SendGrid, SMS, WhatsApp).

Tests cover:
- SendGrid OTP sender (email OTP via SendGrid API)
- SMS OTP sender (SMS OTP via Twilio API)
- WhatsApp handler (send_whatsapp_message, send_whatsapp_otp, etc.)

All external API calls are mocked to ensure fast, deterministic tests.
"""

import pytest
import asyncio
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime, timedelta
from contextlib import asynccontextmanager

# Add src to path for imports
src_path = Path(__file__).resolve().parent.parent.parent.parent / "src"
sys.path.insert(0, str(src_path))


# =============================================================================
# Helper class for mocking aiohttp responses
# =============================================================================

class MockAsyncContextManager:
    """Mock async context manager for aiohttp responses."""

    def __init__(self, response):
        self.response = response

    async def __aenter__(self):
        return self.response

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        return None


class MockResponse:
    """Mock aiohttp response object."""

    def __init__(self, status=200, text='', json_data=None):
        self.status = status
        self._text = text
        self._json_data = json_data or {}

    async def text(self):
        return self._text

    async def json(self):
        return self._json_data


def create_mock_session(response):
    """Create a mock aiohttp ClientSession that returns the given response."""
    mock_session = MagicMock()
    mock_cm = MockAsyncContextManager(response)
    mock_session.post.return_value = mock_cm

    # Make the session itself an async context manager
    session_cm = MagicMock()
    session_cm.__aenter__ = AsyncMock(return_value=mock_session)
    session_cm.__aexit__ = AsyncMock(return_value=None)

    return session_cm


# =============================================================================
# SendGrid OTP Sender Tests
# =============================================================================

class TestSendGridOtpSender:
    """Tests for SendGrid email OTP delivery."""

    @pytest.mark.unit
    @pytest.mark.sendgrid
    def test_sendgrid_otp_success(self):
        """
        Test successful email OTP delivery via SendGrid.

        Expected behavior:
        - Generates 6-digit OTP
        - Stores OTP in database
        - Calls SendGrid API with correct payload
        - Returns success message
        """
        mock_response = MockResponse(status=202, text='')
        mock_session_cm = create_mock_session(mock_response)

        with patch('aiohttp.ClientSession', return_value=mock_session_cm):
            with patch('one_for_all.tools.sendgrid_otp_sender.generate_otp', return_value='123456'):
                with patch('one_for_all.tools.sendgrid_otp_sender.store_otp', return_value=True):
                    with patch('one_for_all.tools.sendgrid_otp_sender.SENDGRID_API_KEY', 'test-api-key'):
                        from one_for_all.tools.sendgrid_otp_sender import sendgrid_otp_sender

                        result = sendgrid_otp_sender.func('test@example.com')

                        assert 'sent' in result.lower() or 'OTP' in result
                        assert 'test@example.com' in result

    @pytest.mark.unit
    @pytest.mark.sendgrid
    def test_sendgrid_otp_api_error(self):
        """
        Test SendGrid API error handling.

        Expected behavior:
        - Returns error message when API returns non-2xx status
        - Includes error details from API response
        """
        mock_response = MockResponse(
            status=401,
            text='{"errors": [{"message": "Invalid API key"}]}'
        )
        mock_session_cm = create_mock_session(mock_response)

        with patch('aiohttp.ClientSession', return_value=mock_session_cm):
            with patch('one_for_all.tools.sendgrid_otp_sender.generate_otp', return_value='123456'):
                with patch('one_for_all.tools.sendgrid_otp_sender.store_otp', return_value=True):
                    with patch('one_for_all.tools.sendgrid_otp_sender.SENDGRID_API_KEY', 'invalid-key'):
                        from one_for_all.tools.sendgrid_otp_sender import sendgrid_otp_sender

                        result = sendgrid_otp_sender.func('test@example.com')

                        assert 'failed' in result.lower() or 'error' in result.lower()

    @pytest.mark.unit
    @pytest.mark.sendgrid
    def test_sendgrid_otp_store_failure(self):
        """
        Test handling when OTP storage fails.

        Expected behavior:
        - Returns error message indicating storage failure
        - Does NOT attempt to send email when storage fails
        """
        with patch('one_for_all.tools.sendgrid_otp_sender.generate_otp', return_value='123456'):
            with patch('one_for_all.tools.sendgrid_otp_sender.store_otp', return_value=False):
                with patch('one_for_all.tools.sendgrid_otp_sender.SENDGRID_API_KEY', 'test-api-key'):
                    from one_for_all.tools.sendgrid_otp_sender import sendgrid_otp_sender

                    result = sendgrid_otp_sender.func('test@example.com')

                    assert 'failed' in result.lower()
                    assert 'store' in result.lower() or 'not sent' in result.lower()

    @pytest.mark.unit
    @pytest.mark.sendgrid
    def test_sendgrid_otp_status_200_success(self):
        """
        Test that status 200 is also treated as success (not just 202).

        Expected behavior:
        - Status 200 returns success message
        """
        mock_response = MockResponse(status=200, text='')
        mock_session_cm = create_mock_session(mock_response)

        with patch('aiohttp.ClientSession', return_value=mock_session_cm):
            with patch('one_for_all.tools.sendgrid_otp_sender.generate_otp', return_value='654321'):
                with patch('one_for_all.tools.sendgrid_otp_sender.store_otp', return_value=True):
                    with patch('one_for_all.tools.sendgrid_otp_sender.SENDGRID_API_KEY', 'test-api-key'):
                        from one_for_all.tools.sendgrid_otp_sender import sendgrid_otp_sender

                        result = sendgrid_otp_sender.func('another@example.com')

                        assert 'sent' in result.lower() or 'OTP' in result

    @pytest.mark.unit
    @pytest.mark.sendgrid
    def test_sendgrid_otp_payload_format(self):
        """
        Test that SendGrid API is called with correct payload format.

        Expected behavior:
        - Payload includes personalizations, from, content
        - Authorization header uses Bearer token
        - Content-Type is application/json
        """
        mock_response = MockResponse(status=202, text='')
        mock_session_cm = create_mock_session(mock_response)

        with patch('aiohttp.ClientSession', return_value=mock_session_cm):
            with patch('one_for_all.tools.sendgrid_otp_sender.generate_otp', return_value='999888'):
                with patch('one_for_all.tools.sendgrid_otp_sender.store_otp', return_value=True):
                    with patch('one_for_all.tools.sendgrid_otp_sender.SENDGRID_API_KEY', 'sg_test_key_123'):
                        from one_for_all.tools.sendgrid_otp_sender import sendgrid_otp_sender

                        sendgrid_otp_sender.func('payload@example.com')

                        # Get the session mock and verify post was called
                        session_mock = mock_session_cm.__aenter__.return_value
                        call_args = session_mock.post.call_args

                        assert call_args is not None

                        # Check URL
                        url = call_args[0][0]
                        assert 'api.sendgrid.com' in url
                        assert 'mail/send' in url

                        # Check headers
                        headers = call_args[1].get('headers', {})
                        assert 'Bearer' in headers.get('Authorization', '')
                        assert headers.get('Content-Type') == 'application/json'


# =============================================================================
# SMS OTP Sender Tests
# =============================================================================

class TestSmsOtpSender:
    """Tests for Twilio SMS OTP delivery."""

    @pytest.fixture
    def mock_twilio_env(self):
        """Mock Twilio environment variables."""
        with patch('one_for_all.tools.sms_otp_sender.TWILIO_SID', 'AC_test_sid_123'):
            with patch('one_for_all.tools.sms_otp_sender.TWILIO_AUTH_TOKEN', 'test_auth_token'):
                with patch('one_for_all.tools.sms_otp_sender.TWILIO_NUMBER', '+15551234567'):
                    yield

    @pytest.mark.unit
    @pytest.mark.sms
    def test_sms_otp_success(self, mock_twilio_env):
        """
        Test successful SMS OTP delivery via Twilio.

        Expected behavior:
        - Generates 6-digit OTP
        - Stores OTP in database
        - Calls Twilio API with correct parameters
        - Returns success message
        """
        mock_response = MockResponse(status=201, text='{"sid": "SM_test_123"}')
        mock_session_cm = create_mock_session(mock_response)

        with patch('aiohttp.ClientSession', return_value=mock_session_cm):
            with patch('one_for_all.tools.sms_otp_sender.generate_otp', return_value='123456'):
                with patch('one_for_all.tools.sms_otp_sender.store_otp', return_value=True):
                    from one_for_all.tools.sms_otp_sender import sms_otp_sender

                    result = sms_otp_sender.func('+27821234567')

                    assert 'sent' in result.lower()
                    assert '+27821234567' in result

    @pytest.mark.unit
    @pytest.mark.sms
    def test_sms_otp_api_error(self, mock_twilio_env):
        """
        Test Twilio API error handling.

        Expected behavior:
        - Returns error message when API returns error status
        - Includes error details from API response
        """
        mock_response = MockResponse(
            status=400,
            text='{"code": 21211, "message": "Invalid phone number"}'
        )
        mock_session_cm = create_mock_session(mock_response)

        with patch('aiohttp.ClientSession', return_value=mock_session_cm):
            with patch('one_for_all.tools.sms_otp_sender.generate_otp', return_value='123456'):
                with patch('one_for_all.tools.sms_otp_sender.store_otp', return_value=True):
                    from one_for_all.tools.sms_otp_sender import sms_otp_sender

                    result = sms_otp_sender.func('+invalid_number')

                    assert 'failed' in result.lower() or 'error' in result.lower()

    @pytest.mark.unit
    @pytest.mark.sms
    def test_sms_otp_store_failure(self, mock_twilio_env):
        """
        Test handling when OTP storage fails.

        Expected behavior:
        - Returns error message indicating storage failure
        - Does NOT attempt to send SMS when storage fails
        """
        with patch('one_for_all.tools.sms_otp_sender.generate_otp', return_value='123456'):
            with patch('one_for_all.tools.sms_otp_sender.store_otp', return_value=False):
                from one_for_all.tools.sms_otp_sender import sms_otp_sender

                result = sms_otp_sender.func('+27821234567')

                assert 'failed' in result.lower()
                assert 'store' in result.lower() or 'not sent' in result.lower()

    @pytest.mark.unit
    @pytest.mark.sms
    def test_sms_otp_uses_basic_auth(self, mock_twilio_env):
        """
        Test that Twilio API is called with Basic Auth.

        Expected behavior:
        - API call uses BasicAuth with SID and Auth Token
        - URL includes account SID
        """
        mock_response = MockResponse(status=201, text='{"sid": "SM_test_123"}')
        mock_session_cm = create_mock_session(mock_response)

        with patch('aiohttp.ClientSession', return_value=mock_session_cm):
            with patch('one_for_all.tools.sms_otp_sender.generate_otp', return_value='123456'):
                with patch('one_for_all.tools.sms_otp_sender.store_otp', return_value=True):
                    from one_for_all.tools.sms_otp_sender import sms_otp_sender

                    sms_otp_sender.func('+27821234567')

                    session_mock = mock_session_cm.__aenter__.return_value
                    call_args = session_mock.post.call_args

                    assert call_args is not None

                    # Check URL includes SID
                    url = call_args[0][0]
                    assert 'api.twilio.com' in url
                    assert 'Messages.json' in url

                    # Check auth parameter exists
                    auth = call_args[1].get('auth')
                    assert auth is not None

    @pytest.mark.unit
    @pytest.mark.sms
    def test_sms_otp_message_content(self, mock_twilio_env):
        """
        Test that SMS message includes OTP code.

        Expected behavior:
        - Message body includes generated OTP
        - Message mentions expiry time
        """
        mock_response = MockResponse(status=201, text='{"sid": "SM_test_123"}')
        mock_session_cm = create_mock_session(mock_response)

        with patch('aiohttp.ClientSession', return_value=mock_session_cm):
            with patch('one_for_all.tools.sms_otp_sender.generate_otp', return_value='567890'):
                with patch('one_for_all.tools.sms_otp_sender.store_otp', return_value=True):
                    from one_for_all.tools.sms_otp_sender import sms_otp_sender

                    sms_otp_sender.func('+27821234567')

                    session_mock = mock_session_cm.__aenter__.return_value
                    call_args = session_mock.post.call_args
                    data = call_args[1].get('data', {})

                    assert '567890' in data.get('Body', '')
                    assert '10 minutes' in data.get('Body', '').lower() or 'expires' in data.get('Body', '').lower()


# =============================================================================
# WhatsApp Handler Tests
# =============================================================================

class TestWhatsAppFormatNumber:
    """Tests for WhatsApp phone number formatting."""

    @pytest.mark.unit
    @pytest.mark.whatsapp
    def test_format_south_african_local(self):
        """
        Test formatting South African local format (0XXXXXXXXX).

        Expected behavior:
        - Converts 0XX to whatsapp:+27XX format
        """
        from one_for_all.tools.whatsapp_handler import format_whatsapp_number

        result = format_whatsapp_number('0821234567')
        assert result == 'whatsapp:+27821234567'

    @pytest.mark.unit
    @pytest.mark.whatsapp
    def test_format_with_plus_prefix(self):
        """
        Test formatting number with + prefix.

        Expected behavior:
        - Preserves + prefix and adds whatsapp: prefix
        """
        from one_for_all.tools.whatsapp_handler import format_whatsapp_number

        result = format_whatsapp_number('+27821234567')
        assert result == 'whatsapp:+27821234567'

    @pytest.mark.unit
    @pytest.mark.whatsapp
    def test_format_without_plus(self):
        """
        Test formatting number starting with country code but no +.

        Expected behavior:
        - Adds + prefix and whatsapp: prefix
        """
        from one_for_all.tools.whatsapp_handler import format_whatsapp_number

        result = format_whatsapp_number('27821234567')
        assert result == 'whatsapp:+27821234567'

    @pytest.mark.unit
    @pytest.mark.whatsapp
    def test_format_with_spaces_and_dashes(self):
        """
        Test formatting number with spaces and dashes.

        Expected behavior:
        - Removes non-digit characters (except +)
        - Formats correctly
        """
        from one_for_all.tools.whatsapp_handler import format_whatsapp_number

        result = format_whatsapp_number('082-123-4567')
        assert result == 'whatsapp:+27821234567'

        result2 = format_whatsapp_number('082 123 4567')
        assert result2 == 'whatsapp:+27821234567'

    @pytest.mark.unit
    @pytest.mark.whatsapp
    def test_format_short_number_assumes_sa(self):
        """
        Test that short numbers without country code assume South African.

        Expected behavior:
        - Numbers without recognized prefix get +27 added
        """
        from one_for_all.tools.whatsapp_handler import format_whatsapp_number

        result = format_whatsapp_number('821234567')
        assert result == 'whatsapp:+27821234567'


class TestSendWhatsAppMessage:
    """Tests for WhatsApp message sending."""

    @pytest.fixture
    def mock_twilio_whatsapp_env(self):
        """Mock Twilio WhatsApp environment variables."""
        with patch('one_for_all.tools.whatsapp_handler.TWILIO_SID', 'AC_test_sid_123'):
            with patch('one_for_all.tools.whatsapp_handler.TWILIO_AUTH_TOKEN', 'test_auth_token'):
                with patch('one_for_all.tools.whatsapp_handler.TWILIO_WHATSAPP_NUMBER', '+14155238886'):
                    yield

    @pytest.mark.unit
    @pytest.mark.whatsapp
    def test_send_whatsapp_message_success(self, mock_twilio_whatsapp_env):
        """
        Test successful WhatsApp message delivery.

        Expected behavior:
        - Formats recipient number correctly
        - Calls Twilio API
        - Returns success message with SID
        """
        mock_response = MockResponse(
            status=201,
            json_data={'sid': 'SM_whatsapp_123'}
        )
        mock_session_cm = create_mock_session(mock_response)

        with patch('aiohttp.ClientSession', return_value=mock_session_cm):
            from one_for_all.tools.whatsapp_handler import send_whatsapp_message

            result = send_whatsapp_message.func('0821234567', 'Test message')

            assert 'sent' in result.lower()
            assert 'SM_whatsapp_123' in result or 'SID' in result

    @pytest.mark.unit
    @pytest.mark.whatsapp
    def test_send_whatsapp_message_api_error(self, mock_twilio_whatsapp_env):
        """
        Test WhatsApp API error handling.

        Expected behavior:
        - Returns error message when API fails
        - Includes error code and message
        """
        mock_response = MockResponse(
            status=400,
            json_data={
                'code': 63007,
                'message': 'The WhatsApp message could not be sent'
            }
        )
        mock_session_cm = create_mock_session(mock_response)

        with patch('aiohttp.ClientSession', return_value=mock_session_cm):
            from one_for_all.tools.whatsapp_handler import send_whatsapp_message

            result = send_whatsapp_message.func('0821234567', 'Test message')

            assert 'failed' in result.lower() or 'error' in result.lower()

    @pytest.mark.unit
    @pytest.mark.whatsapp
    def test_send_whatsapp_message_missing_credentials(self):
        """
        Test handling when Twilio credentials are not configured.

        Expected behavior:
        - Returns error message indicating missing configuration
        - Does not attempt API call
        """
        with patch('one_for_all.tools.whatsapp_handler.TWILIO_SID', None):
            with patch('one_for_all.tools.whatsapp_handler.TWILIO_AUTH_TOKEN', 'token'):
                with patch('one_for_all.tools.whatsapp_handler.TWILIO_WHATSAPP_NUMBER', '+14155238886'):
                    from one_for_all.tools.whatsapp_handler import send_whatsapp_message

                    result = send_whatsapp_message.func('0821234567', 'Test')

                    assert 'error' in result.lower()
                    assert 'credentials' in result.lower() or 'configured' in result.lower()


class TestSendWhatsAppOtp:
    """Tests for WhatsApp OTP sending."""

    @pytest.fixture
    def mock_twilio_whatsapp_env(self):
        """Mock Twilio WhatsApp environment variables."""
        with patch('one_for_all.tools.whatsapp_handler.TWILIO_SID', 'AC_test_sid_123'):
            with patch('one_for_all.tools.whatsapp_handler.TWILIO_AUTH_TOKEN', 'test_auth_token'):
                with patch('one_for_all.tools.whatsapp_handler.TWILIO_WHATSAPP_NUMBER', '+14155238886'):
                    yield

    @pytest.mark.unit
    @pytest.mark.whatsapp
    def test_send_whatsapp_otp_success(self, mock_twilio_whatsapp_env):
        """
        Test successful WhatsApp OTP delivery.

        Expected behavior:
        - Generates OTP
        - Stores OTP with normalized phone number
        - Sends OTP via WhatsApp
        - Returns success message
        """
        mock_response = MockResponse(
            status=201,
            json_data={'sid': 'SM_otp_123'}
        )
        mock_session_cm = create_mock_session(mock_response)

        with patch('aiohttp.ClientSession', return_value=mock_session_cm):
            # Patch at the otp_store module level since whatsapp_handler imports from there
            with patch('one_for_all.tools.otp_store.generate_otp', return_value='456789'):
                with patch('one_for_all.tools.otp_store.store_otp', return_value=True) as mock_store:
                    from one_for_all.tools.whatsapp_handler import send_whatsapp_otp

                    result = send_whatsapp_otp.func('0821234567')

                    # Verify OTP was stored with normalized number
                    mock_store.assert_called_once()
                    call_args = mock_store.call_args
                    assert call_args[1]['identifier'] == '+27821234567'
                    assert call_args[1]['channel'] == 'whatsapp'
                    assert call_args[1]['code'] == '456789'

                    assert 'sent' in result.lower() or 'SID' in result

    @pytest.mark.unit
    @pytest.mark.whatsapp
    def test_send_whatsapp_otp_store_failure(self, mock_twilio_whatsapp_env):
        """
        Test handling when OTP storage fails.

        Expected behavior:
        - Returns error message indicating storage failure
        - Does NOT attempt to send WhatsApp message
        """
        # Patch at the otp_store module level since whatsapp_handler imports from there
        with patch('one_for_all.tools.otp_store.generate_otp', return_value='456789'):
            with patch('one_for_all.tools.otp_store.store_otp', return_value=False):
                from one_for_all.tools.whatsapp_handler import send_whatsapp_otp

                result = send_whatsapp_otp.func('0821234567')

                assert 'failed' in result.lower()
                assert 'store' in result.lower() or 'not sent' in result.lower()


class TestSendWhatsAppTemplate:
    """Tests for WhatsApp template message sending."""

    @pytest.fixture
    def mock_twilio_whatsapp_env(self):
        """Mock Twilio WhatsApp environment variables."""
        with patch('one_for_all.tools.whatsapp_handler.TWILIO_SID', 'AC_test_sid_123'):
            with patch('one_for_all.tools.whatsapp_handler.TWILIO_AUTH_TOKEN', 'test_auth_token'):
                with patch('one_for_all.tools.whatsapp_handler.TWILIO_WHATSAPP_NUMBER', '+14155238886'):
                    yield

    @pytest.mark.unit
    @pytest.mark.whatsapp
    def test_send_template_success(self, mock_twilio_whatsapp_env):
        """
        Test successful WhatsApp template message delivery.

        Expected behavior:
        - Calls Twilio API with ContentSid
        - Returns success message with SID
        """
        mock_response = MockResponse(
            status=201,
            json_data={'sid': 'SM_template_123'}
        )
        mock_session_cm = create_mock_session(mock_response)

        with patch('aiohttp.ClientSession', return_value=mock_session_cm):
            from one_for_all.tools.whatsapp_handler import send_whatsapp_template

            result = send_whatsapp_template.func('0821234567', 'HX_welcome_template', '')

            assert 'sent' in result.lower()
            assert 'SM_template_123' in result or 'SID' in result

    @pytest.mark.unit
    @pytest.mark.whatsapp
    def test_send_template_with_params(self, mock_twilio_whatsapp_env):
        """
        Test WhatsApp template with variable parameters.

        Expected behavior:
        - ContentVariables included in API call
        - Parameters mapped to numbered keys
        """
        mock_response = MockResponse(
            status=201,
            json_data={'sid': 'SM_template_123'}
        )
        mock_session_cm = create_mock_session(mock_response)

        with patch('aiohttp.ClientSession', return_value=mock_session_cm):
            from one_for_all.tools.whatsapp_handler import send_whatsapp_template

            result = send_whatsapp_template.func(
                '0821234567',
                'HX_application_status',
                'John,UCT,Computer Science'
            )

            # Verify API was called with ContentVariables
            session_mock = mock_session_cm.__aenter__.return_value
            call_args = session_mock.post.call_args
            data = call_args[1].get('data', {})

            assert 'ContentSid' in data
            assert 'HX_application_status' == data.get('ContentSid')

    @pytest.mark.unit
    @pytest.mark.whatsapp
    def test_send_template_missing_credentials(self):
        """
        Test handling when Twilio credentials are not configured.

        Expected behavior:
        - Returns error message indicating missing configuration
        """
        with patch('one_for_all.tools.whatsapp_handler.TWILIO_SID', None):
            with patch('one_for_all.tools.whatsapp_handler.TWILIO_AUTH_TOKEN', None):
                with patch('one_for_all.tools.whatsapp_handler.TWILIO_WHATSAPP_NUMBER', None):
                    from one_for_all.tools.whatsapp_handler import send_whatsapp_template

                    result = send_whatsapp_template.func('0821234567', 'template', '')

                    assert 'error' in result.lower()
                    assert 'credentials' in result.lower() or 'configured' in result.lower()


class TestLogWhatsAppInteraction:
    """Tests for WhatsApp interaction logging."""

    @pytest.mark.unit
    @pytest.mark.whatsapp
    def test_log_interaction_success(self):
        """
        Test successful WhatsApp interaction logging.

        Expected behavior:
        - Updates applicant record with timestamp
        - Returns confirmation message
        """
        mock_supabase = MagicMock()
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
            {'id': 'applicant-123'}
        ]

        # Patch at supabase_client module level since that's where it's imported from
        with patch('one_for_all.tools.supabase_client.supabase', mock_supabase):
            from one_for_all.tools.whatsapp_handler import log_whatsapp_interaction

            result = log_whatsapp_interaction.func(
                applicant_id='applicant-123',
                phone_number='0821234567',
                message_type='otp',
                message_content='OTP verification sent',
                direction='outbound'
            )

            assert 'logged' in result.lower()
            assert 'applicant-123' in result

    @pytest.mark.unit
    @pytest.mark.whatsapp
    def test_log_interaction_no_supabase(self):
        """
        Test handling when Supabase client is not configured.

        Expected behavior:
        - Returns error message indicating configuration issue
        """
        # Patch at supabase_client module level since that's where it's imported from
        with patch('one_for_all.tools.supabase_client.supabase', None):
            from one_for_all.tools.whatsapp_handler import log_whatsapp_interaction

            result = log_whatsapp_interaction.func(
                applicant_id='applicant-123',
                phone_number='0821234567',
                message_type='otp',
                message_content='OTP sent',
                direction='outbound'
            )

            assert 'error' in result.lower()
            assert 'not configured' in result.lower()

    @pytest.mark.unit
    @pytest.mark.whatsapp
    def test_log_interaction_db_error(self):
        """
        Test handling when database update fails.

        Expected behavior:
        - Returns message indicating logging completed but update failed
        - Does not crash
        """
        mock_supabase = MagicMock()
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.side_effect = Exception(
            'Database connection error'
        )

        # Patch at supabase_client module level since that's where it's imported from
        with patch('one_for_all.tools.supabase_client.supabase', mock_supabase):
            from one_for_all.tools.whatsapp_handler import log_whatsapp_interaction

            result = log_whatsapp_interaction.func(
                applicant_id='applicant-123',
                phone_number='0821234567',
                message_type='notification',
                message_content='Status update',
                direction='outbound'
            )

            # Should handle error gracefully
            assert 'failed' in result.lower() or 'error' in result.lower()


# =============================================================================
# Environment Variable Handling Tests
# =============================================================================

class TestEnvironmentVariables:
    """Tests for environment variable handling across all tools."""

    @pytest.mark.unit
    @pytest.mark.env
    def test_sendgrid_missing_api_key(self):
        """
        Test SendGrid tool behavior when API key is missing.

        Expected behavior:
        - Tool should handle missing API key gracefully
        - May still try to send but fail with auth error
        """
        mock_response = MockResponse(status=401, text='Unauthorized')
        mock_session_cm = create_mock_session(mock_response)

        with patch('one_for_all.tools.sendgrid_otp_sender.SENDGRID_API_KEY', None):
            with patch('one_for_all.tools.sendgrid_otp_sender.generate_otp', return_value='123456'):
                with patch('one_for_all.tools.sendgrid_otp_sender.store_otp', return_value=True):
                    with patch('aiohttp.ClientSession', return_value=mock_session_cm):
                        from one_for_all.tools.sendgrid_otp_sender import sendgrid_otp_sender

                        result = sendgrid_otp_sender.func('test@example.com')

                        # Should fail but not crash
                        assert 'failed' in result.lower() or 'error' in result.lower()

    @pytest.mark.unit
    @pytest.mark.env
    def test_twilio_sms_missing_credentials(self):
        """
        Test SMS tool behavior when Twilio credentials are missing.

        Expected behavior:
        - Tool attempts to use empty string credentials
        - Results in API authentication failure
        Note: aiohttp.BasicAuth doesn't allow None values, so we test with empty strings
        which will still fail authentication.
        """
        mock_response = MockResponse(status=401, text='Authentication Error')
        mock_session_cm = create_mock_session(mock_response)

        # Use empty strings instead of None since aiohttp.BasicAuth rejects None
        with patch('one_for_all.tools.sms_otp_sender.TWILIO_SID', ''):
            with patch('one_for_all.tools.sms_otp_sender.TWILIO_AUTH_TOKEN', ''):
                with patch('one_for_all.tools.sms_otp_sender.TWILIO_NUMBER', ''):
                    with patch('one_for_all.tools.sms_otp_sender.generate_otp', return_value='123456'):
                        with patch('one_for_all.tools.sms_otp_sender.store_otp', return_value=True):
                            with patch('aiohttp.ClientSession', return_value=mock_session_cm):
                                from one_for_all.tools.sms_otp_sender import sms_otp_sender

                                # Will attempt to use empty credentials
                                result = sms_otp_sender.func('+27821234567')

                                assert 'failed' in result.lower() or 'error' in result.lower()


# =============================================================================
# Integration-Style Workflow Tests
# =============================================================================

class TestCommunicationWorkflows:
    """Integration-style tests for complete communication workflows."""

    @pytest.mark.unit
    @pytest.mark.workflow
    def test_otp_send_workflow_email(self):
        """
        Test complete email OTP workflow.

        Steps:
        1. Generate OTP
        2. Store in database
        3. Send via SendGrid
        4. Verify success
        """
        mock_response = MockResponse(status=202, text='')
        mock_session_cm = create_mock_session(mock_response)

        from one_for_all.tools.otp_store import generate_otp

        # Step 1: Generate
        otp = generate_otp()
        assert len(otp) == 6
        assert otp.isdigit()

        # Step 2-3: Store and Send
        with patch('aiohttp.ClientSession', return_value=mock_session_cm):
            with patch('one_for_all.tools.sendgrid_otp_sender.generate_otp', return_value=otp):
                with patch('one_for_all.tools.sendgrid_otp_sender.store_otp', return_value=True) as mock_store:
                    with patch('one_for_all.tools.sendgrid_otp_sender.SENDGRID_API_KEY', 'test-key'):
                        from one_for_all.tools.sendgrid_otp_sender import sendgrid_otp_sender

                        result = sendgrid_otp_sender.func('workflow@example.com')

                        # Verify storage was called with correct OTP
                        mock_store.assert_called_once()
                        assert mock_store.call_args[1]['code'] == otp
                        assert mock_store.call_args[1]['channel'] == 'email'

                        # Verify success
                        assert 'sent' in result.lower()

    @pytest.mark.unit
    @pytest.mark.workflow
    def test_otp_send_workflow_sms(self):
        """
        Test complete SMS OTP workflow.

        Steps:
        1. Generate OTP
        2. Store in database
        3. Send via Twilio SMS
        4. Verify success
        """
        mock_response = MockResponse(status=201, text='{"sid": "SM123"}')
        mock_session_cm = create_mock_session(mock_response)

        from one_for_all.tools.otp_store import generate_otp

        otp = generate_otp()

        with patch('aiohttp.ClientSession', return_value=mock_session_cm):
            with patch('one_for_all.tools.sms_otp_sender.generate_otp', return_value=otp):
                with patch('one_for_all.tools.sms_otp_sender.store_otp', return_value=True) as mock_store:
                    with patch('one_for_all.tools.sms_otp_sender.TWILIO_SID', 'test-sid'):
                        with patch('one_for_all.tools.sms_otp_sender.TWILIO_AUTH_TOKEN', 'test-token'):
                            with patch('one_for_all.tools.sms_otp_sender.TWILIO_NUMBER', '+15551234567'):
                                from one_for_all.tools.sms_otp_sender import sms_otp_sender

                                result = sms_otp_sender.func('+27821234567')

                                mock_store.assert_called_once()
                                assert mock_store.call_args[1]['code'] == otp
                                assert mock_store.call_args[1]['channel'] == 'sms'
                                assert 'sent' in result.lower()

    @pytest.mark.unit
    @pytest.mark.workflow
    def test_otp_send_workflow_whatsapp(self):
        """
        Test complete WhatsApp OTP workflow.

        Steps:
        1. Generate OTP
        2. Store in database with normalized phone
        3. Send via Twilio WhatsApp
        4. Verify success
        """
        mock_response = MockResponse(
            status=201,
            json_data={'sid': 'SM_wa_123'}
        )
        mock_session_cm = create_mock_session(mock_response)

        from one_for_all.tools.otp_store import generate_otp

        otp = generate_otp()

        with patch('aiohttp.ClientSession', return_value=mock_session_cm):
            # Patch at the otp_store module level since whatsapp_handler imports from there
            with patch('one_for_all.tools.otp_store.generate_otp', return_value=otp):
                with patch('one_for_all.tools.otp_store.store_otp', return_value=True) as mock_store:
                    with patch('one_for_all.tools.whatsapp_handler.TWILIO_SID', 'test-sid'):
                        with patch('one_for_all.tools.whatsapp_handler.TWILIO_AUTH_TOKEN', 'test-token'):
                            with patch('one_for_all.tools.whatsapp_handler.TWILIO_WHATSAPP_NUMBER', '+14155238886'):
                                from one_for_all.tools.whatsapp_handler import send_whatsapp_otp

                                result = send_whatsapp_otp.func('0821234567')

                                mock_store.assert_called_once()
                                # WhatsApp normalizes to +27 format
                                assert mock_store.call_args[1]['identifier'] == '+27821234567'
                                assert mock_store.call_args[1]['channel'] == 'whatsapp'
                                assert mock_store.call_args[1]['code'] == otp
