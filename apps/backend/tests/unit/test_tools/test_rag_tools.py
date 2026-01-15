"""
Unit tests for RAG (Retrieval-Augmented Generation) tools.

Tests the RAG workflow components:
- query_rag - Vector similarity search via API
- store_rag_embedding - Store embeddings in vector store via API
- delete_rag_embeddings_by_source - Delete embeddings by source via API

These tools use the internal API client rather than direct Supabase access,
so we mock the api_client functions (api_post, api_delete).
"""

import pytest
from unittest.mock import patch, MagicMock
import sys
from pathlib import Path
import numpy as np

# Add src to path
src_path = Path(__file__).resolve().parent.parent.parent.parent / "src"
sys.path.insert(0, str(src_path))

from one_for_all.tools.rag_tools import (
    query_rag,
    store_rag_embedding,
    delete_rag_embeddings_by_source,
)


# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
def sample_embedding():
    """
    Create a sample 1536-dimension embedding (OpenAI ada-002 format).

    Returns:
        list[float]: 1536-dimensional embedding vector
    """
    return list(np.random.rand(1536).astype(float))


@pytest.fixture
def sample_embedding_wrong_dimension():
    """
    Create an embedding with wrong dimensions for testing validation.

    Returns:
        list[float]: 100-dimensional embedding vector (invalid)
    """
    return list(np.random.rand(100).astype(float))


@pytest.fixture
def sample_rag_matches():
    """
    Sample RAG query response with matching documents.

    Returns:
        dict: API response with matches
    """
    return {
        "matches": [
            {
                "id": "emb-001",
                "content": "UCT requires a minimum APS of 30 for Engineering.",
                "similarity": 0.95,
                "source": "https://www.uct.ac.za/admissions",
                "metadata": {"university": "UCT", "faculty": "Engineering"},
            },
            {
                "id": "emb-002",
                "content": "Application deadline for UCT is 31 March 2024.",
                "similarity": 0.87,
                "source": "https://www.uct.ac.za/apply",
                "metadata": {"university": "UCT", "type": "deadline"},
            },
            {
                "id": "emb-003",
                "content": "UCT offers bursaries for qualifying students.",
                "similarity": 0.82,
                "source": "https://www.uct.ac.za/funding",
                "metadata": {"university": "UCT", "type": "financial_aid"},
            },
        ],
        "query_time_ms": 45,
    }


@pytest.fixture
def sample_store_response():
    """
    Sample response from storing an embedding.

    Returns:
        dict: API response with stored embedding data
    """
    return {
        "id": "emb-new-123",
        "content": "Test content about University of Pretoria requirements.",
        "source": "https://www.up.ac.za/cs",
        "created_at": "2024-01-15T10:30:00Z",
    }


# =============================================================================
# TestQueryRag - Vector Similarity Search Tests
# =============================================================================


