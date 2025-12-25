"""
RAG Router

Vector store operations for university/course information retrieval.
Used by rag_specialist_agent for semantic search.
"""

from typing import Optional

from fastapi import APIRouter, HTTPException, status

from ..dependencies import ApiKeyVerified, SupabaseClient
from ..schemas.rag import (
    RAGMatch,
    RAGQuery,
    RAGQueryResponse,
    RAGStore,
    RAGStoreResponse,
)

router = APIRouter(
    prefix="/api/v1/rag",
    tags=["rag"],
)


@router.post("/query", response_model=RAGQueryResponse)
async def query_embeddings(
    query: RAGQuery,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Query RAG embeddings using vector similarity search.

    Calls the match_rag_embeddings RPC function in Supabase
    to perform cosine similarity search on the embeddings.

    Used by rag_specialist_agent to find relevant university/course information.
    """
    try:
        # Call the RPC function for vector similarity search
        result = supabase.rpc(
            "match_rag_embeddings",
            {
                "query_embedding": query.query_embedding,
                "match_count": query.match_count,
            },
        ).execute()

        if not result.data:
            return RAGQueryResponse(
                matches=[],
                query_count=query.match_count,
                total_matches=0,
            )

        # Filter by institution if provided
        matches = result.data
        if query.institution_id:
            matches = [
                m for m in matches
                if m.get("institution_id") == str(query.institution_id)
            ]

        # Filter by source if provided
        if query.source_filter:
            matches = [
                m for m in matches
                if query.source_filter.lower() in (m.get("source") or "").lower()
            ]

        # Convert to response format
        formatted_matches = []
        for match in matches:
            formatted_matches.append(
                RAGMatch(
                    id=match["id"],
                    content=match.get("content", ""),
                    metadata=match.get("metadata"),
                    source=match.get("source"),
                    similarity=match.get("similarity", 0.0),
                )
            )

        return RAGQueryResponse(
            matches=formatted_matches,
            query_count=query.match_count,
            total_matches=len(formatted_matches),
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG query failed: {str(e)}",
        )


@router.post(
    "/store",
    response_model=RAGStoreResponse,
    status_code=status.HTTP_201_CREATED,
)
async def store_embedding(
    embedding: RAGStore,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Store a new embedding in the RAG vector store.

    Used by rag_specialist_agent after scraping new university information.
    The embedding should be pre-computed (1536 dimensions for OpenAI embeddings).
    """
    # Build insert data
    insert_data = {
        "content": embedding.content,
        "embedding": embedding.embedding,
        "metadata": embedding.metadata,
        "source": embedding.source,
    }

    if embedding.institution_id:
        insert_data["institution_id"] = str(embedding.institution_id)

    try:
        result = supabase.table("rag_embeddings").insert(insert_data).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to store embedding",
            )

        stored = result.data[0]

        return RAGStoreResponse(
            id=stored["id"],
            content_preview=embedding.content[:200],
            source=embedding.source,
            institution_id=embedding.institution_id,
            created_at=stored["created_at"],
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to store embedding: {str(e)}",
        )


@router.delete("/{embedding_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_embedding(
    embedding_id: str,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Delete an embedding from the RAG vector store.

    Used for cleanup or when source data is updated.
    """
    try:
        supabase.table("rag_embeddings").delete().eq("id", embedding_id).execute()
        return None
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete embedding: {str(e)}",
        )


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_embeddings_by_source(
    source: str,
    supabase: SupabaseClient,
    _: ApiKeyVerified,
):
    """
    Delete all embeddings from a specific source.

    Used when re-scraping a website to replace old data.
    """
    try:
        supabase.table("rag_embeddings").delete().eq("source", source).execute()
        return None
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete embeddings: {str(e)}",
        )
