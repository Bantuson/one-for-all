"""
One For All - CrewAI Tools

This module exports all custom tools for CrewAI agents.
Uses direct imports to ensure tool functions (not modules) are exported.

IMPORTANT: New tools use API wrappers instead of direct Supabase access.
Old supabase_* tools are deprecated and will be removed in a future version.
Prefer using the new API-based tools:
- store_applicant, lookup_applicant (replaces supabase_user_*)
- create_session, validate_session (replaces supabase_session_*)
- create_application (replaces supabase_application_store)
- query_rag, store_rag_embedding (replaces supabase_rag_*)
- create_nsfas_application (replaces supabase_nsfas_*)
"""

# =============================================================================
# DOCUMENT UPLOAD & VALIDATION TOOLS
# =============================================================================
from .document_upload_tool import upload_document, get_document_url
from .document_validator import (
    validate_document,
    get_document_type_requirements,
    validate_batch_documents,
)

# =============================================================================
# DOCUMENT REVIEW TOOLS
# =============================================================================
from .document_review_tools import (
    document_flag_tool,
    document_approve_tool,
    get_application_documents,
)

# =============================================================================
# OTP & MESSAGING TOOLS
# =============================================================================
from .sendgrid_otp_sender import sendgrid_otp_sender
from .sms_otp_sender import sms_otp_sender

# OTP Verification Tools
from .otp_verification import (
    verify_otp,
    check_otp_status,
    resend_otp_check,
)

# WhatsApp Tools
from .whatsapp_handler import (
    send_whatsapp_message,
    send_whatsapp_otp,
    log_whatsapp_interaction,
    send_whatsapp_template,
)

# =============================================================================
# STUDENT NUMBER TOOLS
# =============================================================================
from .student_number_tool import (
    generate_student_number,
    get_platform_student_number,
    get_institution_student_number,
    get_applicant_student_numbers,
    validate_student_number,
    assign_student_number_manually,
)

# =============================================================================
# COURSE VALIDATION TOOLS
# =============================================================================
from .course_validation_tool import (
    validate_course_for_submission,
    get_course_application_dates,
    validate_courses_batch,
    list_open_courses,
)

# =============================================================================
# APPLICATION CHOICES TOOLS
# =============================================================================
from .application_choices_tool import (
    create_application_choice,
    submit_application_with_choices,
    get_application_choices,
    update_choice_status,
)

# =============================================================================
# POLICY RAG TOOLS (Reviewer Assistant)
# =============================================================================
from .policy_rag import (
    search_policies,
    get_admission_criteria,
    search_similar_courses,
)

# =============================================================================
# COMPARATIVE ANALYSIS TOOLS (Reviewer Assistant)
# =============================================================================
from .comparative_analysis import (
    compare_applicant,
    get_application_summary,
    check_eligibility,
    get_missing_documents,
)

# =============================================================================
# EXTERNAL SUBMISSION TOOLS (No database access)
# =============================================================================
from .application_submission_tool import application_submission_tool
from .application_status_tool import application_status_tool
from .nsfas_application_submission_tool import nsfas_application_submission_tool
from .nsfas_status_tool import nsfas_status_tool
from .website_search_tool import website_search_tool

# =============================================================================
# DEPRECATED: Direct Supabase Tools (kept for backwards compatibility)
# These will be removed in a future version. Use API-based tools instead.
# =============================================================================
from .supabase_user_store import supabase_user_store
from .supabase_user_lookup import supabase_user_lookup
from .supabase_session_lookup import supabase_session_lookup
from .supabase_session_create import supabase_session_create
from .supabase_session_extend import supabase_session_extend
from .supabase_application_store import supabase_application_store
from .supabase_rag_store import supabase_rag_store
from .supabase_rag_query import supabase_rag_query
from .supabase_nsfas_store import supabase_nsfas_store
from .supabase_nsfas_documents_store import supabase_nsfas_documents_store


