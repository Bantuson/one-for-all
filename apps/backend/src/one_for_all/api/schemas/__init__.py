"""API Pydantic Schemas for request/response validation."""

from .applicant import ApplicantCreate, ApplicantLookup, ApplicantResponse
from .application import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationStatusUpdate,
    DocumentCreate,
    DocumentResponse,
)
from .nsfas import (
    NsfasApplicationCreate,
    NsfasApplicationResponse,
    NsfasDocumentCreate,
    NsfasDocumentResponse,
)
from .rag import RAGQuery, RAGQueryResponse, RAGStore, RAGStoreResponse
from .session import SessionCreate, SessionExtend, SessionResponse
from .tenant import TenantContext, ROLE_HIERARCHY, has_role_or_higher

__all__ = [
    # Applicant
    "ApplicantCreate",
    "ApplicantLookup",
    "ApplicantResponse",
    # Session
    "SessionCreate",
    "SessionExtend",
    "SessionResponse",
    # Application
    "ApplicationCreate",
    "ApplicationResponse",
    "ApplicationStatusUpdate",
    "DocumentCreate",
    "DocumentResponse",
    # NSFAS
    "NsfasApplicationCreate",
    "NsfasApplicationResponse",
    "NsfasDocumentCreate",
    "NsfasDocumentResponse",
    # RAG
    "RAGQuery",
    "RAGQueryResponse",
    "RAGStore",
    "RAGStoreResponse",
    # Tenant
    "TenantContext",
    "ROLE_HIERARCHY",
    "has_role_or_higher",
]
