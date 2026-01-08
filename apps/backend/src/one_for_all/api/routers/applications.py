"""
Applications Router

CRUD operations for university applications.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from ..dependencies import ApiKeyVerified, SupabaseClient
from ..schemas.application import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationStatusUpdate,
    DocumentCreate,
    DocumentResponse,
)

router = APIRouter(
    prefix="/api/v1/applications",
    tags=["applications"],
)

# Legacy router for CrewAI tools (without /v1 prefix)
legacy_router = APIRouter(
    prefix="/api/applications",
    tags=["applications-legacy"],
)


async def validate_session(supabase, session_token: str, applicant_id: str) -> bool:
    """Validate that session is valid and belongs to the applicant."""
    result = (
        supabase.table("applicant_sessions")
        .select("applicant_id, expires_at")
        .eq("session_token", session_token)
        .execute()
    )

    if not result.data:
        return False

    session = result.data[0]

    # Check expiry
    expires_at = datetime.fromisoformat(session["expires_at"].replace("Z", "+00:00"))
    if expires_at <= datetime.now(timezone.utc):
        return False

    # Check applicant ownership
    if session["applicant_id"] != applicant_id:
        return False

    return True


@router.post(
    "/",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_application(
    application: ApplicationCreate,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Create a new university application.

    Validates:
    - Session token is valid
    - Session belongs to the applicant
    - Applicant exists

    Used by submission_agent to record application submissions.
    """
    # Validate session
    if not await validate_session(
        supabase, application.session_token, str(application.applicant_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )

    # Build application data
    app_data = {
        "applicant_id": str(application.applicant_id),
        "university_name": application.university_name,
        "faculty": application.faculty,
        "qualification_type": application.qualification_type,
        "program": application.program,
        "year": application.year,
        "personal_info": application.personal_info,
        "academic_info": application.academic_info,
        "submission_payload": application.submission_payload,
        "status": "submitted",
    }

    # Add multi-tenant fields if provided
    if application.institution_id:
        app_data["institution_id"] = str(application.institution_id)
    if application.course_id:
        app_data["course_id"] = str(application.course_id)

    # Create application
    result = supabase.table("applications").insert(app_data).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create application",
        )

    return result.data[0]


@router.get("/{application_id}", response_model=ApplicationResponse)
async def get_application(
    application_id: str,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Get an application by ID.
    """
    result = (
        supabase.table("applications")
        .select("*")
        .eq("id", application_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application {application_id} not found",
        )

    return result.data[0]


@router.get("/", response_model=list[ApplicationResponse])
async def list_applications(
    supabase: SupabaseClient,
    _: ApiKeyVerified,
    applicant_id: Optional[str] = Query(None, description="Filter by applicant"),
    institution_id: Optional[str] = Query(None, description="Filter by institution"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    limit: int = Query(50, ge=1, le=100, description="Max results to return"),
):
    """
    List applications with optional filters.
    """
    query = supabase.table("applications").select("*")

    if applicant_id:
        query = query.eq("applicant_id", applicant_id)
    if institution_id:
        query = query.eq("institution_id", institution_id)
    if status_filter:
        query = query.eq("status", status_filter)

    result = query.limit(limit).order("created_at", desc=True).execute()

    return result.data or []


@router.patch("/{application_id}/status", response_model=ApplicationResponse)
async def update_application_status(
    application_id: str,
    status_update: ApplicationStatusUpdate,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Update an application's status.

    Used by institution reviewers to update application state.
    """
    # Verify application exists
    existing = (
        supabase.table("applications")
        .select("id")
        .eq("id", application_id)
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application {application_id} not found",
        )

    # Update status
    update_data = {"status": status_update.status}
    if status_update.notes:
        update_data["status_notes"] = status_update.notes

    result = (
        supabase.table("applications")
        .update(update_data)
        .eq("id", application_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update application status",
        )

    return result.data[0]


@router.post(
    "/{application_id}/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_document(
    application_id: str,
    document: DocumentCreate,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Attach a document to an application.
    """
    # Verify application exists
    existing = (
        supabase.table("applications")
        .select("id")
        .eq("id", application_id)
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application {application_id} not found",
        )

    # Create document
    result = (
        supabase.table("application_documents")
        .insert(
            {
                "application_id": application_id,
                "document_type": document.document_type,
                "file_url": document.file_url,
                "file_name": document.file_name,
            }
        )
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create document",
        )

    return result.data[0]


@router.get("/{application_id}/documents", response_model=list[DocumentResponse])
async def list_documents(
    application_id: str,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    List all documents for an application.
    """
    result = (
        supabase.table("application_documents")
        .select("*")
        .eq("application_id", application_id)
        .order("created_at", desc=True)
        .execute()
    )

    return result.data or []


# ============================================================================
# Legacy Endpoints for CrewAI Tools (without /v1 prefix)
# ============================================================================


@legacy_router.post("/submit", status_code=status.HTTP_201_CREATED)
async def submit_application(
    application: ApplicationCreate,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Submit a university application (legacy endpoint for CrewAI tools).

    This is an alias for POST /api/v1/applications/ to support existing
    CrewAI tool integrations that expect /api/applications/submit.

    Returns a simplified response with application ID and confirmation.
    """
    # Validate session
    if not await validate_session(
        supabase, application.session_token, str(application.applicant_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )

    # Build application data
    app_data = {
        "applicant_id": str(application.applicant_id),
        "university_name": application.university_name,
        "faculty": application.faculty,
        "qualification_type": application.qualification_type,
        "program": application.program,
        "year": application.year,
        "personal_info": application.personal_info,
        "academic_info": application.academic_info,
        "submission_payload": application.submission_payload,
        "status": "submitted",
    }

    # Add multi-tenant fields if provided
    if application.institution_id:
        app_data["institution_id"] = str(application.institution_id)
    if application.course_id:
        app_data["course_id"] = str(application.course_id)

    # Create application
    result = supabase.table("applications").insert(app_data).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create application",
        )

    app_record = result.data[0]

    # Generate confirmation message for CrewAI agents
    return {
        "success": True,
        "application_id": app_record["id"],
        "reference_number": f"APP-{app_record['id'][:8].upper()}",
        "status": app_record["status"],
        "university": app_record["university_name"],
        "message": f"Application submitted successfully to {app_record['university_name']}",
        "created_at": app_record["created_at"],
    }


@legacy_router.get("/status/{application_id}")
async def get_application_status(
    application_id: str,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Get application status (legacy endpoint for CrewAI tools).

    This is an alias for GET /api/v1/applications/{application_id} to support
    existing CrewAI tool integrations that expect /api/applications/status/{id}.

    Returns a simplified status response.
    """
    result = (
        supabase.table("applications")
        .select("id, status, university_name, program, created_at, updated_at, status_history")
        .eq("id", application_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application {application_id} not found",
        )

    app = result.data[0]

    return {
        "application_id": app["id"],
        "reference_number": f"APP-{app['id'][:8].upper()}",
        "status": app["status"],
        "university": app["university_name"],
        "program": app.get("program"),
        "submitted_at": app["created_at"],
        "last_updated": app.get("updated_at", app["created_at"]),
        "status_history": app.get("status_history", []),
    }
