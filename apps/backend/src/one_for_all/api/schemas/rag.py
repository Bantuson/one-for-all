"""
RAG Schemas

Pydantic models for RAG (Retrieval-Augmented Generation) operations.
Used by agents to query and store university/course information embeddings.
"""

from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class RAGQuery(BaseModel):
    """Schema for querying RAG embeddings."""

    query_embedding: List[float] = Field(
        ...,
        min_length=1536,
        max_length=1536,
        description="1536-dimensional embedding vector",
    )
    match_count: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Number of results to return (max 20)",
    )
    institution_id: Optional[UUID] = Field(
        None,
        description="Optional institution filter",
    )
    source_filter: Optional[str] = Field(
        None,
        max_length=100,
        description="Optional source URL filter",
    )

    @field_validator("query_embedding")
    @classmethod
    def validate_embedding(cls, v: List[float]) -> List[float]:
        """Validate embedding dimensions and values."""
        if len(v) != 1536:
            raise ValueError(f"Embedding must be 1536 dimensions, got {len(v)}")

        # Check for valid float values
        for i, val in enumerate(v):
            if not isinstance(val, (int, float)):
                raise ValueError(f"Embedding value at index {i} is not a number")
            if val != val:  # NaN check
                raise ValueError(f"Embedding value at index {i} is NaN")

        return v


class RAGMatch(BaseModel):
    """Schema for a single RAG match result."""

    id: UUID
    content: str
    metadata: Optional[dict] = None
    source: Optional[str] = None
    similarity: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Cosine similarity score",
    )

    model_config = {"from_attributes": True}


class RAGQueryResponse(BaseModel):
    """Schema for RAG query response."""

    matches: List[RAGMatch]
    query_count: int
    total_matches: int


class RAGStore(BaseModel):
    """Schema for storing a new RAG embedding."""

    content: str = Field(
        ...,
        min_length=10,
        max_length=10000,
        description="Text content to embed",
    )
    embedding: List[float] = Field(
        ...,
        min_length=1536,
        max_length=1536,
        description="1536-dimensional embedding vector",
    )
    metadata: Optional[dict] = Field(
        None,
        description="Additional metadata (university, faculty, etc.)",
    )
    source: Optional[str] = Field(
        None,
        max_length=500,
        description="Source URL or identifier",
    )
    institution_id: Optional[UUID] = Field(
        None,
        description="Institution ID for multi-tenant scoping",
    )

    @field_validator("embedding")
    @classmethod
    def validate_embedding(cls, v: List[float]) -> List[float]:
        """Validate embedding dimensions."""
        if len(v) != 1536:
            raise ValueError(f"Embedding must be 1536 dimensions, got {len(v)}")
        return v

    @field_validator("metadata")
    @classmethod
    def sanitize_metadata(cls, v: Optional[dict]) -> Optional[dict]:
        """Remove potentially dangerous keys from metadata."""
        if v is None:
            return None

        dangerous_keys = {"__proto__", "constructor", "prototype", "__class__"}

        def clean(obj: Any) -> Any:
            if isinstance(obj, dict):
                return {
                    k: clean(val)
                    for k, val in obj.items()
                    if k not in dangerous_keys
                }
            elif isinstance(obj, list):
                return [clean(item) for item in obj]
            return obj

        return clean(v)


class RAGStoreResponse(BaseModel):
    """Schema for RAG store response."""

    id: UUID
    content_preview: str = Field(
        ...,
        max_length=200,
        description="First 200 chars of stored content",
    )
    source: Optional[str] = None
    institution_id: Optional[UUID] = None
    created_at: datetime

    model_config = {"from_attributes": True}
