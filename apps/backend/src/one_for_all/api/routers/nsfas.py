"""
NSFAS Router

CRUD operations for NSFAS (National Student Financial Aid Scheme) applications.
Contains sensitive financial information - all operations are logged.
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status

from ..dependencies import ApiKeyVerified, SupabaseClient
from ..schemas.nsfas import (
    NsfasApplicationCreate,
    NsfasApplicationResponse,
    NsfasDocumentCreate,
    NsfasDocumentResponse,
)

router = APIRouter(
    prefix="/api/v1/nsfas",
    tags=["nsfas"],
)

# Legacy router for CrewAI tools (without /v1 prefix)
legacy_router = APIRouter(
    prefix="/api/nsfas",
    tags=["nsfas-legacy"],
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
    response_model=NsfasApplicationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_nsfas_application(
    application: NsfasApplicationCreate,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Create a new NSFAS application.

    Validates:
    - Session token is valid
    - Session belongs to the applicant
    - Required financial information is provided

    Used by nsfas_agent to record NSFAS application submissions.
    """
    # Validate session
    if not await validate_session(
        supabase, application.session_token, str(application.applicant_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )

    # Build NSFAS application data
    nsfas_data = {
        "applicant_id": str(application.applicant_id),
        "personal_info": application.personal_info,
        "academic_info": application.academic_info,
        "guardian_info": application.guardian_info,
        "household_info": application.household_info,
        "income_info": application.income_info,
        "bank_details": application.bank_details,
        "living_situation": application.living_situation,
        "status": "submitted",
    }

    # Create application
    result = supabase.table("nsfas_applications").insert(nsfas_data).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create NSFAS application",
        )

    # Return without bank_details for security
    response_data = result.data[0].copy()
    response_data.pop("bank_details", None)

    return response_data


@router.get("/{nsfas_id}", response_model=NsfasApplicationResponse)
async def get_nsfas_application(
    nsfas_id: str,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Get an NSFAS application by ID.

    Note: bank_details are excluded from response for security.
    """
    result = (
        supabase.table("nsfas_applications")
        .select(
            "id, applicant_id, personal_info, academic_info, "
            "guardian_info, household_info, income_info, "
            "living_situation, status, created_at, updated_at"
        )
        .eq("id", nsfas_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"NSFAS application {nsfas_id} not found",
        )

    return result.data[0]


@router.get("/", response_model=list[NsfasApplicationResponse])
async def list_nsfas_applications(
    supabase: SupabaseClient,
    _: ApiKeyVerified,
    applicant_id: Optional[str] = Query(None, description="Filter by applicant"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    limit: int = Query(50, ge=1, le=100, description="Max results to return"),
):
    """
    List NSFAS applications with optional filters.

    Note: bank_details are excluded from response for security.
    """
    query = supabase.table("nsfas_applications").select(
        "id, applicant_id, personal_info, academic_info, "
        "guardian_info, household_info, income_info, "
        "living_situation, status, created_at, updated_at"
    )

    if applicant_id:
        query = query.eq("applicant_id", applicant_id)
    if status_filter:
        query = query.eq("status", status_filter)

    result = query.limit(limit).order("created_at", desc=True).execute()

    return result.data or []


@router.post(
    "/{nsfas_id}/documents",
    response_model=NsfasDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_nsfas_document(
    nsfas_id: str,
    document: NsfasDocumentCreate,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Attach a document to an NSFAS application.
    """
    # Verify NSFAS application exists
    existing = (
        supabase.table("nsfas_applications")
        .select("id")
        .eq("id", nsfas_id)
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"NSFAS application {nsfas_id} not found",
        )

    # Create document
    result = (
        supabase.table("nsfas_documents")
        .insert(
            {
                "nsfas_application_id": nsfas_id,
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
            detail="Failed to create NSFAS document",
        )

    return result.data[0]


@router.get("/{nsfas_id}/documents", response_model=list[NsfasDocumentResponse])
async def list_nsfas_documents(
    nsfas_id: str,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    List all documents for an NSFAS application.
    """
    result = (
        supabase.table("nsfas_documents")
        .select("*")
        .eq("nsfas_application_id", nsfas_id)
        .order("created_at", desc=True)
        .execute()
    )

    return result.data or []


# ============================================================================
# Legacy Endpoints for CrewAI Tools (without /v1 prefix)
# ============================================================================


@legacy_router.post("/submit", status_code=status.HTTP_201_CREATED)
async def submit_nsfas_application(
    application: NsfasApplicationCreate,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Submit an NSFAS application (legacy endpoint for CrewAI tools).

    This is an alias for POST /api/v1/nsfas/ to support existing
    CrewAI tool integrations that expect /api/nsfas/submit.

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

    # Build NSFAS application data
    nsfas_data = {
        "applicant_id": str(application.applicant_id),
        "personal_info": application.personal_info,
        "academic_info": application.academic_info,
        "guardian_info": application.guardian_info,
        "household_info": application.household_info,
        "income_info": application.income_info,
        "bank_details": application.bank_details,
        "living_situation": application.living_situation,
        "status": "submitted",
    }

    # Create application
    result = supabase.table("nsfas_applications").insert(nsfas_data).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create NSFAS application",
        )

    nsfas_record = result.data[0]

    # Generate confirmation message for CrewAI agents
    return {
        "success": True,
        "nsfas_application_id": nsfas_record["id"],
        "reference_number": f"NSFAS-{nsfas_record['id'][:8].upper()}",
        "status": nsfas_record["status"],
        "message": "NSFAS application submitted successfully",
        "created_at": nsfas_record["created_at"],
    }


@legacy_router.get("/status/{nsfas_id}")
async def get_nsfas_status(
    nsfas_id: str,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Get NSFAS application status (legacy endpoint for CrewAI tools).

    Returns a simplified status response.
    """
    result = (
        supabase.table("nsfas_applications")
        .select("id, status, created_at, updated_at, status_history")
        .eq("id", nsfas_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"NSFAS application {nsfas_id} not found",
        )

    nsfas = result.data[0]

    return {
        "nsfas_application_id": nsfas["id"],
        "reference_number": f"NSFAS-{nsfas['id'][:8].upper()}",
        "status": nsfas["status"],
        "submitted_at": nsfas["created_at"],
        "last_updated": nsfas.get("updated_at", nsfas["created_at"]),
        "status_history": nsfas.get("status_history", []),
    }
