"""
One For All - CrewAI Tools

This module exports all custom tools for CrewAI agents.
Uses lazy imports to avoid loading all tools at module import time.

IMPORTANT: New tools use API wrappers instead of direct Supabase access.
Old supabase_* tools are deprecated and will be removed in a future version.
Prefer using the new API-based tools:
- store_applicant, lookup_applicant (replaces supabase_user_*)
- create_session, validate_session (replaces supabase_session_*)
- create_application (replaces supabase_application_store)
- query_rag, store_rag_embedding (replaces supabase_rag_*)
- create_nsfas_application (replaces supabase_nsfas_*)
"""

# Scanner Tools are imported eagerly as they're most commonly used
from .html_parser_tool import html_parser_tool
from .content_classifier_tool import content_classifier_tool, extract_academic_entities
from .data_normalizer_tool import data_normalizer_tool


def __getattr__(name):
    """Lazy import for other tools to avoid loading all tools at once."""

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

    # =========================================================================
    # OTP TOOLS (Still direct - no database access)
    # =========================================================================
    if name == "sendgrid_otp_sender":
        from .sendgrid_otp_sender import sendgrid_otp_sender
        return sendgrid_otp_sender
    if name == "sms_otp_sender":
        from .sms_otp_sender import sms_otp_sender
        return sms_otp_sender

    # =========================================================================
    # EXTERNAL SUBMISSION TOOLS (Still direct - no database access)
    # =========================================================================
    if name == "application_submission_tool":
        from .application_submission_tool import application_submission_tool
        return application_submission_tool
    if name == "application_status_tool":
        from .application_status_tool import application_status_tool
        return application_status_tool
    if name == "nsfas_application_submission_tool":
        from .nsfas_application_submission_tool import nsfas_application_submission_tool
        return nsfas_application_submission_tool
    if name == "nsfas_status_tool":
        from .nsfas_status_tool import nsfas_status_tool
        return nsfas_status_tool
    if name == "website_search_tool":
        from .website_search_tool import website_search_tool
        return website_search_tool

    # =========================================================================
    # DEPRECATED: Direct Supabase Tools (kept for backwards compatibility)
    # These will be removed in a future version. Use API-based tools instead.
    # =========================================================================
    if name == "supabase_user_store":
        import warnings
        warnings.warn(
            "supabase_user_store is deprecated. Use store_applicant instead.",
            DeprecationWarning,
            stacklevel=2
        )
        from .supabase_user_store import supabase_user_store
        return supabase_user_store
    if name == "supabase_user_lookup":
        import warnings
        warnings.warn(
            "supabase_user_lookup is deprecated. Use lookup_applicant instead.",
            DeprecationWarning,
            stacklevel=2
        )
        from .supabase_user_lookup import supabase_user_lookup
        return supabase_user_lookup
    if name == "supabase_session_lookup":
        import warnings
        warnings.warn(
            "supabase_session_lookup is deprecated. Use validate_session instead.",
            DeprecationWarning,
            stacklevel=2
        )
        from .supabase_session_lookup import supabase_session_lookup
        return supabase_session_lookup
    if name == "supabase_session_create":
        import warnings
        warnings.warn(
            "supabase_session_create is deprecated. Use create_session instead.",
            DeprecationWarning,
            stacklevel=2
        )
        from .supabase_session_create import supabase_session_create
        return supabase_session_create
    if name == "supabase_session_extend":
        import warnings
        warnings.warn(
            "supabase_session_extend is deprecated. Use extend_session instead.",
            DeprecationWarning,
            stacklevel=2
        )
        from .supabase_session_extend import supabase_session_extend
        return supabase_session_extend
    if name == "supabase_application_store":
        import warnings
        warnings.warn(
            "supabase_application_store is deprecated. Use create_application instead.",
            DeprecationWarning,
            stacklevel=2
        )
        from .supabase_application_store import supabase_application_store
        return supabase_application_store
    if name == "supabase_rag_store":
        import warnings
        warnings.warn(
            "supabase_rag_store is deprecated. Use store_rag_embedding instead.",
            DeprecationWarning,
            stacklevel=2
        )
        from .supabase_rag_store import supabase_rag_store
        return supabase_rag_store
    if name == "supabase_rag_query":
        import warnings
        warnings.warn(
            "supabase_rag_query is deprecated. Use query_rag instead.",
            DeprecationWarning,
            stacklevel=2
        )
        from .supabase_rag_query import supabase_rag_query
        return supabase_rag_query
    if name == "supabase_nsfas_store":
        import warnings
        warnings.warn(
            "supabase_nsfas_store is deprecated. Use create_nsfas_application instead.",
            DeprecationWarning,
            stacklevel=2
        )
        from .supabase_nsfas_store import supabase_nsfas_store
        return supabase_nsfas_store
    if name == "supabase_nsfas_documents_store":
        import warnings
        warnings.warn(
            "supabase_nsfas_documents_store is deprecated. Use add_nsfas_document instead.",
            DeprecationWarning,
            stacklevel=2
        )
        from .supabase_nsfas_documents_store import supabase_nsfas_documents_store
        return supabase_nsfas_documents_store

    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = [
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
    # OTP & EXTERNAL TOOLS (No database access)
    # =========================================================================
    "sendgrid_otp_sender",
    "sms_otp_sender",
    "application_submission_tool",
    "application_status_tool",
    "nsfas_application_submission_tool",
    "nsfas_status_tool",
    "website_search_tool",
    # =========================================================================
    # SCANNER TOOLS
    # =========================================================================
    "html_parser_tool",
    "content_classifier_tool",
    "extract_academic_entities",
    "data_normalizer_tool",
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