class TestQueryRag:
    """Test query_rag tool for vector similarity search."""

    @patch("one_for_all.tools.rag_tools.api_post")
    def test_successful_query(self, mock_api_post, sample_embedding, sample_rag_matches):
        """
        Test successful RAG query returns formatted results.

        Expected behavior:
        - Calls api_post with correct endpoint and embedding
        - Returns string representation of matches
        - Contains expected content from matches
        """
        mock_api_post.return_value = sample_rag_matches

        result = query_rag.func(
            query_embedding=sample_embedding,
            match_count=5,
        )

        # Verify API was called correctly
        mock_api_post.assert_called_once()
        call_args = mock_api_post.call_args
        assert call_args[0][0] == "/api/v1/rag/query"
        assert "query_embedding" in call_args[0][1]
        assert call_args[0][1]["match_count"] == 5

        # Verify result contains expected data
        assert "UCT" in result
        assert "APS" in result or "30" in result

    @patch("one_for_all.tools.rag_tools.api_post")
    def test_no_matches_found(self, mock_api_post, sample_embedding):
        """
        Test handling when no matches are found.

        Expected behavior:
        - Returns "NO_MATCHES_FOUND" when API returns empty matches
        """
        mock_api_post.return_value = {"matches": [], "query_time_ms": 10}

        result = query_rag.func(
            query_embedding=sample_embedding,
            match_count=5,
        )

        assert result == "NO_MATCHES_FOUND"

    def test_invalid_embedding_dimensions_too_small(self, sample_embedding_wrong_dimension):
        """
        Test validation rejects embeddings with wrong dimensions (too small).

        Expected behavior:
        - Returns error message indicating dimension mismatch
        - Does NOT call API
        """
        result = query_rag.func(
            query_embedding=sample_embedding_wrong_dimension,
            match_count=5,
        )

        assert "ERROR" in result
        assert "1536" in result
        assert "100" in result

    def test_invalid_embedding_dimensions_too_large(self):
        """
        Test validation rejects embeddings with wrong dimensions (too large).

        Expected behavior:
        - Returns error message indicating dimension mismatch
        """
        large_embedding = list(np.random.rand(2000).astype(float))

        result = query_rag.func(
            query_embedding=large_embedding,
            match_count=5,
        )

        assert "ERROR" in result
        assert "1536" in result
        assert "2000" in result

    def test_empty_embedding(self):
        """
        Test validation rejects empty embedding list.

        Expected behavior:
        - Returns error about invalid dimensions
        """
        result = query_rag.func(
            query_embedding=[],
            match_count=5,
        )

        assert "ERROR" in result
        assert "1536" in result
        assert "0" in result

    @patch("one_for_all.tools.rag_tools.api_post")
    def test_query_with_institution_filter(self, mock_api_post, sample_embedding, sample_rag_matches):
        """
        Test query with institution_id filter.

        Expected behavior:
        - Includes institution_id in API request
        """
        mock_api_post.return_value = sample_rag_matches
        institution_uuid = "inst-123-456"

        query_rag.func(
            query_embedding=sample_embedding,
            match_count=3,
            institution_id=institution_uuid,
        )

        call_args = mock_api_post.call_args[0][1]
        assert call_args["institution_id"] == institution_uuid

    @patch("one_for_all.tools.rag_tools.api_post")
    def test_query_with_source_filter(self, mock_api_post, sample_embedding, sample_rag_matches):
        """
        Test query with source_filter for partial URL matching.

        Expected behavior:
        - Includes source_filter in API request
        """
        mock_api_post.return_value = sample_rag_matches

        query_rag.func(
            query_embedding=sample_embedding,
            match_count=5,
            source_filter="up.ac.za",
        )

        call_args = mock_api_post.call_args[0][1]
        assert call_args["source_filter"] == "up.ac.za"

    @patch("one_for_all.tools.rag_tools.api_post")
    def test_query_with_all_filters(self, mock_api_post, sample_embedding, sample_rag_matches):
        """
        Test query with both institution_id and source_filter.

        Expected behavior:
        - Includes both filters in API request
        """
        mock_api_post.return_value = sample_rag_matches

        query_rag.func(
            query_embedding=sample_embedding,
            match_count=10,
            institution_id="inst-abc",
            source_filter="uct.ac.za",
        )

        call_args = mock_api_post.call_args[0][1]
        assert call_args["institution_id"] == "inst-abc"
        assert call_args["source_filter"] == "uct.ac.za"
        assert call_args["match_count"] == 10

    @patch("one_for_all.tools.rag_tools.api_post")
    def test_query_api_error(self, mock_api_post, sample_embedding):
        """
        Test handling of API error response.

        Expected behavior:
        - Returns error message from API
        """
        mock_api_post.return_value = {
            "error": True,
            "detail": "Database connection failed",
        }

        result = query_rag.func(
            query_embedding=sample_embedding,
            match_count=5,
        )

        assert "ERROR" in result
        assert "Database connection failed" in result

    @patch("one_for_all.tools.rag_tools.api_post")
    def test_query_api_timeout(self, mock_api_post, sample_embedding):
        """
        Test handling of API timeout.

        Expected behavior:
        - Returns error message about timeout
        """
        mock_api_post.return_value = {
            "error": True,
            "detail": "Request timeout",
        }

        result = query_rag.func(
            query_embedding=sample_embedding,
            match_count=5,
        )

        assert "ERROR" in result
        assert "timeout" in result.lower()

    @patch("one_for_all.tools.rag_tools.api_post")
    def test_query_default_match_count(self, mock_api_post, sample_embedding, sample_rag_matches):
        """
        Test default match_count is 5.

        Expected behavior:
        - Uses default match_count=5 when not specified
        """
        mock_api_post.return_value = sample_rag_matches

        query_rag.func(query_embedding=sample_embedding)

        call_args = mock_api_post.call_args[0][1]
        assert call_args["match_count"] == 5


