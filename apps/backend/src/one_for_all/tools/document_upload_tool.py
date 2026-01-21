"""
Document Upload Tool

CrewAI tool for uploading documents to Supabase Storage and recording metadata.
Supports both application documents and NSFAS documents.
Enhanced with per-session rate limiting and security field storage.
"""

import uuid
import asyncio
import threading
from datetime import datetime, timedelta
from typing import Literal, Dict, Optional
from crewai.tools import tool
from .supabase_client import supabase
from ..utils.db_audit import audit_service_role_access
from .document_validator import compute_file_hash, detect_mime_type


# ============================================================================
# Rate Limiting Implementation
# ============================================================================

class UploadRateLimiter:
    """
    Thread-safe in-memory rate limiter for document uploads.

    Limits uploads per session to prevent abuse:
    - 20 uploads per hour per session
    - Automatically cleans up expired entries
    """

    def __init__(self, max_uploads: int = 20, window_hours: int = 1):
        self.max_uploads = max_uploads
        self.window_seconds = window_hours * 3600
        self._lock = threading.Lock()
        # Structure: {session_id: [(timestamp1, count1), (timestamp2, count2), ...]}
        self._upload_counts: Dict[str, list] = {}

    def _cleanup_expired(self, session_id: str) -> None:
        """Remove expired entries for a session."""
        if session_id not in self._upload_counts:
            return

        cutoff = datetime.now() - timedelta(seconds=self.window_seconds)
        self._upload_counts[session_id] = [
            entry for entry in self._upload_counts[session_id]
            if entry[0] > cutoff
        ]

        # Remove session if no entries remain
        if not self._upload_counts[session_id]:
            del self._upload_counts[session_id]

    def get_upload_count(self, session_id: str) -> int:
        """Get current upload count for a session within the time window."""
        with self._lock:
            self._cleanup_expired(session_id)
            if session_id not in self._upload_counts:
                return 0
            return sum(entry[1] for entry in self._upload_counts[session_id])

    def check_rate_limit(self, session_id: str) -> tuple[bool, int]:
        """
        Check if upload is allowed for the session.

        Returns:
            Tuple of (is_allowed, remaining_uploads)
        """
        with self._lock:
            self._cleanup_expired(session_id)
            current_count = self.get_upload_count(session_id)
            remaining = self.max_uploads - current_count
            return (remaining > 0, max(0, remaining))

    def record_upload(self, session_id: str) -> bool:
        """
        Record an upload for the session.

        Returns:
            True if upload was recorded (within limit), False if rate limit exceeded
        """
        with self._lock:
            self._cleanup_expired(session_id)

            current_count = 0
            if session_id in self._upload_counts:
                current_count = sum(entry[1] for entry in self._upload_counts[session_id])

            if current_count >= self.max_uploads:
                return False

            # Record the upload
            if session_id not in self._upload_counts:
                self._upload_counts[session_id] = []

            self._upload_counts[session_id].append((datetime.now(), 1))
            return True

    def get_reset_time(self, session_id: str) -> Optional[datetime]:
        """Get when the oldest entry will expire for the session."""
        with self._lock:
            if session_id not in self._upload_counts or not self._upload_counts[session_id]:
                return None

            oldest = min(entry[0] for entry in self._upload_counts[session_id])
            return oldest + timedelta(seconds=self.window_seconds)


# Global rate limiter instance
_upload_rate_limiter = UploadRateLimiter(max_uploads=20, window_hours=1)


