"""
Document Review Tools

CrewAI tools for reviewing, flagging, and approving application documents.
Supports document quality checks and applicant notifications.
"""

import asyncio
from datetime import datetime
from typing import Literal
from crewai.tools import tool
from .supabase_client import supabase
from ..utils.db_audit import audit_service_role_access


@audit_service_role_access(table="application_documents", operation="update")
@tool
def document_flag_tool(document_id: str, flag_reason: str, flagged_by: str) -> str:
    """
    Flag a document as having issues requiring applicant action.

    This tool marks a document with 'flagged' review status and records
    the reason for flagging. The flagged_by user ID and timestamp are
    automatically captured.

    Args:
        document_id: UUID of the document to flag (from application_documents table)
        flag_reason: Human-readable reason for flagging the document.
                    Examples:
                    - "Document is illegible - please upload a clearer image"
                    - "ID document appears to be incomplete - missing back page"
                    - "Matric certificate quality is too low to verify details"
                    - "Document does not match applicant information"
                    - "Uploaded file is corrupted or cannot be opened"
        flagged_by: UUID of the user/agent flagging the document

    Returns:
        Success: Confirmation message with document ID and flag reason
        Error: String starting with "FLAG_ERROR:" followed by error details

    Example:
        result = document_flag_tool(
            document_id="123e4567-e89b-12d3-a456-426614174000",
            flag_reason="Document is illegible - please upload a clearer image",
            flagged_by="agent-reviewer-001"
        )
    """

    async def async_flag():
        try:
            # Validate inputs
            if not document_id:
                return "FLAG_ERROR: document_id is required"

            if not flag_reason or len(flag_reason.strip()) == 0:
                return "FLAG_ERROR: flag_reason is required and cannot be empty"

            if not flagged_by:
                return "FLAG_ERROR: flagged_by is required"

            # Verify document exists
            check_result = (
                await supabase.table("application_documents")
                .select("id, document_type, application_id")
                .eq("id", document_id)
                .single()
                .execute()
            )

            if not check_result.data:
                return f"FLAG_ERROR: Document {document_id} not found"

            document_data = check_result.data

            # Update document with flagged status
            update_payload = {
                "review_status": "flagged",
                "flag_reason": flag_reason.strip(),
                "flagged_by": flagged_by,
                "flagged_at": datetime.now().isoformat(),
                "reviewed_by": flagged_by,
                "reviewed_at": datetime.now().isoformat(),
            }

            update_result = (
                await supabase.table("application_documents")
                .update(update_payload)
                .eq("id", document_id)
                .execute()
            )

            if hasattr(update_result, "error") and update_result.error:
                return f"FLAG_ERROR: Failed to update document - {update_result.error}"

            # Return success message
            return (
                f"DOCUMENT_FLAGGED: Successfully flagged document {document_id} "
                f"(type: {document_data['document_type']}, "
                f"application: {document_data['application_id']}). "
                f"Reason: {flag_reason}"
            )

        except Exception as e:
            return f"FLAG_ERROR: Unexpected error - {str(e)}"

    return asyncio.run(async_flag())


@audit_service_role_access(table="application_documents", operation="update")
@tool
def document_approve_tool(document_id: str, reviewed_by: str) -> str:
    """
    Approve a document as valid and complete.

    This tool marks a document with 'approved' review status, indicating
    it has passed quality checks and is ready for processing. Any previous
    flag information is cleared.

    Args:
        document_id: UUID of the document to approve (from application_documents table)
        reviewed_by: UUID of the user/agent approving the document

    Returns:
        Success: Confirmation message with document ID
        Error: String starting with "APPROVE_ERROR:" followed by error details

    Example:
        result = document_approve_tool(
            document_id="123e4567-e89b-12d3-a456-426614174000",
            reviewed_by="agent-reviewer-001"
        )
    """

    async def async_approve():
        try:
            # Validate inputs
            if not document_id:
                return "APPROVE_ERROR: document_id is required"

            if not reviewed_by:
                return "APPROVE_ERROR: reviewed_by is required"

            # Verify document exists
            check_result = (
                await supabase.table("application_documents")
                .select("id, document_type, application_id, review_status")
                .eq("id", document_id)
                .single()
                .execute()
            )

            if not check_result.data:
                return f"APPROVE_ERROR: Document {document_id} not found"

            document_data = check_result.data

            # Check if document was previously flagged
            was_flagged = document_data.get("review_status") == "flagged"

            # Update document with approved status
            # Note: Database trigger will automatically clear flag_reason, flagged_by, flagged_at
            # when transitioning from flagged/rejected to approved
            update_payload = {
                "review_status": "approved",
                "reviewed_by": reviewed_by,
                "reviewed_at": datetime.now().isoformat(),
            }

            update_result = (
                await supabase.table("application_documents")
                .update(update_payload)
                .eq("id", document_id)
                .execute()
            )

            if hasattr(update_result, "error") and update_result.error:
                return f"APPROVE_ERROR: Failed to update document - {update_result.error}"

            # Return success message
            status_note = " (previously flagged - now cleared)" if was_flagged else ""
            return (
                f"DOCUMENT_APPROVED: Successfully approved document {document_id} "
                f"(type: {document_data['document_type']}, "
                f"application: {document_data['application_id']}){status_note}"
            )

        except Exception as e:
            return f"APPROVE_ERROR: Unexpected error - {str(e)}"

    return asyncio.run(async_approve())


@audit_service_role_access(table="application_documents", operation="select")
@tool
def get_application_documents(application_id: str) -> str:
    """
    Retrieve all documents for an application with their review status.

    This tool fetches all uploaded documents for a given application,
    including their review status, flag reasons, and metadata.

    Args:
        application_id: UUID of the application

    Returns:
        Success: JSON string with array of documents and their review status
        Error: String starting with "GET_DOCS_ERROR:" followed by error details

    Example:
        result = get_application_documents(
            application_id="123e4567-e89b-12d3-a456-426614174000"
        )
    """

    async def async_get_docs():
        try:
            if not application_id:
                return "GET_DOCS_ERROR: application_id is required"

            # Fetch all documents for the application
            result = (
                await supabase.table("application_documents")
                .select(
                    "id, document_type, file_name, file_url, uploaded_at, "
                    "review_status, flag_reason, flagged_by, flagged_at, "
                    "reviewed_by, reviewed_at"
                )
                .eq("application_id", application_id)
                .order("uploaded_at", desc=False)
                .execute()
            )

            if hasattr(result, "error") and result.error:
                return f"GET_DOCS_ERROR: Failed to fetch documents - {result.error}"

            documents = result.data or []

            # Format response with review status summary
            flagged_count = sum(1 for doc in documents if doc.get("review_status") == "flagged")
            approved_count = sum(1 for doc in documents if doc.get("review_status") == "approved")
            pending_count = sum(1 for doc in documents if doc.get("review_status") == "pending")

            return str({
                "application_id": application_id,
                "total_documents": len(documents),
                "review_summary": {
                    "pending": pending_count,
                    "approved": approved_count,
                    "flagged": flagged_count,
                },
                "documents": documents,
            })

        except Exception as e:
            return f"GET_DOCS_ERROR: Unexpected error - {str(e)}"

    return asyncio.run(async_get_docs())
