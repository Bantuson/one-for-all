"""
RAG API Tools

CrewAI tools for RAG (Retrieval-Augmented Generation) operations via the internal API.
Replaces direct Supabase access with validated API calls.
"""

from typing import Any, Optional

from crewai.tools import tool

from .api_client import api_delete, api_post


@tool
def query_rag(
    query_embedding: list[float],
    match_count: int = 5,
    institution_id: Optional[str] = None,
    source_filter: Optional[str] = None,
) -> str:
    """
    Query the RAG vector store for similar content.

    Use this to find relevant university/course information based on a query embedding.
    The embedding should be pre-computed using the same model as stored embeddings.

    Args:
        query_embedding: 1536-dimensional embedding vector (e.g., from OpenAI)
        match_count: Number of results to return (1-20, default 5)
        institution_id: Optional filter by institution UUID
        source_filter: Optional filter by source URL (partial match)

    Returns:
        JSON string with matching results including content, similarity score, and metadata

    Example:
        # Get embedding from OpenAI first
        embedding = openai.embed("What are the requirements for computer science?")

        # Query RAG store
        result = query_rag(
            query_embedding=embedding,
            match_count=5,
            source_filter="up.ac.za"
        )
    """
    if len(query_embedding) != 1536:
        return f"ERROR: Embedding must be 1536 dimensions, got {len(query_embedding)}"

    data = {
        "query_embedding": query_embedding,
        "match_count": match_count,
    }

    if institution_id:
        data["institution_id"] = institution_id
    if source_filter:
        data["source_filter"] = source_filter

    result = api_post("/api/v1/rag/query", data)

    if result.get("error"):
        return f"ERROR: {result.get('detail', 'Unknown error')}"

    # Format results for agent consumption
    matches = result.get("matches", [])
    if not matches:
        return "NO_MATCHES_FOUND"

    return str(result)


@tool
def store_rag_embedding(
    content: str,
    embedding: list[float],
    source: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
    institution_id: Optional[str] = None,
) -> str:
    """
    Store a new embedding in the RAG vector store.

    Use this after scraping new university information to make it searchable.
    The embedding should be computed from the content using an embedding model.

    Args:
        content: Text content to store (10-10000 characters)
        embedding: 1536-dimensional embedding vector for the content
        source: Source URL or identifier (optional)
        metadata: Additional metadata like university, faculty, etc. (optional)
        institution_id: Institution UUID for multi-tenant scoping (optional)

    Returns:
        JSON string with stored embedding data or error message

    Example:
        # Compute embedding
        embedding = openai.embed(scraped_content)

        # Store in RAG
        result = store_rag_embedding(
            content=scraped_content,
            embedding=embedding,
            source="https://www.up.ac.za/courses/bsc-computer-science",
            metadata={"university": "University of Pretoria", "faculty": "Engineering"}
        )
    """
    if len(embedding) != 1536:
        return f"ERROR: Embedding must be 1536 dimensions, got {len(embedding)}"

    if len(content) < 10:
        return "ERROR: Content must be at least 10 characters"

    if len(content) > 10000:
        return "ERROR: Content must be at most 10000 characters"

    data = {
        "content": content,
        "embedding": embedding,
    }

    if source:
        data["source"] = source
    if metadata:
        data["metadata"] = metadata
    if institution_id:
        data["institution_id"] = institution_id

    result = api_post("/api/v1/rag/store", data)

    if result.get("error"):
        return f"ERROR: {result.get('detail', 'Unknown error')}"

    return str(result)


@tool
def delete_rag_embeddings_by_source(source: str) -> str:
    """
    Delete all embeddings from a specific source.

    Use this before re-scraping a website to replace old data with fresh content.

    Args:
        source: Source URL or identifier to delete

    Returns:
        "SUCCESS" or error message

    Example:
        # Before re-scraping UP website
        result = delete_rag_embeddings_by_source("https://www.up.ac.za")
    """
    result = api_delete(f"/api/v1/rag?source={source}")

    if result.get("error"):
        return f"ERROR: {result.get('detail', 'Unknown error')}"

    return "SUCCESS"
