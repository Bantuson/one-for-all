"""
Document Validator Tool

CrewAI tool for validating document uploads before processing.
Checks file size, format, and basic integrity using magic bytes.
Enhanced with deep MIME type detection via python-magic and SHA-256 file hashing.
"""

import hashlib
from typing import Dict, Any, Optional
from crewai.tools import tool

# python-magic for deep MIME type detection
try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False


def compute_file_hash(file_content: bytes) -> str:
    """
    Compute SHA-256 hash of file content.

    Args:
        file_content: Raw file bytes

    Returns:
        Hexadecimal string of SHA-256 hash
    """
    return hashlib.sha256(file_content).hexdigest()


def detect_mime_type(file_content: bytes) -> Optional[str]:
    """
    Detect MIME type using python-magic deep inspection.

    Args:
        file_content: Raw file bytes

    Returns:
        Detected MIME type string, or None if detection fails
    """
    if not MAGIC_AVAILABLE:
        return None

    try:
        detected_mime = magic.from_buffer(file_content, mime=True)
        return detected_mime
    except Exception:
        return None


# Mapping of allowed MIME types to extensions
ALLOWED_MIME_TYPES = {
    "application/pdf": ["pdf"],
    "image/jpeg": ["jpg", "jpeg"],
    "image/png": ["png"],
}

# Reverse mapping: extension to expected MIME types
EXTENSION_TO_MIME = {
    "pdf": ["application/pdf"],
    "jpg": ["image/jpeg"],
    "jpeg": ["image/jpeg"],
    "png": ["image/png"],
}


