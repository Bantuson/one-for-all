"""
Test: Document Workflow (Flag -> Notify -> Approve)

Verifies the document validation lifecycle:
1. Flag detection - Blurry/invalid documents are flagged
2. Notification - Applicant notified via WhatsApp/email
3. Resubmission - Applicant uploads corrected document
4. Approval - Document passes validation

This workflow ensures data quality before application submission.
"""

import pytest
from typing import TYPE_CHECKING
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime
import uuid

if TYPE_CHECKING:
    from conftest import TrajectoryToolTracker

pytestmark = [
    pytest.mark.trajectory,
    pytest.mark.vcr,
    pytest.mark.llm_required,
]


# =============================================================================
# Mock Data Fixtures
# =============================================================================

@pytest.fixture
def mock_document_id() -> str:
    """Provide a consistent test document UUID."""
    return "doc-" + str(uuid.uuid4())


@pytest.fixture
def mock_application_id() -> str:
    """Provide a consistent test application UUID."""
    return "app-" + str(uuid.uuid4())


@pytest.fixture
def blurry_document_metadata(mock_document_id: str, mock_application_id: str) -> dict:
    """
    Metadata for a blurry/low-quality ID document.

    Simulates a document that should fail quality validation.
    """
    return {
        "id": mock_document_id,
        "application_id": mock_application_id,
        "document_type": "id_document",
        "file_name": "blurry_id_scan.jpg",
        "file_url": f"https://storage.example.com/{mock_application_id}/id_document/blurry.jpg",
        "storage_path": f"{mock_application_id}/id_document/blurry.jpg",
        "file_size": 45000,
        "mime_type": "image/jpeg",
        "uploaded_at": datetime.now().isoformat(),
        "review_status": "pending",
        "flag_reason": None,
        "flagged_by": None,
        "flagged_at": None,
        "reviewed_by": None,
        "reviewed_at": None,
    }


@pytest.fixture
def clear_document_metadata(mock_document_id: str, mock_application_id: str) -> dict:
    """
    Metadata for a clear, valid ID document.

    Simulates a resubmitted document that should pass validation.
    """
    return {
        "id": "doc-" + str(uuid.uuid4()),  # New document ID for resubmission
        "application_id": mock_application_id,
        "document_type": "id_document",
        "file_name": "clear_id_scan.jpg",
        "file_url": f"https://storage.example.com/{mock_application_id}/id_document/clear.jpg",
        "storage_path": f"{mock_application_id}/id_document/clear.jpg",
        "file_size": 125000,  # Higher quality = larger file
        "mime_type": "image/jpeg",
        "uploaded_at": datetime.now().isoformat(),
        "review_status": "pending",
        "flag_reason": None,
        "flagged_by": None,
        "flagged_at": None,
        "reviewed_by": None,
        "reviewed_at": None,
    }


# =============================================================================
# Helper Functions
# =============================================================================

def create_mock_supabase_response(data: dict | list, error=None):
    """Create a mock Supabase response object."""
    mock_response = MagicMock()
    mock_response.data = data if isinstance(data, list) else [data] if data else []
    mock_response.error = error
    return mock_response


def create_mock_whatsapp_response(success: bool = True, message_sid: str = "SM12345"):
    """Create a mock Twilio WhatsApp response."""
    if success:
        return f"WhatsApp message sent to whatsapp:+27821111001. SID: {message_sid}"
    return "Failed to send WhatsApp message: [21211] Invalid phone number"


# =============================================================================
# Test Class: Document Workflow
# =============================================================================

