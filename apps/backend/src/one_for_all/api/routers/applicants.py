"""
Applicants Router

CRUD operations for applicant accounts (WhatsApp/Twilio users).
All operations require API key authentication.
"""

from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status

from ..dependencies import ApiKeyVerified, SupabaseClient
from ..schemas.applicant import ApplicantCreate, ApplicantResponse

router = APIRouter(
    prefix="/api/v1/applicants",
    tags=["applicants"],
)


@router.post(
    "/",
    response_model=ApplicantResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_applicant(
    applicant: ApplicantCreate,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Create a new applicant account after OTP verification.

    Validates uniqueness of email and cellphone before creating.
    Used by identity_auth_agent after successful OTP verification.
    """
    # Check for existing email
    existing_email = (
        supabase.table("applicant_accounts")
        .select("id")
        .eq("email", applicant.email)
        .execute()
    )
    if existing_email.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email {applicant.email} already registered",
        )

    # Check for existing cellphone
    existing_phone = (
        supabase.table("applicant_accounts")
        .select("id")
        .eq("cellphone", applicant.cellphone)
        .execute()
    )
    if existing_phone.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Phone number {applicant.cellphone} already registered",
        )

    # Create applicant
    result = (
        supabase.table("applicant_accounts")
        .insert(
            {
                "username": applicant.username,
                "email": applicant.email,
                "cellphone": applicant.cellphone,
            }
        )
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create applicant",
        )

    return result.data[0]


@router.get("/lookup", response_model=Optional[ApplicantResponse])
async def lookup_applicant(
    supabase: SupabaseClient,
    _: ApiKeyVerified,
    email: Optional[str] = Query(None, description="Email to search for"),
    cellphone: Optional[str] = Query(None, description="Phone number to search for"),
):
    """
    Look up an applicant by email or cellphone.

    Used by identity_auth_agent to check for returning users.
    Returns None if no match found.
    """
    if not email and not cellphone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either email or cellphone must be provided",
        )

    query = supabase.table("applicant_accounts").select("*")

    if email and cellphone:
        # Match either
        result = query.or_(f"email.eq.{email},cellphone.eq.{cellphone}").execute()
    elif email:
        result = query.eq("email", email).execute()
    else:
        # Normalize phone number for lookup
        normalized_phone = cellphone
        if cellphone.startswith("0") and len(cellphone) == 10:
            normalized_phone = "+27" + cellphone[1:]
        result = query.eq("cellphone", normalized_phone).execute()

    if not result.data:
        return None

    return result.data[0]


@router.get("/{applicant_id}", response_model=ApplicantResponse)
async def get_applicant(
    applicant_id: str,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Get an applicant by ID.
    """
    result = (
        supabase.table("applicant_accounts")
        .select("*")
        .eq("id", applicant_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Applicant {applicant_id} not found",
        )

    return result.data[0]
