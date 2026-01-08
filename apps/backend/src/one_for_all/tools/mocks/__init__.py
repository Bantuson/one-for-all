"""
Mock Tools for Testing

This module provides mock implementations of external API tools for testing.
All mocks return success without making real API calls.

Mock tools available:
    - mock_otp_sender: Email OTP mock (no SendGrid)
    - mock_sms_sender: SMS OTP mock (no Twilio)
    - mock_whatsapp_sender: WhatsApp message mock (no Twilio)
    - mock_submission_tool: University application submission mock
    - mock_nsfas_submission_tool: NSFAS application submission mock
    - mock_status_tool: Application status check mock
    - mock_nsfas_status_tool: NSFAS status check mock
    - mock_upload_document: Document upload mock (no Supabase Storage)
    - mock_validate_document: Document validation mock
"""

from .mock_otp_sender import mock_otp_sender
from .mock_sms_sender import mock_sms_sender
from .mock_whatsapp_sender import mock_whatsapp_sender
from .mock_submission_tool import mock_submission_tool
from .mock_nsfas_tool import mock_nsfas_submission_tool
from .mock_status_tool import mock_status_tool, mock_nsfas_status_tool
from .mock_document_upload import (
    mock_upload_document,
    mock_validate_document,
    mock_get_document_url,
    mock_validate_batch_documents,
)

__all__ = [
    "mock_otp_sender",
    "mock_sms_sender",
    "mock_whatsapp_sender",
    "mock_submission_tool",
    "mock_nsfas_submission_tool",
    "mock_status_tool",
    "mock_nsfas_status_tool",
    "mock_upload_document",
    "mock_validate_document",
    "mock_get_document_url",
    "mock_validate_batch_documents",
]
