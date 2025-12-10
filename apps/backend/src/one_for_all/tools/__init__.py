"""
One For All - CrewAI Tools

This module exports all custom tools for CrewAI agents.
"""

# Authentication & Session Tools
from .sendgrid_otp_sender import sendgrid_otp_sender
from .sms_otp_sender import sms_otp_sender
from .supabase_user_store import supabase_user_store
from .supabase_user_lookup import supabase_user_lookup
from .supabase_session_lookup import supabase_session_lookup
from .supabase_session_create import supabase_session_create
from .supabase_session_extend import supabase_session_extend

# Application Tools
from .supabase_application_store import supabase_application_store
from .application_submission_tool import application_submission_tool
from .application_status_tool import application_status_tool

# RAG Tools
from .website_search_tool import website_search_tool
from .supabase_rag_store import supabase_rag_store
from .supabase_rag_query import supabase_rag_query

# NSFAS Tools
from .supabase_nsfas_store import supabase_nsfas_store
from .supabase_nsfas_documents_store import supabase_nsfas_documents_store
from .nsfas_application_submission_tool import nsfas_application_submission_tool
from .nsfas_status_tool import nsfas_status_tool

# Scanner Tools (for AI Website Scanner)
from .html_parser_tool import html_parser_tool
from .content_classifier_tool import content_classifier_tool, extract_academic_entities
from .data_normalizer_tool import data_normalizer_tool

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
