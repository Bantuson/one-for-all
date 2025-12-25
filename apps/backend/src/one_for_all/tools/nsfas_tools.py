"""
NSFAS API Tools

CrewAI tools for NSFAS application operations via the internal API.
Replaces direct Supabase access with validated API calls.
"""

from typing import Any, Optional

from crewai.tools import tool

from .api_client import api_get, api_post


@tool
def create_nsfas_application(
    applicant_id: str,
    session_token: str,
    personal_info: dict[str, Any],
    academic_info: dict[str, Any],
    guardian_info: dict[str, Any],
    household_info: dict[str, Any],
    income_info: dict[str, Any],
    bank_details: dict[str, Any],
    living_situation: Optional[dict[str, Any]] = None,
) -> str:
    """
    Create a new NSFAS (National Student Financial Aid Scheme) application.

    This records the NSFAS application with all required financial information.
    The session_token must be valid and belong to the applicant.

    IMPORTANT: bank_details must include bank_name, account_number, and account_type.

    Args:
        applicant_id: UUID of the applicant
        session_token: Valid session token for authentication
        personal_info: Personal information (can reuse from university application)
        academic_info: Academic history (can reuse from university application)
        guardian_info: Guardian/parent information
        household_info: Household composition and details
        income_info: Household income information
        bank_details: Bank account details for disbursement
        living_situation: Current living situation (optional)

    Returns:
        JSON string with created NSFAS application data or error message

    Example:
        result = create_nsfas_application(
            applicant_id="123e4567-e89b-12d3-a456-426614174000",
            session_token="abc123...",
            personal_info={"first_name": "John", ...},
            academic_info={"matric_year": 2024, ...},
            guardian_info={"name": "Jane Doe", "relationship": "Mother", ...},
            household_info={"members": 4, "dependents": 2, ...},
            income_info={"total_annual": 120000, "sources": [...], ...},
            bank_details={"bank_name": "FNB", "account_number": "123456789", "account_type": "savings"}
        )
    """
    data = {
        "applicant_id": applicant_id,
        "session_token": session_token,
        "personal_info": personal_info,
        "academic_info": academic_info,
        "guardian_info": guardian_info,
        "household_info": household_info,
        "income_info": income_info,
        "bank_details": bank_details,
    }

    if living_situation:
        data["living_situation"] = living_situation

    result = api_post("/api/v1/nsfas", data)

    if result.get("error"):
        return f"ERROR: {result.get('detail', 'Unknown error')}"

    return str(result)


@tool
def get_nsfas_application(nsfas_id: str) -> str:
    """
    Get an NSFAS application by ID.

    Note: Bank details are not returned for security reasons.

    Args:
        nsfas_id: UUID of the NSFAS application

    Returns:
        JSON string with NSFAS application data or error message

    Example:
        result = get_nsfas_application("123e4567-e89b-12d3-a456-426614174000")
    """
    result = api_get(f"/api/v1/nsfas/{nsfas_id}")

    if result.get("not_found"):
        return f"ERROR: NSFAS application {nsfas_id} not found"

    if result.get("error"):
        return f"ERROR: {result.get('detail', 'Unknown error')}"

    return str(result)


@tool
def list_applicant_nsfas_applications(applicant_id: str) -> str:
    """
    List all NSFAS applications for a specific applicant.

    Args:
        applicant_id: UUID of the applicant

    Returns:
        JSON string with list of NSFAS applications or error message

    Example:
        result = list_applicant_nsfas_applications("123e4567-e89b-12d3-a456-426614174000")
    """
    result = api_get("/api/v1/nsfas", params={"applicant_id": applicant_id})

    if result.get("error"):
        return f"ERROR: {result.get('detail', 'Unknown error')}"

    return str(result)


@tool
def add_nsfas_document(
    nsfas_id: str,
    document_type: str,
    file_url: str,
    file_name: Optional[str] = None,
) -> str:
    """
    Attach a document to an NSFAS application.

    Valid document types: id_document, proof_of_income, affidavit, death_certificate,
    disability_grant, sassa_letter, bank_statement, payslip, uif_document,
    proof_of_registration, consent_form, other

    Args:
        nsfas_id: UUID of the NSFAS application
        document_type: Type of NSFAS document
        file_url: URL where the document is stored
        file_name: Original filename (optional)

    Returns:
        JSON string with created document data or error message

    Example:
        result = add_nsfas_document(
            nsfas_id="123e4567-e89b-12d3-a456-426614174000",
            document_type="proof_of_income",
            file_url="https://storage.example.com/docs/income.pdf",
            file_name="household_income_proof.pdf"
        )
    """
    data = {
        "document_type": document_type,
        "file_url": file_url,
    }
    if file_name:
        data["file_name"] = file_name

    result = api_post(f"/api/v1/nsfas/{nsfas_id}/documents", data)

    if result.get("error"):
        return f"ERROR: {result.get('detail', 'Unknown error')}"

    return str(result)


@tool
def list_nsfas_documents(nsfas_id: str) -> str:
    """
    List all documents attached to an NSFAS application.

    Args:
        nsfas_id: UUID of the NSFAS application

    Returns:
        JSON string with list of documents or error message

    Example:
        result = list_nsfas_documents("123e4567-e89b-12d3-a456-426614174000")
    """
    result = api_get(f"/api/v1/nsfas/{nsfas_id}/documents")

    if result.get("error"):
        return f"ERROR: {result.get('detail', 'Unknown error')}"

    return str(result)