@audit_service_role_access(table="application_documents", operation="insert")
@tool
def upload_document(
    file_content: bytes,
    file_name: str,
    document_type: str,
    application_id: str,
    bucket: Literal["application-documents", "nsfas-documents"] = "application-documents",
    session_id: Optional[str] = None,
    upload_ip_address: Optional[str] = None,
) -> str:
    """
    Upload a document to Supabase Storage and record metadata in the database.

    This tool handles the complete document upload workflow:
    1. Checks per-session rate limit (20 uploads/hour)
    2. Validates file content is not empty
    3. Computes SHA-256 file hash and detects MIME type
    4. Generates unique storage path
    5. Uploads file to Supabase Storage bucket
    6. Records metadata with security fields in database
    7. Returns the storage URL or error message

    Args:
        file_content: Raw file bytes (binary content)
        file_name: Original file name (e.g., "matric_certificate.pdf")
        document_type: Type of document (e.g., "id_document", "matric_certificate",
                      "proof_of_income", "consent_form", "payslip")
        application_id: UUID of the associated application or NSFAS application
        bucket: Storage bucket name - either "application-documents" or "nsfas-documents"
               (default: "application-documents")
        session_id: Optional session ID for rate limiting (uses application_id if not provided)
        upload_ip_address: Optional IP address of uploader for security audit

    Returns:
        Success: JSON string with file_url, storage_path, document_id, file_hash, and detected_mime_type
        Error: String starting with "UPLOAD_ERROR:" or "RATE_LIMIT_ERROR:" followed by error details

    Example:
        # Upload matric certificate for university application
        result = upload_document(
            file_content=pdf_bytes,
            file_name="matric_2023.pdf",
            document_type="matric_certificate",
            application_id="123e4567-e89b-12d3-a456-426614174000",
            bucket="application-documents",
            session_id="session-abc-123",
            upload_ip_address="192.168.1.1"
        )

        # Upload proof of income for NSFAS application
        result = upload_document(
            file_content=image_bytes,
            file_name="payslip_june.jpg",
            document_type="proof_of_income",
            application_id="987fcdeb-51a2-43f7-9d0e-123456789abc",
            bucket="nsfas-documents"
        )
    """

    async def async_upload():
        try:
            # ================================================================
            # 1. Rate limiting check
            # ================================================================
            rate_limit_key = session_id or application_id
            if rate_limit_key:
                is_allowed, remaining = _upload_rate_limiter.check_rate_limit(rate_limit_key)
                if not is_allowed:
                    reset_time = _upload_rate_limiter.get_reset_time(rate_limit_key)
                    reset_str = reset_time.isoformat() if reset_time else "unknown"
                    return (
                        f"RATE_LIMIT_ERROR: Upload rate limit exceeded. "
                        f"Maximum 20 uploads per hour. "
                        f"Rate limit resets at: {reset_str}"
                    )

            # ================================================================
            # 2. Validate inputs
            # ================================================================
            if not file_content or len(file_content) == 0:
                return "UPLOAD_ERROR: file_content is empty"

            if not file_name:
                return "UPLOAD_ERROR: file_name is required"

            if not document_type:
                return "UPLOAD_ERROR: document_type is required"

            if not application_id:
                return "UPLOAD_ERROR: application_id is required"

            # ================================================================
            # 3. Compute security fields: file hash and detected MIME type
            # ================================================================
            file_hash = compute_file_hash(file_content)
            detected_mime_type = detect_mime_type(file_content)

            # Extract file extension
            ext = file_name.split(".")[-1].lower() if "." in file_name else "pdf"

            # Determine claimed MIME type from extension
            mime_type_map = {
                "pdf": "application/pdf",
                "jpg": "image/jpeg",
                "jpeg": "image/jpeg",
                "png": "image/png",
            }
            claimed_mime_type = mime_type_map.get(ext, "application/octet-stream")

            # If we detected a MIME type, validate it matches the extension
            if detected_mime_type and detected_mime_type != claimed_mime_type:
                # Allow image/jpeg for both jpg and jpeg extensions
                if not (detected_mime_type == "image/jpeg" and ext in ["jpg", "jpeg"]):
                    return (
                        f"UPLOAD_ERROR: MIME type mismatch detected. "
                        f"File extension is '.{ext}' but content is '{detected_mime_type}'. "
                        "This may indicate file tampering or corruption."
                    )

            # Use detected MIME type if available, otherwise use claimed
            mime_type = detected_mime_type or claimed_mime_type

            # ================================================================
            # 4. Generate unique storage path
            # ================================================================
            unique_id = str(uuid.uuid4())
            storage_path = f"{application_id}/{document_type}/{unique_id}.{ext}"

            # ================================================================
            # 5. Upload to Supabase Storage
            # ================================================================
            try:
                upload_result = await supabase.storage.from_(bucket).upload(
                    path=storage_path,
                    file=file_content,
                    file_options={"content-type": mime_type},
                )

                # Check for upload errors
                if hasattr(upload_result, "error") and upload_result.error:
                    return f"UPLOAD_ERROR: Storage upload failed - {upload_result.error}"

            except Exception as upload_error:
                return f"UPLOAD_ERROR: Storage upload exception - {str(upload_error)}"

            # ================================================================
            # 6. Generate signed URL
            # ================================================================
            try:
                if bucket in ["application-documents", "nsfas-documents"]:
                    # Create signed URL valid for 1 hour (3600 seconds)
                    signed_result = await supabase.storage.from_(bucket).create_signed_url(
                        path=storage_path,
                        expires_in=3600,
                    )
                    file_url = signed_result.get("signedURL") if signed_result else None
                else:
                    # Fallback to public URL
                    file_url = supabase.storage.from_(bucket).get_public_url(storage_path)

                if not file_url:
                    return "UPLOAD_ERROR: Failed to generate file URL"

            except Exception as url_error:
                return f"UPLOAD_ERROR: URL generation failed - {str(url_error)}"

            # ================================================================
            # 7. Record metadata in database with security fields
            # ================================================================
            table_name = (
                "application_documents"
                if bucket == "application-documents"
                else "nsfas_documents"
            )
            foreign_key = (
                "application_id"
                if bucket == "application-documents"
                else "nsfas_application_id"
            )

            document_metadata = {
                foreign_key: application_id,
                "document_type": document_type,
                "file_url": file_url,
                "file_name": file_name,
                "storage_path": storage_path,
                "file_size": len(file_content),
                "mime_type": mime_type,
                "uploaded_at": datetime.now().isoformat(),
                # Security fields (H5 enhancement)
                "file_hash": file_hash,
                "detected_mime_type": detected_mime_type,
                "scan_status": "pending",  # Will be updated by antivirus scanner
            }

            # Add IP address if provided
            if upload_ip_address:
                document_metadata["upload_ip_address"] = upload_ip_address

            try:
                db_result = await supabase.table(table_name).insert(document_metadata).execute()

                if hasattr(db_result, "error") and db_result.error:
                    # Clean up uploaded file if database insert fails
                    await supabase.storage.from_(bucket).remove([storage_path])
                    return f"UPLOAD_ERROR: Database insert failed - {db_result.error}"

                # Record successful upload for rate limiting
                if rate_limit_key:
                    _upload_rate_limiter.record_upload(rate_limit_key)

                # Return success response with security fields
                document_data = db_result.data[0] if db_result.data else {}
                return str(
                    {
                        "success": True,
                        "document_id": document_data.get("id"),
                        "file_url": file_url,
                        "storage_path": storage_path,
                        "file_name": file_name,
                        "file_size": len(file_content),
                        "mime_type": mime_type,
                        "file_hash": file_hash,
                        "detected_mime_type": detected_mime_type,
                        "scan_status": "pending",
                    }
                )

            except Exception as db_error:
                # Clean up uploaded file if database operation fails
                try:
                    await supabase.storage.from_(bucket).remove([storage_path])
                except:
                    pass  # Best effort cleanup
                return f"UPLOAD_ERROR: Database exception - {str(db_error)}"

        except Exception as e:
            return f"UPLOAD_ERROR: Unexpected error - {str(e)}"

    return asyncio.run(async_upload())


