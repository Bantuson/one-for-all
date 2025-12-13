"""
One For All - CrewAI Tools

This module exports all custom tools for CrewAI agents.
Uses lazy imports to avoid loading all tools at module import time.
"""

# Scanner Tools are imported eagerly as they're most commonly used
from .html_parser_tool import html_parser_tool
from .content_classifier_tool import content_classifier_tool, extract_academic_entities
from .data_normalizer_tool import data_normalizer_tool


def __getattr__(name):
    """Lazy import for other tools to avoid loading all tools at once."""
    # Auth & Session Tools
    if name == "sendgrid_otp_sender":
        from .sendgrid_otp_sender import sendgrid_otp_sender
        return sendgrid_otp_sender
    if name == "sms_otp_sender":
        from .sms_otp_sender import sms_otp_sender
        return sms_otp_sender
    if name == "supabase_user_store":
        from .supabase_user_store import supabase_user_store
        return supabase_user_store
    if name == "supabase_user_lookup":
        from .supabase_user_lookup import supabase_user_lookup
        return supabase_user_lookup
    if name == "supabase_session_lookup":
        from .supabase_session_lookup import supabase_session_lookup
        return supabase_session_lookup
    if name == "supabase_session_create":
        from .supabase_session_create import supabase_session_create
        return supabase_session_create
    if name == "supabase_session_extend":
        from .supabase_session_extend import supabase_session_extend
        return supabase_session_extend
    # Application Tools
    if name == "supabase_application_store":
        from .supabase_application_store import supabase_application_store
        return supabase_application_store
    if name == "application_submission_tool":
        from .application_submission_tool import application_submission_tool
        return application_submission_tool
    if name == "application_status_tool":
        from .application_status_tool import application_status_tool
        return application_status_tool
    # RAG Tools
    if name == "website_search_tool":
        from .website_search_tool import website_search_tool
        return website_search_tool
    if name == "supabase_rag_store":
        from .supabase_rag_store import supabase_rag_store
        return supabase_rag_store
    if name == "supabase_rag_query":
        from .supabase_rag_query import supabase_rag_query
        return supabase_rag_query
    # NSFAS Tools
    if name == "supabase_nsfas_store":
        from .supabase_nsfas_store import supabase_nsfas_store
        return supabase_nsfas_store
    if name == "supabase_nsfas_documents_store":
        from .supabase_nsfas_documents_store import supabase_nsfas_documents_store
        return supabase_nsfas_documents_store
    if name == "nsfas_application_submission_tool":
        from .nsfas_application_submission_tool import nsfas_application_submission_tool
        return nsfas_application_submission_tool
    if name == "nsfas_status_tool":
        from .nsfas_status_tool import nsfas_status_tool
        return nsfas_status_tool

    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = [
    # Auth & Session
    "sendgrid_otp_sender",
    "sms_otp_sender",
    "supabase_user_store",
    "supabase_user_lookup",
    "supabase_session_lookup",
    "supabase_session_create",
    "supabase_session_extend",
    # Application
    "supabase_application_store",
    "application_submission_tool",
    "application_status_tool",
    # RAG
    "website_search_tool",
    "supabase_rag_store",
    "supabase_rag_query",
    # NSFAS
    "supabase_nsfas_store",
    "supabase_nsfas_documents_store",
    "nsfas_application_submission_tool",
    "nsfas_status_tool",
    # Scanner
    "html_parser_tool",
    "content_classifier_tool",
    "extract_academic_entities",
    "data_normalizer_tool",
]