# =============================================================================
# TestStoreRagEmbedding - Embedding Storage Tests
# =============================================================================


class TestStoreRagEmbedding:
    """Test store_rag_embedding tool for vector storage."""

    @patch("one_for_all.tools.rag_tools.api_post")
    def test_successful_store(self, mock_api_post, sample_embedding, sample_store_response):
        """
        Test successful embedding storage.

        Expected behavior:
        - Calls api_post with correct endpoint and data
        - Returns string representation of stored data
        """
        mock_api_post.return_value = sample_store_response

        result = store_rag_embedding.func(
            content="Test content about University of Pretoria requirements.",
            embedding=sample_embedding,
            source="https://www.up.ac.za/cs",
            metadata={"university": "UP", "faculty": "EBIT"},
        )

        # Verify API was called
        mock_api_post.assert_called_once()
        call_args = mock_api_post.call_args
        assert call_args[0][0] == "/api/v1/rag/store"

        # Verify data passed
        data = call_args[0][1]
        assert "Test content" in data["content"]
        assert data["source"] == "https://www.up.ac.za/cs"
        assert data["metadata"]["university"] == "UP"

        # Verify result contains stored ID
        assert "emb-new-123" in result

    @patch("one_for_all.tools.rag_tools.api_post")
    def test_store_minimal_fields(self, mock_api_post, sample_embedding, sample_store_response):
        """
        Test storage with only required fields (content and embedding).

        Expected behavior:
        - Successfully stores with only content and embedding
        - Optional fields (source, metadata, institution_id) not included
        """
        mock_api_post.return_value = sample_store_response

        result = store_rag_embedding.func(
            content="Minimum required content for testing storage.",
            embedding=sample_embedding,
        )

        call_args = mock_api_post.call_args[0][1]
        assert "content" in call_args
        assert "embedding" in call_args
        assert "source" not in call_args
        assert "metadata" not in call_args

        assert "ERROR" not in result

    def test_content_too_short(self, sample_embedding):
        """
        Test content validation rejects content < 10 characters.

        Expected behavior:
        - Returns error message about content length
        - Does NOT call API
        """
        result = store_rag_embedding.func(
            content="Hi",  # Only 2 characters
            embedding=sample_embedding,
        )

        assert "ERROR" in result
        assert "10 characters" in result

    def test_content_too_long(self, sample_embedding):
        """
        Test content validation rejects content > 10000 characters.

        Expected behavior:
        - Returns error message about content length
        - Does NOT call API
        """
        long_content = "x" * 10001

        result = store_rag_embedding.func(
            content=long_content,
            embedding=sample_embedding,
        )

        assert "ERROR" in result
        assert "10000 characters" in result

    def test_content_exactly_minimum(self, sample_embedding):
        """
        Test content at exact minimum boundary (10 chars).

        Expected behavior:
        - Should NOT return error (boundary case)
        """
        with patch("one_for_all.tools.rag_tools.api_post") as mock_api_post:
            mock_api_post.return_value = {"id": "test-id"}

            result = store_rag_embedding.func(
                content="Exactly 10",  # Exactly 10 characters
                embedding=sample_embedding,
            )

            # Should not have validation error
            assert "ERROR" not in result or "character" not in result

    def test_content_exactly_maximum(self, sample_embedding):
        """
        Test content at exact maximum boundary (10000 chars).

        Expected behavior:
        - Should NOT return error (boundary case)
        """
        with patch("one_for_all.tools.rag_tools.api_post") as mock_api_post:
            mock_api_post.return_value = {"id": "test-id"}

            result = store_rag_embedding.func(
                content="x" * 10000,  # Exactly 10000 characters
                embedding=sample_embedding,
            )

            # Should not have validation error
            assert "ERROR" not in result or "10000" not in result

    def test_invalid_embedding_dimensions(self, sample_embedding_wrong_dimension):
        """
        Test embedding validation rejects wrong dimensions.

        Expected behavior:
        - Returns error about embedding dimensions
        - Does NOT call API
        """
        result = store_rag_embedding.func(
            content="Valid content for testing embedding validation.",
            embedding=sample_embedding_wrong_dimension,
        )

        assert "ERROR" in result
        assert "1536" in result
        assert "100" in result

    @patch("one_for_all.tools.rag_tools.api_post")
    def test_store_with_institution_id(self, mock_api_post, sample_embedding, sample_store_response):
        """
        Test storage with institution_id for multi-tenant scoping.

        Expected behavior:
        - Includes institution_id in API request
        """
        mock_api_post.return_value = sample_store_response
        institution_uuid = "inst-multi-tenant-123"

        store_rag_embedding.func(
            content="Content for specific institution.",
            embedding=sample_embedding,
            institution_id=institution_uuid,
        )

        call_args = mock_api_post.call_args[0][1]
        assert call_args["institution_id"] == institution_uuid

    @patch("one_for_all.tools.rag_tools.api_post")
    def test_store_with_complex_metadata(self, mock_api_post, sample_embedding, sample_store_response):
        """
        Test storage with complex nested metadata.

        Expected behavior:
        - Preserves nested metadata structure
        """
        mock_api_post.return_value = sample_store_response
        complex_metadata = {
            "university": "University of Pretoria",
            "faculty": "Engineering, Built Environment and IT",
            "programme": {
                "name": "BSc Computer Science",
                "code": "12345678",
                "level": "undergraduate",
            },
            "requirements": {
                "aps": 35,
                "subjects": ["Mathematics", "Physical Sciences"],
            },
            "tags": ["STEM", "IT", "Computer Science"],
        }

        store_rag_embedding.func(
            content="Detailed programme information for UP Computer Science.",
            embedding=sample_embedding,
            metadata=complex_metadata,
        )

        call_args = mock_api_post.call_args[0][1]
        assert call_args["metadata"] == complex_metadata

    @patch("one_for_all.tools.rag_tools.api_post")
    def test_store_api_error(self, mock_api_post, sample_embedding):
        """
        Test handling of API error during storage.

        Expected behavior:
        - Returns error message from API
        """
        mock_api_post.return_value = {
            "error": True,
            "detail": "Duplicate content detected",
        }

        result = store_rag_embedding.func(
            content="Content that causes API error.",
            embedding=sample_embedding,
        )

        assert "ERROR" in result
        assert "Duplicate content detected" in result

    @patch("one_for_all.tools.rag_tools.api_post")
    def test_store_unicode_content(self, mock_api_post, sample_embedding, sample_store_response):
        """
        Test storage with Unicode/special characters in content.

        Expected behavior:
        - Successfully stores content with special characters
        """
        mock_api_post.return_value = sample_store_response
        unicode_content = (
            "South African universities: UCT, Wits, UP. "
            "Requirements include: Mathematics ≥ 70%, "
            "English (Home Language) — minimum Level 5. "
            "Fees: R50,000 per year."
        )

        result = store_rag_embedding.func(
            content=unicode_content,
            embedding=sample_embedding,
        )

        call_args = mock_api_post.call_args[0][1]
        assert call_args["content"] == unicode_content
        assert "ERROR" not in result