@tool
def check_upload_rate_limit(session_id: str) -> str:
    """
    Check the current upload rate limit status for a session.

    Useful for informing users about their remaining upload quota
    before they attempt to upload documents.

    Args:
        session_id: Session identifier (can be user session or application ID)

    Returns:
        JSON string with rate limit status:
        {
            "is_allowed": True/False,
            "remaining_uploads": number,
            "max_uploads": 20,
            "window_hours": 1,
            "reset_time": ISO timestamp (if applicable)
        }

    Example:
        status = check_upload_rate_limit("session-abc-123")
        # Returns: {"is_allowed": True, "remaining_uploads": 15, ...}
    """
    is_allowed, remaining = _upload_rate_limiter.check_rate_limit(session_id)
    reset_time = _upload_rate_limiter.get_reset_time(session_id)

    result = {
        "is_allowed": is_allowed,
        "remaining_uploads": remaining,
        "max_uploads": _upload_rate_limiter.max_uploads,
        "window_hours": _upload_rate_limiter.window_seconds // 3600,
        "reset_time": reset_time.isoformat() if reset_time else None,
    }

    return str(result)


@audit_service_role_access(table="application_documents", operation="select")
@tool
def get_document_url(
    document_id: str,
    bucket: Literal["application-documents", "nsfas-documents"] = "application-documents",
    expires_in: int = 3600,
) -> str:
    """
    Get a signed URL for accessing a document.

    Generates a temporary signed URL for secure document access.
    Useful for refreshing expired URLs or accessing documents after upload.

    Args:
        document_id: UUID of the document in application_documents or nsfas_documents table
        bucket: Storage bucket name - either "application-documents" or "nsfas-documents"
        expires_in: URL expiration time in seconds (default: 3600 = 1 hour)

    Returns:
        Signed URL string or error message starting with "ERROR:"

    Example:
        url = get_document_url(
            document_id="abc-123-def-456",
            bucket="application-documents",
            expires_in=7200  # 2 hours
        )
    """

    async def async_get_url():
        try:
            # Determine table name
            table_name = (
                "application_documents"
                if bucket == "application-documents"
                else "nsfas_documents"
            )

            # Fetch document metadata
            result = (
                await supabase.table(table_name)
                .select("storage_path")
                .eq("id", document_id)
                .single()
                .execute()
            )

            if not result.data:
                return f"ERROR: Document {document_id} not found"

            storage_path = result.data.get("storage_path")
            if not storage_path:
                return "ERROR: Document has no storage path"

            # Generate signed URL
            signed_result = await supabase.storage.from_(bucket).create_signed_url(
                path=storage_path,
                expires_in=expires_in,
            )

            if not signed_result or not signed_result.get("signedURL"):
                return "ERROR: Failed to generate signed URL"

            return signed_result["signedURL"]

        except Exception as e:
            return f"ERROR: {str(e)}"

    return asyncio.run(async_get_url())
