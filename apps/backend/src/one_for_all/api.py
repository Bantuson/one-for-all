"""
FastAPI server for Scanner Crew API.

Exposes the CrewAI scanner agents via HTTP with CORS support
for integration with the Next.js dashboard.

Run with:
    uvicorn src.one_for_all.api:app --reload --host 0.0.0.0 --port 8000
"""

import os
import logging
from typing import List, Dict, Any, Literal
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from .scanner_crew import analyze_scraped_pages
from .observability import setup_observability, get_phoenix_url
from .tools.document_upload_tool import upload_document
from .tools.document_validator import validate_document

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize observability (Phoenix tracing)
logger.info("Initializing Phoenix observability...")
setup_observability()

app = FastAPI(
    title="OneForAll Scanner API",
    description="AI-powered academic website scanner using CrewAI agents",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration - allow frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
    ],
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)


# ============================================================================
# Request/Response Models
# ============================================================================

class ScrapedPage(BaseModel):
    """A single scraped page from the website."""
    url: str
    html: str


class ScanRequest(BaseModel):
    """Request to analyze scraped pages."""
    institution_id: str
    website_url: str
    pages: List[ScrapedPage]


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    phoenix_url: str | None
    deepseek_configured: bool


class DocumentUploadResponse(BaseModel):
    """Document upload response."""
    success: bool
    message: str
    document_id: str | None = None
    file_url: str | None = None
    storage_path: str | None = None
    file_size: int | None = None


class ValidationResponse(BaseModel):
    """Document validation response."""
    valid: bool
    message: str


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.

    Returns status and Phoenix UI URL if available.
    """
    deepseek_key = os.getenv("DEEPSEEK_API_KEY")
    return HealthResponse(
        status="healthy",
        phoenix_url=get_phoenix_url(),
        deepseek_configured=bool(deepseek_key and len(deepseek_key) > 10),
    )


@app.post("/api/v1/analyze")
async def analyze_pages(request: ScanRequest) -> Dict[str, Any]:
    """
    Analyze scraped pages and extract academic data.

    Uses CrewAI agents with DeepSeek LLM to:
    1. Classify page types (campus, faculty, course)
    2. Extract structured data from each page
    3. Build hierarchical institution structure

    Args:
        request: ScanRequest with institution_id, website_url, and pages

    Returns:
        Structured results with campuses, faculties, courses, and errors
    """
    logger.info(f"Received scan request for {request.website_url}")
    logger.info(f"Processing {len(request.pages)} pages for institution {request.institution_id}")

    try:
        # Convert Pydantic models to dicts for scanner_crew
        pages = [{"url": p.url, "html": p.html} for p in request.pages]

        # Run CrewAI analysis
        results = analyze_scraped_pages(
            pages=pages,
            institution_id=request.institution_id,
            website_url=request.website_url,
        )

        logger.info(f"Analysis complete: {len(results.get('campuses', []))} campuses found")
        return results

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "OneForAll Scanner API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.post("/api/v1/documents/upload", response_model=DocumentUploadResponse)
async def upload_document_endpoint(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    application_id: str = Form(...),
    bucket: Literal["application-documents", "nsfas-documents"] = Form("application-documents"),
):
    """
    Upload a document to Supabase Storage.

    This endpoint handles document uploads for both university applications
    and NSFAS applications. It validates the document, uploads it to the
    appropriate storage bucket, and records metadata in the database.

    Args:
        file: The file to upload (multipart/form-data)
        document_type: Type of document (e.g., "id_document", "matric_certificate")
        application_id: UUID of the application or NSFAS application
        bucket: Storage bucket - "application-documents" or "nsfas-documents"

    Returns:
        DocumentUploadResponse with upload results

    Example:
        curl -X POST "http://localhost:8000/api/v1/documents/upload" \\
             -F "file=@matric.pdf" \\
             -F "document_type=matric_certificate" \\
             -F "application_id=123e4567-e89b-12d3-a456-426614174000" \\
             -F "bucket=application-documents"
    """
    logger.info(f"Received document upload: {file.filename} (type: {document_type})")

    try:
        # Read file content
        file_content = await file.read()
        file_name = file.filename or "unknown"

        # Validate document first
        validation_result = validate_document(file_content, file_name)

        if validation_result != "VALID":
            logger.warning(f"Document validation failed: {validation_result}")
            return DocumentUploadResponse(
                success=False,
                message=validation_result,
            )

        # Upload document
        upload_result = upload_document(
            file_content=file_content,
            file_name=file_name,
            document_type=document_type,
            application_id=application_id,
            bucket=bucket,
        )

        # Parse upload result
        if upload_result.startswith("UPLOAD_ERROR:"):
            logger.error(f"Upload failed: {upload_result}")
            return DocumentUploadResponse(
                success=False,
                message=upload_result,
            )

        # Parse success response (convert string dict to actual dict)
        import ast

        result_dict = ast.literal_eval(upload_result)

        logger.info(f"Document uploaded successfully: {result_dict.get('document_id')}")

        return DocumentUploadResponse(
            success=True,
            message="Document uploaded successfully",
            document_id=result_dict.get("document_id"),
            file_url=result_dict.get("file_url"),
            storage_path=result_dict.get("storage_path"),
            file_size=result_dict.get("file_size"),
        )

    except Exception as e:
        logger.error(f"Document upload error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/documents/validate", response_model=ValidationResponse)
async def validate_document_endpoint(
    file: UploadFile = File(...),
):
    """
    Validate a document without uploading it.

    This endpoint allows clients to validate documents before uploading
    to provide immediate feedback to users.

    Args:
        file: The file to validate (multipart/form-data)

    Returns:
        ValidationResponse with validation results

    Example:
        curl -X POST "http://localhost:8000/api/v1/documents/validate" \\
             -F "file=@document.pdf"
    """
    try:
        # Read file content
        file_content = await file.read()
        file_name = file.filename or "unknown"

        # Validate document
        validation_result = validate_document(file_content, file_name)

        is_valid = validation_result == "VALID"

        return ValidationResponse(
            valid=is_valid,
            message=validation_result,
        )

    except Exception as e:
        logger.error(f"Document validation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "src.one_for_all.api:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info",
    )
