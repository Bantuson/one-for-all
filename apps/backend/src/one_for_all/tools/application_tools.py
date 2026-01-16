"""
Application API Tools

CrewAI tools for university application operations via the internal API.
Replaces direct Supabase access with validated API calls.
"""

from typing import Any, Optional

from crewai.tools import tool

from .api_client import api_get, api_patch, api_post


@tool
def create_application(
    applicant_id: str,
    session_token: str,
    university_name: str,
    personal_info: dict[str, Any],
    academic_info: dict[str, Any],
    faculty: Optional[str] = None,
    program: Optional[str] = None,
    qualification_type: Optional[str] = None,
    year: Optional[int] = None,
    submission_payload: Optional[dict[str, Any]] = None,
) -> str:
    """
    Create a new university application.

    This records the application submission in the database.
    The session_token must be valid and belong to the applicant.

    Args:
        applicant_id: UUID of the applicant
        session_token: Valid session token for authentication
        university_name: Name of the university (e.g., "University of Pretoria")
        personal_info: Personal information dictionary
        academic_info: Academic history dictionary
        faculty: Faculty/school name (optional)
        program: Program/course name (optional)
        qualification_type: Type of qualification (optional)
        year: Application year (optional)
        submission_payload: Raw payload sent to university API (optional)

    Returns:
        JSON string with created application data or error message

    Example:
        result = create_application(
            applicant_id="123e4567-e89b-12d3-a456-426614174000",
            session_token="abc123...",
            university_name="University of Pretoria",
            personal_info={"first_name": "John", "last_name": "Doe", ...},
            academic_info={"matric_year": 2024, "subjects": [...], ...},
            faculty="Engineering",
            program="Computer Science"
        )
    """
    data = {
        "applicant_id": applicant_id,
        "session_token": session_token,
        "university_name": university_name,
        "personal_info": personal_info,
        "academic_info": academic_info,
    }

    if faculty:
        data["faculty"] = faculty
    if program:
        data["program"] = program
    if qualification_type:
        data["qualification_type"] = qualification_type
    if year:
        data["year"] = year
    if submission_payload:
        data["submission_payload"] = submission_payload

    result = api_post("/api/v1/applications", data)

    if result.get("error"):
        return f"ERROR: {result.get('detail', 'Unknown error')}"

    return str(result)


@tool
def get_application(application_id: str) -> str:
    """
    Get an application by ID.

    Args:
        application_id: UUID of the application

    Returns:
        JSON string with application data or error message

    Example:
        result = get_application("123e4567-e89b-12d3-a456-426614174000")
    """
    result = api_get(f"/api/v1/applications/{application_id}")

    if result.get("not_found"):
        return f"ERROR: Application {application_id} not found"

    if result.get("error"):
        return f"ERROR: {result.get('detail', 'Unknown error')}"

    return str(result)


@tool
def list_applicant_applications(applicant_id: str) -> str:
    """
    List all applications for a specific applicant.

    Args:
        applicant_id: UUID of the applicant

    Returns:
        JSON string with list of applications or error message

    Example:
        result = list_applicant_applications("123e4567-e89b-12d3-a456-426614174000")
    """
    result = api_get("/api/v1/applications", params={"applicant_id": applicant_id})

    if result.get("error"):
        return f"ERROR: {result.get('detail', 'Unknown error')}"

    return str(result)


@tool
def update_application_status(
    application_id: str,
    status: str,
    notes: Optional[str] = None,
) -> str:
    """
    Update an application's status.

    Valid statuses: draft, submitted, under_review, accepted, rejected, waitlisted, withdrawn

    Args:
        application_id: UUID of the application
        status: New status value
        notes: Optional notes about the status change

    Returns:
        JSON string with updated application data or error message

    Example:
        result = update_application_status(
            application_id="123e4567-e89b-12d3-a456-426614174000",
            status="under_review",
            notes="Documents received and being processed"
        )
    """
    data = {"status": status}
    if notes:
        data["notes"] = notes

    result = api_patch(f"/api/v1/applications/{application_id}/status", data)

    if result.get("error"):
        return f"ERROR: {result.get('detail', 'Unknown error')}"

    return str(result)


@tool
def add_application_document(
    application_id: str,
    document_type: str,
    file_url: str,
    file_name: Optional[str] = None,
) -> str:
    """
    Attach a document to an application.

    Valid document types: id_document, passport, matric_certificate, transcript,
    proof_of_residence, motivation_letter, recommendation_letter, portfolio, other

    Args:
        application_id: UUID of the application
        document_type: Type of document
        file_url: URL where the document is stored
        file_name: Original filename (optional)

    Returns:
        JSON string with created document data or error message

    Example:
        result = add_application_document(
            application_id="123e4567-e89b-12d3-a456-426614174000",
            document_type="matric_certificate",
            file_url="https://storage.example.com/docs/matric.pdf",
            file_name="john_doe_matric.pdf"
        )
    """
    data = {
        "document_type": document_type,
        "file_url": file_url,
    }
    if file_name:
        data["file_name"] = file_name

    result = api_post(f"/api/v1/applications/{application_id}/documents", data)

    if result.get("error"):
        return f"ERROR: {result.get('detail', 'Unknown error')}"

    return str(result)


@tool
def add_application_note(
    application_id: str,
    note_text: str,
    note_type: str = "general",
    created_by: Optional[str] = None,
) -> str:
    """
    Add a note to an application for internal tracking and communication.

    This tool creates a note attached to an application, useful for recording
    review decisions, flagged document reasons, or general observations.

    Valid note types: general, review, document_flag, status_change, system

    Args:
        application_id: UUID of the application
        note_text: The content of the note
        note_type: Category of the note (default: "general")
        created_by: UUID or identifier of the user/agent creating the note (optional)

    Returns:
        JSON string with created note data or error message

    Example:
        result = add_application_note(
            application_id="123e4567-e89b-12d3-a456-426614174000",
            note_text="ID document flagged - image is blurry, applicant notified via WhatsApp",
            note_type="document_flag",
            created_by="document_reviewer_agent"
        )
    """
    data = {
        "note_text": note_text,
        "note_type": note_type,
    }
    if created_by:
        data["created_by"] = created_by

    result = api_post(f"/api/v1/applications/{application_id}/notes", data)

    if result.get("error"):
        return f"ERROR: {result.get('detail', 'Unknown error')}"

    return str(result)