@tool
def validate_document_enhanced(
    file_content: bytes,
    file_name: str,
    claimed_mime_type: Optional[str] = None,
) -> str:
    """
    Enhanced document validation with deep MIME detection and file hashing.

    Performs comprehensive security validation:
    1. Checks file size is within 10MB limit
    2. Validates file extension is allowed (pdf, jpg, jpeg, png)
    3. Uses python-magic for deep MIME type detection (not trusting extension)
    4. Computes SHA-256 hash for integrity verification
    5. Compares detected MIME against claimed MIME and rejects if mismatch
    6. Verifies file integrity using magic bytes (file signatures)

    Args:
        file_content: Raw file bytes to validate
        file_name: Original file name with extension
        claimed_mime_type: Optional MIME type claimed by uploader (for validation)

    Returns:
        JSON string with validation result:
        {
            "status": "VALID" | "INVALID",
            "message": "Validation message",
            "file_hash": "SHA-256 hash (if valid)",
            "detected_mime_type": "Detected MIME type",
            "claimed_mime_type": "Claimed MIME type (if provided)"
        }

    Example:
        result = validate_document_enhanced(pdf_bytes, "cert.pdf", "application/pdf")
        # Returns JSON with status, hash, and detected MIME type
    """

    result = {
        "status": "INVALID",
        "message": "",
        "file_hash": None,
        "detected_mime_type": None,
        "claimed_mime_type": claimed_mime_type,
    }

    # ========================================================================
    # 1. Check file content exists
    # ========================================================================
    if not file_content:
        result["message"] = "File content is empty"
        return str(result)

    # ========================================================================
    # 2. Check file size (max 10MB)
    # ========================================================================
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB in bytes

    file_size = len(file_content)
    if file_size > MAX_FILE_SIZE:
        size_mb = file_size / (1024 * 1024)
        result["message"] = f"File exceeds 10MB limit (size: {size_mb:.2f}MB)"
        return str(result)

    if file_size == 0:
        result["message"] = "File is empty (0 bytes)"
        return str(result)

    # ========================================================================
    # 3. Validate file name and extension
    # ========================================================================
    ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png"]

    if not file_name or "." not in file_name:
        result["message"] = "File name must have an extension"
        return str(result)

    ext = file_name.split(".")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        result["message"] = (
            f"File type '.{ext}' not allowed. "
            f"Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
        return str(result)

    # Check for malicious filename patterns
    if "\x00" in file_name:
        result["message"] = "File name contains invalid characters (null bytes)"
        return str(result)

    if len(file_name) > 255:
        result["message"] = "File name is too long (max 255 characters)"
        return str(result)

    if ".." in file_name or "/" in file_name or "\\" in file_name:
        result["message"] = "File name contains invalid path characters"
        return str(result)

    # ========================================================================
    # 4. Deep MIME type detection via python-magic
    # ========================================================================
    detected_mime = detect_mime_type(file_content)
    result["detected_mime_type"] = detected_mime

    if detected_mime:
        # Verify detected MIME is in allowed list
        if detected_mime not in ALLOWED_MIME_TYPES:
            result["message"] = (
                f"Detected MIME type '{detected_mime}' is not allowed. "
                f"Allowed types: {', '.join(ALLOWED_MIME_TYPES.keys())}"
            )
            return str(result)

        # Verify detected MIME matches claimed extension
        expected_mimes = EXTENSION_TO_MIME.get(ext, [])
        if detected_mime not in expected_mimes:
            result["message"] = (
                f"MIME type mismatch: file extension is '.{ext}' but content is '{detected_mime}'. "
                "This may indicate file tampering."
            )
            return str(result)

        # Verify detected MIME matches claimed MIME (if provided)
        if claimed_mime_type and detected_mime != claimed_mime_type:
            result["message"] = (
                f"MIME type mismatch: claimed '{claimed_mime_type}' but detected '{detected_mime}'. "
                "This may indicate file tampering."
            )
            return str(result)

    # ========================================================================
    # 5. Fallback: Validate using magic bytes (file signatures)
    # ========================================================================
    # This provides a backup validation when python-magic is not available

    # PDF magic bytes: %PDF (hex: 25 50 44 46)
    if ext == "pdf":
        if not file_content.startswith(b"%PDF"):
            result["message"] = (
                "File is not a valid PDF. "
                "File extension is .pdf but content does not match PDF format"
            )
            return str(result)

        # Additional PDF validation: check for EOF marker
        if b"%%EOF" not in file_content[-1024:]:  # Check last 1KB
            result["message"] = (
                "PDF file appears to be corrupted or incomplete "
                "(missing EOF marker)"
            )
            return str(result)

    # JPEG magic bytes: FF D8 FF (start) and FF D9 (end)
    elif ext in ["jpg", "jpeg"]:
        if not file_content.startswith(b"\xff\xd8\xff"):
            result["message"] = (
                "File is not a valid JPEG. "
                "File extension is .jpg/.jpeg but content does not match JPEG format"
            )
            return str(result)

        # Check for JPEG end marker
        if not file_content.endswith(b"\xff\xd9"):
            result["message"] = (
                "JPEG file appears to be corrupted or incomplete "
                "(missing end marker)"
            )
            return str(result)

    # PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    elif ext == "png":
        png_signature = b"\x89PNG\r\n\x1a\n"
        if not file_content.startswith(png_signature):
            result["message"] = (
                "File is not a valid PNG. "
                "File extension is .png but content does not match PNG format"
            )
            return str(result)

        # Check for PNG end chunk (IEND)
        if b"IEND" not in file_content[-12:]:  # IEND should be in last 12 bytes
            result["message"] = (
                "PNG file appears to be corrupted or incomplete "
                "(missing IEND chunk)"
            )
            return str(result)

    # ========================================================================
    # 6. Compute SHA-256 hash for integrity verification
    # ========================================================================
    file_hash = compute_file_hash(file_content)
    result["file_hash"] = file_hash

    # ========================================================================
    # All checks passed
    # ========================================================================
    result["status"] = "VALID"
    result["message"] = "Document validation passed"

    return str(result)


@tool
def validate_document(file_content: bytes, file_name: str) -> str:
    """
    Validate document format, size, and basic integrity.

    Performs comprehensive validation on uploaded documents:
    1. Checks file size is within 10MB limit
    2. Validates file extension is allowed (pdf, jpg, jpeg, png)
    3. Verifies file integrity using magic bytes (file signatures)
    4. Ensures file content matches the declared extension

    Args:
        file_content: Raw file bytes to validate
        file_name: Original file name with extension

    Returns:
        "VALID" if all checks pass
        "INVALID: [reason]" if validation fails, with detailed error message

    Example:
        # Validate PDF document
        result = validate_document(pdf_bytes, "matric_certificate.pdf")
        # Returns: "VALID" or "INVALID: File exceeds 10MB limit"

        # Validate image
        result = validate_document(jpg_bytes, "id_photo.jpg")
        # Returns: "VALID" or "INVALID: File is not a valid JPEG"
    """

    # ========================================================================
    # 1. Check file size (max 10MB)
    # ========================================================================
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB in bytes

    if not file_content:
        return "INVALID: File content is empty"

    file_size = len(file_content)
    if file_size > MAX_FILE_SIZE:
        size_mb = file_size / (1024 * 1024)
        return f"INVALID: File exceeds 10MB limit (size: {size_mb:.2f}MB)"

    if file_size == 0:
        return "INVALID: File is empty (0 bytes)"

    # ========================================================================
    # 2. Check file extension
    # ========================================================================
    ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png"]

    if not file_name or "." not in file_name:
        return "INVALID: File name must have an extension"

    ext = file_name.split(".")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return (
            f"INVALID: File type '.{ext}' not allowed. "
            f"Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # ========================================================================
    # 3. Validate file integrity using magic bytes (file signatures)
    # ========================================================================

    # PDF magic bytes: %PDF (hex: 25 50 44 46)
    if ext == "pdf":
        if not file_content.startswith(b"%PDF"):
            return (
                "INVALID: File is not a valid PDF. "
                "File extension is .pdf but content does not match PDF format"
            )

        # Additional PDF validation: check for EOF marker
        if b"%%EOF" not in file_content[-1024:]:  # Check last 1KB
            return (
                "INVALID: PDF file appears to be corrupted or incomplete "
                "(missing EOF marker)"
            )

    # JPEG magic bytes: FF D8 FF (start) and FF D9 (end)
    elif ext in ["jpg", "jpeg"]:
        if not file_content.startswith(b"\xff\xd8\xff"):
            return (
                "INVALID: File is not a valid JPEG. "
                "File extension is .jpg/.jpeg but content does not match JPEG format"
            )

        # Check for JPEG end marker
        if not file_content.endswith(b"\xff\xd9"):
            return (
                "INVALID: JPEG file appears to be corrupted or incomplete "
                "(missing end marker)"
            )

    # PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    elif ext == "png":
        png_signature = b"\x89PNG\r\n\x1a\n"
        if not file_content.startswith(png_signature):
            return (
                "INVALID: File is not a valid PNG. "
                "File extension is .png but content does not match PNG format"
            )

        # Check for PNG end chunk (IEND)
        if b"IEND" not in file_content[-12:]:  # IEND should be in last 12 bytes
            return (
                "INVALID: PNG file appears to be corrupted or incomplete "
                "(missing IEND chunk)"
            )

    # ========================================================================
    # 4. Additional safety checks
    # ========================================================================

    # Check for potentially malicious null bytes in filename
    if "\x00" in file_name:
        return "INVALID: File name contains invalid characters (null bytes)"

    # Check filename length
    if len(file_name) > 255:
        return "INVALID: File name is too long (max 255 characters)"

    # Check for directory traversal attempts in filename
    if ".." in file_name or "/" in file_name or "\\" in file_name:
        return "INVALID: File name contains invalid path characters"

    # ========================================================================
    # All checks passed
    # ========================================================================
    return "VALID"


@tool
def get_document_type_requirements(document_type: str) -> str:
    """
    Get validation requirements for a specific document type.

    Provides detailed requirements and guidelines for different document types
    to help agents inform users about what's expected.

    Args:
        document_type: Type of document (e.g., "id_document", "matric_certificate",
                      "proof_of_income", "consent_form")

    Returns:
        JSON string with requirements including:
        - accepted_formats: List of allowed file formats
        - max_size_mb: Maximum file size in megabytes
        - description: What the document should contain
        - tips: Helpful tips for ensuring acceptance

    Example:
        requirements = get_document_type_requirements("matric_certificate")
        # Returns JSON with format requirements and tips
    """

    # Define requirements for each document type
    requirements_map: Dict[str, Dict[str, Any]] = {
        "id_document": {
            "accepted_formats": ["pdf", "jpg", "jpeg", "png"],
            "max_size_mb": 10,
            "description": "Valid South African ID document or passport",
            "tips": [
                "Ensure the entire ID is visible and legible",
                "All text must be clearly readable",
                "Avoid glare or shadows when photographing",
                "Both sides of ID required if applicable",
            ],
        },
        "matric_certificate": {
            "accepted_formats": ["pdf", "jpg", "jpeg", "png"],
            "max_size_mb": 10,
            "description": "National Senior Certificate (NSC) or equivalent",
            "tips": [
                "Must show all subject results",
                "Must include final percentage/symbol",
                "Original or certified copy preferred",
                "Ensure institution stamp/seal is visible",
            ],
        },
        "proof_of_residence": {
            "accepted_formats": ["pdf", "jpg", "jpeg", "png"],
            "max_size_mb": 10,
            "description": "Recent utility bill, bank statement, or lease agreement",
            "tips": [
                "Document must be dated within last 3 months",
                "Must clearly show full name and address",
                "Accepted: utility bills, bank statements, lease agreements",
            ],
        },
        "proof_of_income": {
            "accepted_formats": ["pdf", "jpg", "jpeg", "png"],
            "max_size_mb": 10,
            "description": "Recent payslip, bank statement, or income verification letter",
            "tips": [
                "Must be from last 3 months",
                "Must show gross monthly income",
                "For self-employed: bank statements or tax returns",
                "Ensure employer details are visible",
            ],
        },
        "consent_form": {
            "accepted_formats": ["pdf", "jpg", "jpeg", "png"],
            "max_size_mb": 10,
            "description": "Signed parental/guardian consent form (if applicable)",
            "tips": [
                "Must be signed by parent/legal guardian",
                "Must include guardian's ID number",
                "Ensure all required fields are completed",
            ],
        },
        "birth_certificate": {
            "accepted_formats": ["pdf", "jpg", "jpeg", "png"],
            "max_size_mb": 10,
            "description": "Certified copy of birth certificate",
            "tips": [
                "Must be a certified copy",
                "Ensure all details are clearly visible",
                "Certification stamp must be legible",
            ],
        },
        "academic_transcript": {
            "accepted_formats": ["pdf", "jpg", "jpeg", "png"],
            "max_size_mb": 10,
            "description": "Official academic transcript from previous institution",
            "tips": [
                "Must be official/certified copy",
                "Must show all completed courses and grades",
                "Institution seal/stamp must be visible",
            ],
        },
        "medical_certificate": {
            "accepted_formats": ["pdf", "jpg", "jpeg", "png"],
            "max_size_mb": 10,
            "description": "Medical certificate (if required by program)",
            "tips": [
                "Must be issued by registered medical practitioner",
                "Must be recent (within 6 months)",
                "Doctor's stamp and signature required",
            ],
        },
    }

    # Get requirements for the specified document type
    requirements = requirements_map.get(
        document_type,
        {
            "accepted_formats": ["pdf", "jpg", "jpeg", "png"],
            "max_size_mb": 10,
            "description": f"Required document: {document_type}",
            "tips": [
                "Ensure document is clear and legible",
                "All text must be readable",
                "Avoid glare, shadows, or blurriness",
            ],
        },
    )

    return str(requirements)


@tool
def validate_batch_documents(documents: list[dict]) -> str:
    """
    Validate multiple documents in a batch.

    Useful for validating all documents before starting the upload process.
    Helps agents provide comprehensive feedback to users upfront.

    Args:
        documents: List of dictionaries, each containing:
                  - file_content: bytes
                  - file_name: str
                  - document_type: str

    Returns:
        JSON string with validation results for each document:
        {
            "valid_count": int,
            "invalid_count": int,
            "results": [
                {
                    "file_name": str,
                    "document_type": str,
                    "status": "VALID" | "INVALID",
                    "message": str
                },
                ...
            ]
        }

    Example:
        results = validate_batch_documents([
            {
                "file_content": pdf_bytes,
                "file_name": "matric.pdf",
                "document_type": "matric_certificate"
            },
            {
                "file_content": jpg_bytes,
                "file_name": "id.jpg",
                "document_type": "id_document"
            }
        ])
    """

    results = []
    valid_count = 0
    invalid_count = 0

    for doc in documents:
        file_content = doc.get("file_content")
        file_name = doc.get("file_name", "unknown")
        document_type = doc.get("document_type", "unknown")

        # Validate the document
        validation_result = validate_document(file_content, file_name)

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
        }
    )