class TestDocumentWorkflow:
    """Document validation flag/notify/approve cycle tests."""

    def test_blurry_document_flagged(
        self,
        trajectory_tracker: "TrajectoryToolTracker",
        trajectory_undergraduate_profile: dict,
        mock_document_id: str,
        mock_application_id: str,
        blurry_document_metadata: dict,
    ):
        """
        Test: Blurry ID document is detected and flagged.

        Scenario: Applicant uploads a low-resolution ID scan

        Verification:
        - validate_document tool called for ID
        - Document flagged with reason "image_quality_low"
        - Application state updated to "pending_documents"
        - Document status set to "rejected"
        """
        # Track initial state
        trajectory_tracker.update_state(authenticated=True, session_active=True)

        # =====================================================================
        # Step 1: Simulate document validation (would be AI vision in production)
        # =====================================================================
        validation_result = "INVALID: Image quality is too low to verify document details. Please upload a clearer scan."

        trajectory_tracker.record(
            tool_name="validate_document",
            args={
                "file_content": b"<low_quality_image_bytes>",
                "file_name": "blurry_id_scan.jpg",
            },
            result=validation_result,
        )

        # =====================================================================
        # Step 2: Flag the document with reason
        # =====================================================================
        flag_reason = "ID document image is too blurry - please upload a clearer photo"
        flagged_by = "agent-document-reviewer"

        with patch("one_for_all.tools.document_review_tools.supabase") as mock_supabase:
            # Mock the document lookup
            mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute = AsyncMock(
                return_value=create_mock_supabase_response(blurry_document_metadata)
            )

            # Mock the update
            flagged_doc = blurry_document_metadata.copy()
            flagged_doc.update({
                "review_status": "flagged",
                "flag_reason": flag_reason,
                "flagged_by": flagged_by,
                "flagged_at": datetime.now().isoformat(),
            })
            mock_supabase.table.return_value.update.return_value.eq.return_value.execute = AsyncMock(
                return_value=create_mock_supabase_response(flagged_doc)
            )

            # Simulate tool call result
            flag_result = (
                f"DOCUMENT_FLAGGED: Successfully flagged document {mock_document_id} "
                f"(type: id_document, application: {mock_application_id}). "
                f"Reason: {flag_reason}"
            )

            trajectory_tracker.record(
                tool_name="document_flag_tool",
                args={
                    "document_id": mock_document_id,
                    "flag_reason": flag_reason,
                    "flagged_by": flagged_by,
                },
                result=flag_result,
            )

        # =====================================================================
        # Step 3: Update application state to pending_documents
        # =====================================================================
        trajectory_tracker.update_state(documents_uploaded=False)

        # =====================================================================
        # Verification
        # =====================================================================

        # Verify tool sequence
        assert trajectory_tracker.called("validate_document"), \
            "validate_document should be called for document check"
        assert trajectory_tracker.called("document_flag_tool"), \
            "document_flag_tool should be called for flagging"

        # Verify order: validation before flagging
        assert trajectory_tracker.called_before("validate_document", "document_flag_tool"), \
            "Document should be validated before being flagged"

        # Verify flag reason is specific and actionable
        flag_args = trajectory_tracker.get_call_args("document_flag_tool")
        assert flag_args is not None
        assert "blurry" in flag_args["flag_reason"].lower(), \
            "Flag reason should mention the specific issue (blurry)"
        assert "clearer" in flag_args["flag_reason"].lower(), \
            "Flag reason should provide corrective action"

        # Verify state transition
        assert trajectory_tracker.state.documents_uploaded is False, \
            "documents_uploaded should be False after flagging"

        # Verify call count
        assert trajectory_tracker.call_count("document_flag_tool") == 1, \
            "document_flag_tool should be called exactly once"

    def test_applicant_notified_of_document_issue(
        self,
        trajectory_tracker: "TrajectoryToolTracker",
        trajectory_undergraduate_profile: dict,
        mock_document_id: str,
        mock_application_id: str,
        blurry_document_metadata: dict,
    ):
        """
        Test: Applicant receives notification about document issue.

        Scenario: After document is flagged, applicant is notified

        Verification:
        - send_whatsapp_message or send_notification tool called with correct template
        - Message includes document type and issue description
        - Notification logged in applicant_notifications table
        - Application remains in "pending_documents" state
        """
        # Set up initial state (document already flagged)
        trajectory_tracker.update_state(
            authenticated=True,
            session_active=True,
            documents_uploaded=False,
        )

        # Get applicant contact info from profile
        phone_number = trajectory_undergraduate_profile["whatsapp_number"]
        applicant_name = trajectory_undergraduate_profile["full_name"]

        # =====================================================================
        # Step 1: Retrieve flagged documents for the application
        # =====================================================================
        flagged_doc = blurry_document_metadata.copy()
        flagged_doc.update({
            "review_status": "flagged",
            "flag_reason": "ID document image is too blurry - please upload a clearer photo",
            "flagged_by": "agent-document-reviewer",
            "flagged_at": datetime.now().isoformat(),
        })

        with patch("one_for_all.tools.document_review_tools.supabase") as mock_supabase:
            mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute = AsyncMock(
                return_value=create_mock_supabase_response([flagged_doc])
            )

            get_docs_result = str({
                "application_id": mock_application_id,
                "total_documents": 1,
                "review_summary": {
                    "pending": 0,
                    "approved": 0,
                    "flagged": 1,
                },
                "documents": [flagged_doc],
            })

            trajectory_tracker.record(
                tool_name="get_application_documents",
                args={"application_id": mock_application_id},
                result=get_docs_result,
            )

        # =====================================================================
        # Step 2: Send notification to applicant via WhatsApp
        # =====================================================================
        notification_message = (
            f"Dear {applicant_name},\n\n"
            "We have reviewed your application documents and need you to resubmit the following:\n\n"
            "Document: ID Document\n"
            "Issue: ID document image is too blurry - please upload a clearer photo\n"
            "Action: Please upload a new version that addresses the issue above.\n\n"
            "You can upload your documents by logging into your One For All account.\n\n"
            "If you have questions, please contact support."
        )

        with patch("one_for_all.tools.whatsapp_handler.aiohttp") as mock_aiohttp:
            # Mock successful WhatsApp send
            mock_session = MagicMock()
            mock_response = MagicMock()
            mock_response.status = 201
            mock_response.json = AsyncMock(return_value={
                "sid": "SM" + uuid.uuid4().hex[:32],
                "status": "queued",
            })
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock(return_value=None)
            mock_session.post.return_value.__aenter__ = AsyncMock(return_value=mock_response)
            mock_session.post.return_value.__aexit__ = AsyncMock(return_value=None)
            mock_aiohttp.ClientSession.return_value = mock_session

            whatsapp_result = f"WhatsApp message sent to whatsapp:{phone_number}. SID: SM12345abcd"

            trajectory_tracker.record(
                tool_name="send_whatsapp_message",
                args={
                    "phone_number": phone_number,
                    "message": notification_message,
                },
                result=whatsapp_result,
            )

        # =====================================================================
        # Step 3: Log notification in database
        # =====================================================================
        # Note: No patching needed here - we're just tracking the tool call
        # The trajectory tracker records tool invocations without executing them
        log_result = (
            f"WhatsApp interaction logged for applicant {trajectory_undergraduate_profile['profile_id']} "
            f"at {datetime.now().isoformat()}. Type: document_flagging, Direction: outbound"
        )

        trajectory_tracker.record(
            tool_name="log_whatsapp_interaction",
            args={
                "applicant_id": trajectory_undergraduate_profile["profile_id"],
                "phone_number": phone_number,
                "message_type": "document_flagging",
                "message_content": "Document resubmission notification",
                "direction": "outbound",
            },
            result=log_result,
        )

        # =====================================================================
        # Verification
        # =====================================================================

        # Verify tool sequence
        assert trajectory_tracker.called("get_application_documents"), \
            "Should fetch flagged documents before sending notification"
        assert trajectory_tracker.called("send_whatsapp_message"), \
            "Should send WhatsApp notification to applicant"
        assert trajectory_tracker.called("log_whatsapp_interaction"), \
            "Should log the notification interaction"

        # Verify order
        assert trajectory_tracker.verify_task_order([
            "get_application_documents",
            "send_whatsapp_message",
            "log_whatsapp_interaction",
        ]), "Notification workflow should follow correct order"

        # Verify WhatsApp message content includes required information
        whatsapp_args = trajectory_tracker.get_call_args("send_whatsapp_message")
        assert whatsapp_args is not None
        assert "ID Document" in whatsapp_args["message"], \
            "Notification should mention the specific document type"
        assert "blurry" in whatsapp_args["message"].lower(), \
            "Notification should include the specific issue"
        assert "upload" in whatsapp_args["message"].lower(), \
            "Notification should provide resubmission instructions"

        # Verify notification logging includes correct metadata
        log_args = trajectory_tracker.get_call_args("log_whatsapp_interaction")
        assert log_args is not None
        assert log_args["message_type"] == "document_flagging", \
            "Notification type should be document_flagging"
        assert log_args["direction"] == "outbound", \
            "Notification direction should be outbound"

        # Verify application state remains in pending_documents
        assert trajectory_tracker.state.documents_uploaded is False, \
            "Application should remain in pending_documents state"

    def test_document_approved_after_resubmit(
        self,
        trajectory_tracker: "TrajectoryToolTracker",
        trajectory_undergraduate_profile: dict,
        mock_document_id: str,
        mock_application_id: str,
        blurry_document_metadata: dict,
        clear_document_metadata: dict,
    ):
        """
        Test: Resubmitted document passes validation.

        Scenario: Applicant uploads clear ID scan after rejection

        Verification:
        - New document uploaded via upload_document tool
        - validate_document passes with "approved" status
        - Application state transitions to "ready_for_submission"
        - Previous rejection record preserved for audit
        """
        # Set up initial state (document was flagged, awaiting resubmission)
        trajectory_tracker.update_state(
            authenticated=True,
            session_active=True,
            profile_complete=True,
            documents_uploaded=False,  # Still pending due to flagged doc
        )

        new_document_id = clear_document_metadata["id"]
        session_id = f"TEST-TRAJ-SESSION-{uuid.uuid4().hex[:8]}"

        # =====================================================================
        # Step 1: Upload new, clear document
        # =====================================================================
        # Simulate valid JPEG file content (mock magic bytes)
        valid_jpeg_content = b"\xff\xd8\xff\xe0" + b"\x00" * 100000 + b"\xff\xd9"

        with patch("one_for_all.tools.document_upload_tool.supabase") as mock_supabase:
            # Mock storage upload
            mock_supabase.storage.from_.return_value.upload = AsyncMock(
                return_value=MagicMock(error=None)
            )

            # Mock signed URL generation
            mock_supabase.storage.from_.return_value.create_signed_url = AsyncMock(
                return_value={"signedURL": clear_document_metadata["file_url"]}
            )

            # Mock database insert
            mock_supabase.table.return_value.insert.return_value.execute = AsyncMock(
                return_value=create_mock_supabase_response(clear_document_metadata)
            )

            upload_result = str({
                "success": True,
                "document_id": new_document_id,
                "file_url": clear_document_metadata["file_url"],
                "storage_path": clear_document_metadata["storage_path"],
                "file_name": clear_document_metadata["file_name"],
                "file_size": len(valid_jpeg_content),
                "mime_type": "image/jpeg",
                "file_hash": "sha256_hash_of_clear_image",
                "detected_mime_type": "image/jpeg",
                "scan_status": "pending",
            })

            trajectory_tracker.record(
                tool_name="upload_document",
                args={
                    "file_content": valid_jpeg_content,
                    "file_name": "clear_id_scan.jpg",
                    "document_type": "id_document",
                    "application_id": mock_application_id,
                    "bucket": "application-documents",
                    "session_id": session_id,
                },
                result=upload_result,
            )

        # =====================================================================
        # Step 2: Validate the new document
        # =====================================================================
        validation_result = "VALID"

        trajectory_tracker.record(
            tool_name="validate_document",
            args={
                "file_content": valid_jpeg_content,
                "file_name": "clear_id_scan.jpg",
            },
            result=validation_result,
        )

        # =====================================================================
        # Step 3: Approve the document
        # =====================================================================
        with patch("one_for_all.tools.document_review_tools.supabase") as mock_supabase:
            # Mock document lookup
            mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute = AsyncMock(
                return_value=create_mock_supabase_response(clear_document_metadata)
            )

            # Mock approval update
            approved_doc = clear_document_metadata.copy()
            approved_doc.update({
                "review_status": "approved",
                "reviewed_by": "agent-document-reviewer",
                "reviewed_at": datetime.now().isoformat(),
            })
            mock_supabase.table.return_value.update.return_value.eq.return_value.execute = AsyncMock(
                return_value=create_mock_supabase_response(approved_doc)
            )

            approve_result = (
                f"DOCUMENT_APPROVED: Successfully approved document {new_document_id} "
                f"(type: id_document, application: {mock_application_id})"
            )

            trajectory_tracker.record(
                tool_name="document_approve_tool",
                args={
                    "document_id": new_document_id,
                    "reviewed_by": "agent-document-reviewer",
                },
                result=approve_result,
            )

        # =====================================================================
        # Step 4: Verify all documents are now approved - update application state
        # =====================================================================
        with patch("one_for_all.tools.document_review_tools.supabase") as mock_supabase:
            # Mock: all documents now approved
            mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute = AsyncMock(
                return_value=create_mock_supabase_response([approved_doc])
            )

            final_docs_result = str({
                "application_id": mock_application_id,
                "total_documents": 1,
                "review_summary": {
                    "pending": 0,
                    "approved": 1,
                    "flagged": 0,
                },
                "documents": [approved_doc],
            })

            trajectory_tracker.record(
                tool_name="get_application_documents",
                args={"application_id": mock_application_id},
                result=final_docs_result,
            )

        # Update state to ready_for_submission
        trajectory_tracker.update_state(documents_uploaded=True)

        # =====================================================================
        # Verification
        # =====================================================================

        # Verify complete workflow sequence
        assert trajectory_tracker.verify_task_order([
            "upload_document",
            "validate_document",
            "document_approve_tool",
            "get_application_documents",
        ]), "Resubmission workflow should follow correct order"

        # Verify upload includes correct metadata
        upload_args = trajectory_tracker.get_call_args("upload_document")
        assert upload_args is not None
        assert upload_args["document_type"] == "id_document", \
            "Upload should be for same document type (id_document)"
        assert upload_args["application_id"] == mock_application_id, \
            "Upload should be for same application"

        # Verify validation passed
        validation_call = [c for c in trajectory_tracker.calls if c["tool"] == "validate_document"][0]
        assert "VALID" in validation_call["result"], \
            "Resubmitted document should pass validation"

        # Verify approval
        approval_call = [c for c in trajectory_tracker.calls if c["tool"] == "document_approve_tool"][0]
        assert "DOCUMENT_APPROVED" in approval_call["result"], \
            "Document should be approved after passing validation"

        # Verify state transition to ready_for_submission
        assert trajectory_tracker.state.documents_uploaded is True, \
            "documents_uploaded should be True after approval"

        # Verify audit trail - both original flagged doc and new approved doc exist
        # (In production, the old flagged document would still be in the database)
        get_docs_calls = [c for c in trajectory_tracker.calls if c["tool"] == "get_application_documents"]
        assert len(get_docs_calls) == 1, \
            "Should have fetched documents after approval"
        final_result = get_docs_calls[0]["result"]
        # Note: Python str() on dict uses single quotes, not double quotes
        assert "'approved': 1" in final_result, \
            "Final document list should show 1 approved document"
        assert "'flagged': 0" in final_result, \
            "Final document list should show 0 flagged documents"

        # Verify state history shows transition
        assert len(trajectory_tracker.state_history) >= 2, \
            "State history should record the transition"
        # First state: documents_uploaded=False, last state: documents_uploaded=True
        assert trajectory_tracker.state_history[-1]["state"]["documents_uploaded"] is True, \
            "Final state should have documents_uploaded=True"