def __getattr__(name):
    """Lazy import for API-based tools to avoid loading all tools at once."""

    # =========================================================================
    # NEW API-BASED TOOLS (Preferred - use these instead of direct Supabase)
    # =========================================================================

    # Applicant Tools (replaces supabase_user_*)
    if name == "store_applicant":
        from .applicant_tools import store_applicant
        return store_applicant
    if name == "lookup_applicant":
        from .applicant_tools import lookup_applicant
        return lookup_applicant
    if name == "get_applicant":
        from .applicant_tools import get_applicant
        return get_applicant

    # Session Tools (replaces supabase_session_*)
    if name == "create_session":
        from .session_tools import create_session
        return create_session
    if name == "validate_session":
        from .session_tools import validate_session
        return validate_session
    if name == "extend_session":
        from .session_tools import extend_session
        return extend_session
    if name == "invalidate_session":
        from .session_tools import invalidate_session
        return invalidate_session

    # Application Tools (replaces supabase_application_store)
    if name == "create_application":
        from .application_tools import create_application
        return create_application
    if name == "get_application":
        from .application_tools import get_application
        return get_application
    if name == "list_applicant_applications":
        from .application_tools import list_applicant_applications
        return list_applicant_applications
    if name == "update_application_status":
        from .application_tools import update_application_status
        return update_application_status
    if name == "add_application_document":
        from .application_tools import add_application_document
        return add_application_document

    # RAG Tools (replaces supabase_rag_*)
    if name == "query_rag":
        from .rag_tools import query_rag
        return query_rag
    if name == "store_rag_embedding":
        from .rag_tools import store_rag_embedding
        return store_rag_embedding
    if name == "delete_rag_embeddings_by_source":
        from .rag_tools import delete_rag_embeddings_by_source
        return delete_rag_embeddings_by_source

    # NSFAS Tools (replaces supabase_nsfas_*)
    if name == "create_nsfas_application":
        from .nsfas_tools import create_nsfas_application
        return create_nsfas_application
    if name == "get_nsfas_application":
        from .nsfas_tools import get_nsfas_application
        return get_nsfas_application
    if name == "list_applicant_nsfas_applications":
        from .nsfas_tools import list_applicant_nsfas_applications
        return list_applicant_nsfas_applications
    if name == "add_nsfas_document":
        from .nsfas_tools import add_nsfas_document
        return add_nsfas_document
    if name == "list_nsfas_documents":
        from .nsfas_tools import list_nsfas_documents
        return list_nsfas_documents

    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = [
    # =========================================================================
    # DOCUMENT UPLOAD & VALIDATION TOOLS
    # =========================================================================
    "upload_document",
    "get_document_url",
    "validate_document",
    "get_document_type_requirements",
    "validate_batch_documents",
    # =========================================================================
    # DOCUMENT REVIEW TOOLS
    # =========================================================================
    "document_flag_tool",
    "document_approve_tool",
    "get_application_documents",
    # =========================================================================
    # NEW API-BASED TOOLS (Preferred)
    # =========================================================================
    # Applicant
    "store_applicant",
    "lookup_applicant",
    "get_applicant",
    # Session
    "create_session",
    "validate_session",
    "extend_session",
    "invalidate_session",
    # Application
    "create_application",
    "get_application",
    "list_applicant_applications",
    "update_application_status",
    "add_application_document",
    # RAG
    "query_rag",
    "store_rag_embedding",
    "delete_rag_embeddings_by_source",
    # NSFAS
    "create_nsfas_application",
    "get_nsfas_application",
    "list_applicant_nsfas_applications",
    "add_nsfas_document",
    "list_nsfas_documents",
    # =========================================================================
    # OTP & MESSAGING TOOLS
    # =========================================================================
    "sendgrid_otp_sender",
    "sms_otp_sender",
    # OTP Verification
    "verify_otp",
    "check_otp_status",
    "resend_otp_check",
    # WhatsApp
    "send_whatsapp_message",
    "send_whatsapp_otp",
    "log_whatsapp_interaction",
    "send_whatsapp_template",
    # =========================================================================
    # STUDENT NUMBER TOOLS
    # =========================================================================
    "generate_student_number",
    "get_platform_student_number",
    "get_institution_student_number",
    "get_applicant_student_numbers",
    "validate_student_number",
    "assign_student_number_manually",
    # =========================================================================
    # COURSE VALIDATION TOOLS
    # =========================================================================
    "validate_course_for_submission",
    "get_course_application_dates",
    "validate_courses_batch",
    "list_open_courses",
    # =========================================================================
    # APPLICATION CHOICES TOOLS
    # =========================================================================
    "create_application_choice",
    "submit_application_with_choices",
    "get_application_choices",
    "update_choice_status",
    # =========================================================================
    # POLICY RAG TOOLS (Reviewer Assistant)
    # =========================================================================
    "search_policies",
    "get_admission_criteria",
    "search_similar_courses",
    # =========================================================================
    # COMPARATIVE ANALYSIS TOOLS (Reviewer Assistant)
    # =========================================================================
    "compare_applicant",
    "get_application_summary",
    "check_eligibility",
    "get_missing_documents",
    # =========================================================================
    # EXTERNAL SUBMISSION TOOLS (No database access)
    # =========================================================================
    "application_submission_tool",
    "application_status_tool",
    "nsfas_application_submission_tool",
    "nsfas_status_tool",
    "website_search_tool",
    # =========================================================================
    # DEPRECATED (kept for backwards compatibility)
    # =========================================================================
    "supabase_user_store",
    "supabase_user_lookup",
    "supabase_session_lookup",
    "supabase_session_create",
    "supabase_session_extend",
    "supabase_application_store",
    "supabase_rag_store",
    "supabase_rag_query",
    "supabase_nsfas_store",
    "supabase_nsfas_documents_store",
]
