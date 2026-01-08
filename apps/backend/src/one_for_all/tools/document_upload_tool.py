"""
Document Upload Tool

CrewAI tool for uploading documents to Supabase Storage and recording metadata.
Supports both application documents and NSFAS documents.
"""

import uuid
import asyncio
from datetime import datetime
from typing import Literal
from crewai.tools import tool
from .supabase_client import supabase


@tool
def upload_document(
    file_content: bytes,
    file_name: str,
    document_type: str,
    application_id: str,
    bucket: Literal["application-documents", "nsfas-documents"] = "application-documents",
) -> str:
    """
    Upload a document to Supabase Storage and record metadata in the database.

    This tool handles the complete document upload workflow:
    1. Validates file content is not empty
    2. Generates unique storage path
    3. Uploads file to Supabase Storage bucket
    4. Records metadata in application_documents or nsfas_documents table
    5. Returns the storage URL or error message

    Args:
        file_content: Raw file bytes (binary content)
        file_name: Original file name (e.g., "matric_certificate.pdf")
        document_type: Type of document (e.g., "id_document", "matric_certificate",
                      "proof_of_income", "consent_form", "payslip")
        application_id: UUID of the associated application or NSFAS application
        bucket: Storage bucket name - either "application-documents" or "nsfas-documents"
               (default: "application-documents")

    Returns:
        Success: JSON string with file_url, storage_path, and document_id
        Error: String starting with "UPLOAD_ERROR:" followed by error details

    Example:
        # Upload matric certificate for university application
        result = upload_document(
            file_content=pdf_bytes,
            file_name="matric_2023.pdf",
            document_type="matric_certificate",
            application_id="123e4567-e89b-12d3-a456-426614174000",
            bucket="application-documents"
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
            # Validate inputs
            if not file_content or len(file_content) == 0:
                return "UPLOAD_ERROR: file_content is empty"

            if not file_name:
                return "UPLOAD_ERROR: file_name is required"

            if not document_type:
                return "UPLOAD_ERROR: document_type is required"

            if not application_id:
                return "UPLOAD_ERROR: application_id is required"

            # Extract file extension
            ext = file_name.split(".")[-1].lower() if "." in file_name else "pdf"

            # Determine MIME type
            mime_type_map = {
                "pdf": "application/pdf",
                "jpg": "image/jpeg",
                "jpeg": "image/jpeg",
                "png": "image/png",
            }
            mime_type = mime_type_map.get(ext, "application/octet-stream")

            # Generate unique storage path: application_id/document_type/uuid.ext
            unique_id = str(uuid.uuid4())
            storage_path = f"{application_id}/{document_type}/{unique_id}.{ext}"

            # Upload to Supabase Storage
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

            # Get public/signed URL
            # Note: For private buckets, we use create_signed_url for temporary access
            try:
                if bucket == "application-documents":
                    # Create signed URL valid for 1 hour (3600 seconds)
                    signed_result = await supabase.storage.from_(bucket).create_signed_url(
                        path=storage_path,
                        expires_in=3600,
                    )
                    file_url = signed_result.get("signedURL") if signed_result else None
                elif bucket == "nsfas-documents":
                    # Create signed URL valid for 1 hour
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

            # Record metadata in database
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
            }

            try:
                db_result = await supabase.table(table_name).insert(document_metadata).execute()

                if hasattr(db_result, "error") and db_result.error:
                    # Clean up uploaded file if database insert fails
                    await supabase.storage.from_(bucket).remove([storage_path])
                    return f"UPLOAD_ERROR: Database insert failed - {db_result.error}"

                # Return success response
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