# =============================================================================
# TestDeleteRagEmbeddingsBySource - Deletion Tests
# =============================================================================


class TestDeleteRagEmbeddingsBySource:
    """Test delete_rag_embeddings_by_source tool."""

    @patch("one_for_all.tools.rag_tools.api_delete")
    def test_successful_delete(self, mock_api_delete):
        """
        Test successful deletion by source.

        Expected behavior:
        - Calls api_delete with correct endpoint
        - Returns "SUCCESS"
        """
        mock_api_delete.return_value = {"success": True}

        result = delete_rag_embeddings_by_source.func(
            source="https://www.up.ac.za/courses"
        )

        # Verify API call
        mock_api_delete.assert_called_once()
        call_endpoint = mock_api_delete.call_args[0][0]
        assert "/api/v1/rag" in call_endpoint
        assert "source=" in call_endpoint
        assert "up.ac.za" in call_endpoint

        assert result == "SUCCESS"

    @patch("one_for_all.tools.rag_tools.api_delete")
    def test_delete_partial_source(self, mock_api_delete):
        """
        Test deletion with partial source URL.

        Expected behavior:
        - Accepts partial source identifiers
        """
        mock_api_delete.return_value = {"success": True}

        result = delete_rag_embeddings_by_source.func(source="up.ac.za")

        assert result == "SUCCESS"
        call_endpoint = mock_api_delete.call_args[0][0]
        assert "up.ac.za" in call_endpoint

    @patch("one_for_all.tools.rag_tools.api_delete")
    def test_delete_api_error(self, mock_api_delete):
        """
        Test handling of API error during deletion.

        Expected behavior:
        - Returns error message from API
        """
        mock_api_delete.return_value = {
            "error": True,
            "detail": "Source not found in database",
        }

        result = delete_rag_embeddings_by_source.func(
            source="nonexistent-source"
        )

        assert "ERROR" in result
        assert "Source not found" in result

    @patch("one_for_all.tools.rag_tools.api_delete")
    def test_delete_with_special_characters_in_source(self, mock_api_delete):
        """
        Test deletion with special characters in source URL.

        Expected behavior:
        - URL encodes special characters properly
        """
        mock_api_delete.return_value = {"success": True}

        result = delete_rag_embeddings_by_source.func(
            source="https://www.up.ac.za/courses?faculty=EBIT&year=2024"
        )

        assert result == "SUCCESS"

    @patch("one_for_all.tools.rag_tools.api_delete")
    def test_delete_database_failure(self, mock_api_delete):
        """
        Test handling of database failure during deletion.

        Expected behavior:
        - Returns appropriate error message
        """
        mock_api_delete.return_value = {
            "error": True,
            "detail": "Database connection lost",
        }

        result = delete_rag_embeddings_by_source.func(
            source="https://www.uct.ac.za"
        )

        assert "ERROR" in result
        assert "Database connection" in result


