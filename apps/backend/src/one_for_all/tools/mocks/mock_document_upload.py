"""
Mock Document Upload Tool

Mock implementation of document upload and validation for testing purposes.
Simulates successful uploads without actually interacting with Supabase Storage.
"""

import uuid
from datetime import datetime
from typing import Literal
from crewai.tools import tool


@tool
def mock_upload_document(
    file_content: bytes,
    file_name: str,
    document_type: str,
    application_id: str,
    bucket: Literal["application-documents", "nsfas-documents"] = "application-documents",
) -> str:
    """
    Mock document upload - simulates successful upload without Supabase Storage.

    This tool is used in test/development mode to simulate document uploads
    without requiring actual Supabase Storage configuration.

    Args:
        file_content: Raw file bytes (binary content)
        file_name: Original file name (e.g., "matric_certificate.pdf")
        document_type: Type of document (e.g., "id_document", "matric_certificate")
        application_id: UUID of the associated application
        bucket: Storage bucket name

    Returns:
        JSON string with mock upload results

    Example:
        result = mock_upload_document(
            file_content=b"mock pdf content",
            file_name="matric.pdf",
            document_type="matric_certificate",
            application_id="123e4567-e89b-12d3-a456-426614174000"
        )
    """

    # Validate inputs (same as real tool)
    if not file_content or len(file_content) == 0:
        return "UPLOAD_ERROR: file_content is empty"

    if not file_name:
        return "UPLOAD_ERROR: file_name is required"

    if not document_type:
        return "UPLOAD_ERROR: document_type is required"

    if not application_id:
        return "UPLOAD_ERROR: application_id is required"

    # Generate mock data
    ext = file_name.split(".")[-1].lower() if "." in file_name else "pdf"
    unique_id = str(uuid.uuid4())
    storage_path = f"{application_id}/{document_type}/{unique_id}.{ext}"

    # Mock file URL (not a real URL)
    mock_url = f"https://mock-storage.supabase.co/{bucket}/{storage_path}"

    # Generate mock document ID
    mock_document_id = str(uuid.uuid4())

    # Determine MIME type
    mime_type_map = {
        "pdf": "application/pdf",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
    }
    mime_type = mime_type_map.get(ext, "application/octet-stream")

    # Return mock success response (same format as real tool)
    return str(
        {
            "success": True,
            "document_id": mock_document_id,
            "file_url": mock_url,
            "storage_path": storage_path,
            "file_name": file_name,
            "file_size": len(file_content),
            "mime_type": mime_type,
            "mock": True,  # Indicator this is a mock response
            "uploaded_at": datetime.now().isoformat(),
        }
    )


@tool
def mock_validate_document(file_content: bytes, file_name: str) -> str:
    """
    Mock document validation - performs basic validation without external dependencies.

    This is a lightweight version of the real validator for testing purposes.

    Args:
        file_content: Raw file bytes to validate
        file_name: Original file name with extension

    Returns:
        "VALID" if basic checks pass, "INVALID: [reason]" otherwise
    """

    # Check file size (max 10MB)
    MAX_FILE_SIZE = 10 * 1024 * 1024

    if not file_content:
        return "INVALID: File content is empty"

    if len(file_content) > MAX_FILE_SIZE:
        size_mb = len(file_content) / (1024 * 1024)
        return f"INVALID: File exceeds 10MB limit (size: {size_mb:.2f}MB)"

    if len(file_content) == 0:
        return "INVALID: File is empty (0 bytes)"

    # Check file extension
    ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png"]

    if not file_name or "." not in file_name:
        return "INVALID: File name must have an extension"

    ext = file_name.split(".")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return (
            f"INVALID: File type '.{ext}' not allowed. "
            f"Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Basic filename safety checks
    if "\x00" in file_name:
        return "INVALID: File name contains invalid characters (null bytes)"

    if len(file_name) > 255:
        return "INVALID: File name is too long (max 255 characters)"

    if ".." in file_name or "/" in file_name or "\\" in file_name:
        return "INVALID: File name contains invalid path characters"

    # All checks passed
    return "VALID"


@tool
def mock_get_document_url(
    document_id: str,
    bucket: Literal["application-documents", "nsfas-documents"] = "application-documents",
    expires_in: int = 3600,
) -> str:
    """
    Mock document URL retrieval - returns a mock signed URL.

    Args:
        document_id: UUID of the document
        bucket: Storage bucket name
        expires_in: URL expiration time in seconds

    Returns:
        Mock signed URL string
    """

    # Generate mock signed URL
    mock_url = f"https://mock-storage.supabase.co/{bucket}/signed/{document_id}?expires={expires_in}"

    return mock_url


@tool
def mock_validate_batch_documents(documents: list[dict]) -> str:
    """
    Mock batch validation - validates multiple documents at once.

    Args:
        documents: List of dictionaries with file_content, file_name, document_type

    Returns:
        JSON string with validation results
    """

    results = []
    valid_count = 0
    invalid_count = 0

    for doc in documents:
        file_content = doc.get("file_content")
        file_name = doc.get("file_name", "unknown")
        document_type = doc.get("document_type", "unknown")

        # Validate using mock validator
        validation_result = mock_validate_document(file_content, file_name)

        is_valid = validation_result == "VALID"
        if is_valid:
            valid_count += 1
        else:
            invalid_count += 1

        results.append(
            {
                "file_name": file_name,
                "document_type": document_type,
                "status": "VALID" if is_valid else "INVALID",
                "message": validation_result,
            }
        )

    return str(
        {
            "valid_count": valid_count,
            "invalid_count": invalid_count,
            "total_count": len(documents),
            "results": results,
            "mock": True,
        }
    )