# =============================================================================
# TestRagWorkflow - Integration-style workflow tests
# =============================================================================


class TestRagWorkflow:
    """Integration-style tests for complete RAG workflow."""

    @patch("one_for_all.tools.rag_tools.api_delete")
    @patch("one_for_all.tools.rag_tools.api_post")
    def test_delete_then_store_workflow(
        self,
        mock_api_post,
        mock_api_delete,
        sample_embedding,
    ):
        """
        Test workflow: delete old → store new (re-scrape scenario).

        Expected behavior:
        - Delete succeeds
        - Store succeeds after delete
        """
        # Setup mocks
        mock_api_delete.return_value = {"success": True}
        mock_api_post.return_value = {"id": "new-emb-123"}

        # Step 1: Delete old data
        delete_result = delete_rag_embeddings_by_source.func(
            source="https://www.up.ac.za"
        )
        assert delete_result == "SUCCESS"

        # Step 2: Store new data
        store_result = store_rag_embedding.func(
            content="Updated course requirements for UP Computer Science 2024.",
            embedding=sample_embedding,
            source="https://www.up.ac.za/cs",
            metadata={"year": 2024},
        )
        assert "new-emb-123" in store_result

    @patch("one_for_all.tools.rag_tools.api_post")
    def test_store_then_query_workflow(
        self,
        mock_api_post,
        sample_embedding,
    ):
        """
        Test workflow: store → query (typical RAG flow).

        Expected behavior:
        - Store succeeds
        - Query finds the stored content
        """
        stored_content = "BSc Computer Science at UP requires APS 35 and Mathematics HL."

        # Setup mock responses (order matters: store first, then query)
        mock_api_post.side_effect = [
            {"id": "stored-emb-001"},  # Store response
            {
                "matches": [
                    {
                        "content": stored_content,
                        "similarity": 0.98,
                    }
                ]
            },  # Query response
        ]

        # Step 1: Store embedding
        store_result = store_rag_embedding.func(
            content=stored_content,
            embedding=sample_embedding,
            source="https://www.up.ac.za/cs",
        )
        assert "stored-emb-001" in store_result

        # Step 2: Query for the content
        query_result = query_rag.func(
            query_embedding=sample_embedding,  # Same embedding should match well
            match_count=5,
        )
        assert "BSc Computer Science" in query_result or "APS 35" in query_result


# =============================================================================
# TestEdgeCases - Edge cases and boundary conditions
# =============================================================================


class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_embedding_with_negative_values(self):
        """
        Test embeddings can contain negative values.

        Expected behavior:
        - Accepts embeddings with negative float values
        """
        with patch("one_for_all.tools.rag_tools.api_post") as mock_api_post:
            mock_api_post.return_value = {"id": "test-id"}

            # Create embedding with mix of positive and negative
            mixed_embedding = [(-1) ** i * 0.5 for i in range(1536)]

            result = store_rag_embedding.func(
                content="Content with negative embedding values.",
                embedding=mixed_embedding,
            )

            assert "ERROR" not in result or "dimension" not in result.lower()

    def test_embedding_with_zero_values(self):
        """
        Test embeddings can contain zero values.

        Expected behavior:
        - Accepts embeddings with zero values
        """
        with patch("one_for_all.tools.rag_tools.api_post") as mock_api_post:
            mock_api_post.return_value = {"id": "test-id"}

            # Create embedding with some zeros
            zero_embedding = [0.0] * 1536

            result = store_rag_embedding.func(
                content="Content with zero embedding values.",
                embedding=zero_embedding,
            )

            assert "ERROR" not in result or "dimension" not in result.lower()

    def test_embedding_with_very_small_values(self):
        """
        Test embeddings can contain very small float values.

        Expected behavior:
        - Accepts embeddings with very small values (near epsilon)
        """
        with patch("one_for_all.tools.rag_tools.api_post") as mock_api_post:
            mock_api_post.return_value = {"id": "test-id"}

            # Create embedding with very small values
            small_embedding = [1e-10] * 1536

            result = store_rag_embedding.func(
                content="Content with very small embedding values.",
                embedding=small_embedding,
            )

            assert "ERROR" not in result or "dimension" not in result.lower()

    @patch("one_for_all.tools.rag_tools.api_post")
    def test_empty_metadata(self, mock_api_post, sample_embedding):
        """
        Test storage with empty metadata dict.

        Expected behavior:
        - Accepts empty metadata dict
        - Empty metadata is NOT included in API call (falsy value optimization)
        """
        mock_api_post.return_value = {"id": "test-id"}

        store_rag_embedding.func(
            content="Content with empty metadata.",
            embedding=sample_embedding,
            metadata={},
        )

        call_args = mock_api_post.call_args[0][1]
        # Empty dict is falsy, so metadata should NOT be included
        assert "metadata" not in call_args

    @patch("one_for_all.tools.rag_tools.api_post")
    def test_query_response_with_null_similarity(self, mock_api_post, sample_embedding):
        """
        Test handling of query response with null similarity scores.

        Expected behavior:
        - Handles null similarity gracefully
        """
        mock_api_post.return_value = {
            "matches": [
                {
                    "content": "Content without similarity score",
                    "similarity": None,
                }
            ]
        }

        result = query_rag.func(
            query_embedding=sample_embedding,
            match_count=5,
        )

        # Should return result without crashing
        assert "NO_MATCHES_FOUND" not in result

    @patch("one_for_all.tools.rag_tools.api_post")
    def test_api_returns_unknown_error_format(self, mock_api_post, sample_embedding):
        """
        Test handling of unexpected API error format.

        Expected behavior:
        - Returns generic error when detail is missing
        """
        mock_api_post.return_value = {
            "error": True,
            # No "detail" key
        }

        result = query_rag.func(
            query_embedding=sample_embedding,
            match_count=5,
        )

        assert "ERROR" in result
        assert "Unknown error" in result
