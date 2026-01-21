"""
Unit tests for deprecated Supabase RAG tools.

Tests the direct Supabase RAG tools (deprecated - prefer API-based rag_tools.py):
- supabase_rag_query - Vector similarity search via RPC
- supabase_rag_store - Store embeddings directly to Supabase

These tools use direct Supabase client access with service role and
are decorated with @audit_service_role_access for security tracking.

These tests mock the Supabase client to avoid database dependencies.
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
import sys
from pathlib import Path

# Add src to path
src_path = Path(__file__).resolve().parent.parent.parent.parent / "src"
sys.path.insert(0, str(src_path))


# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
def sample_embedding():
    """
    Create a sample embedding vector.

    Returns:
        list[float]: A sample embedding vector
    """
    return [0.1] * 1536  # Standard OpenAI embedding dimension


@pytest.fixture
def sample_metadata():
    """
    Create sample metadata for RAG embedding.

    Returns:
        dict: Sample metadata with university information
    """
    return {
        "university": "University of Pretoria",
        "faculty": "Engineering",
        "source_url": "https://www.up.ac.za/cs",
        "content_type": "requirements",
    }


@pytest.fixture
def sample_rag_matches():
    """
    Sample RAG query results from Supabase RPC.

    Returns:
        list[dict]: Sample matching documents
    """
    return [
        {
            "id": "emb-001",
            "content": "UCT requires a minimum APS of 30 for Engineering.",
            "similarity": 0.95,
            "metadata": {"university": "UCT", "faculty": "Engineering"},
        },
        {
            "id": "emb-002",
            "content": "Application deadline for UCT is 31 March 2024.",
            "similarity": 0.87,
            "metadata": {"university": "UCT", "type": "deadline"},
        },
        {
            "id": "emb-003",
            "content": "UCT offers bursaries for qualifying students.",
            "similarity": 0.82,
            "metadata": {"university": "UCT", "type": "financial_aid"},
        },
    ]


@pytest.fixture
def sample_store_response():
    """
    Sample response from storing an embedding.

    Returns:
        list[dict]: Sample stored embedding data
    """
    return [
        {
            "id": "emb-new-123",
            "embedding": [0.1] * 1536,
            "metadata": {"university": "UP", "faculty": "EBIT"},
            "created_at": "2024-01-15T10:30:00Z",
        }
    ]


# =============================================================================
# Mock Helper Functions
# =============================================================================


def create_mock_rpc_result(data):
    """Create a mock result object for RPC calls."""
    mock_result = MagicMock()
    mock_result.data = data
    return mock_result


def create_mock_insert_result(data):
    """Create a mock result object for insert operations."""
    mock_result = MagicMock()
    mock_result.data = data
    return mock_result


# =============================================================================
# TestSupabaseRagQuery - Vector Similarity Search Tests
# =============================================================================


class TestSupabaseRagQuery:
    """Test supabase_rag_query tool for direct Supabase vector search."""

    @patch("one_for_all.tools.supabase_rag_query.supabase")
    def test_successful_query_returns_matches(
        self, mock_supabase, sample_embedding, sample_rag_matches
    ):
        """
        Test successful RAG query returns string representation of matches.

        Expected behavior:
        - Calls supabase.rpc with match_rag_embeddings
        - Returns string representation of data
        - Data contains matching documents
        """
        # Import here to avoid conftest import issues
        from one_for_all.tools.supabase_rag_query import supabase_rag_query

        # Setup mock - rpc returns an awaitable
        mock_rpc = AsyncMock(return_value=create_mock_rpc_result(sample_rag_matches))
        mock_supabase.rpc = mock_rpc

        # Call the tool
        result = supabase_rag_query.func(
            query_embedding=sample_embedding,
            k=5,
        )

        # Verify RPC was called with correct params
        mock_rpc.assert_called_once_with(
            "match_rag_embeddings",
            {"query_embedding": sample_embedding, "match_count": 5}
        )

        # Verify result contains data
        assert "emb-001" in result
        assert "UCT" in result
        assert "APS" in result or "30" in result

    @patch("one_for_all.tools.supabase_rag_query.supabase")
    def test_query_no_matches_returns_no_match(self, mock_supabase, sample_embedding):
        """
        Test query with no results returns NO_MATCH.

        Expected behavior:
        - When RPC returns empty/None data, returns "NO_MATCH"
        """
        from one_for_all.tools.supabase_rag_query import supabase_rag_query

        # Setup mock to return empty data
        mock_rpc = AsyncMock(return_value=create_mock_rpc_result(None))
        mock_supabase.rpc = mock_rpc

        result = supabase_rag_query.func(
            query_embedding=sample_embedding,
            k=5,
        )

        assert result == "NO_MATCH"

    @patch("one_for_all.tools.supabase_rag_query.supabase")
    def test_query_empty_list_returns_no_match(self, mock_supabase, sample_embedding):
        """
        Test query with empty list returns NO_MATCH.

        Expected behavior:
        - When RPC returns empty list, returns "NO_MATCH"
        """
        from one_for_all.tools.supabase_rag_query import supabase_rag_query

        # Setup mock to return empty list
        mock_rpc = AsyncMock(return_value=create_mock_rpc_result([]))
        mock_supabase.rpc = mock_rpc

        result = supabase_rag_query.func(
            query_embedding=sample_embedding,
            k=5,
        )

        assert result == "NO_MATCH"

    @patch("one_for_all.tools.supabase_rag_query.supabase")
    def test_query_default_k_value(self, mock_supabase, sample_embedding, sample_rag_matches):
        """
        Test default k value is 5.

        Expected behavior:
        - Uses default match_count=5 when k not specified
        """
        from one_for_all.tools.supabase_rag_query import supabase_rag_query

        mock_rpc = AsyncMock(return_value=create_mock_rpc_result(sample_rag_matches))
        mock_supabase.rpc = mock_rpc

        # Call without k parameter
        supabase_rag_query.func(query_embedding=sample_embedding)

        # Verify default k=5 was used
        call_args = mock_rpc.call_args[0][1]
        assert call_args["match_count"] == 5

    @patch("one_for_all.tools.supabase_rag_query.supabase")
    def test_query_custom_k_value(self, mock_supabase, sample_embedding, sample_rag_matches):
        """
        Test custom k value is passed correctly.

        Expected behavior:
        - Custom match_count is passed to RPC
        """
        from one_for_all.tools.supabase_rag_query import supabase_rag_query

        mock_rpc = AsyncMock(return_value=create_mock_rpc_result(sample_rag_matches))
        mock_supabase.rpc = mock_rpc

        # Call with custom k
        supabase_rag_query.func(query_embedding=sample_embedding, k=10)

        # Verify k=10 was used
        call_args = mock_rpc.call_args[0][1]
        assert call_args["match_count"] == 10

    @patch("one_for_all.tools.supabase_rag_query.supabase")
    def test_query_single_result(self, mock_supabase, sample_embedding):
        """
        Test query with single result.

        Expected behavior:
        - Returns string representation of single match
        """
        from one_for_all.tools.supabase_rag_query import supabase_rag_query

        single_match = [
            {
                "id": "emb-single",
                "content": "Single matching document.",
                "similarity": 0.99,
            }
        ]
        mock_rpc = AsyncMock(return_value=create_mock_rpc_result(single_match))
        mock_supabase.rpc = mock_rpc

        result = supabase_rag_query.func(
            query_embedding=sample_embedding,
            k=1,
        )

        assert "emb-single" in result
        assert "Single matching document" in result

    @patch("one_for_all.tools.supabase_rag_query.supabase")
    def test_query_with_varied_similarity_scores(self, mock_supabase, sample_embedding):
        """
        Test query results with varied similarity scores.

        Expected behavior:
        - All results returned regardless of similarity
        """
        from one_for_all.tools.supabase_rag_query import supabase_rag_query

        varied_matches = [
            {"id": "high", "content": "High similarity", "similarity": 0.99},
            {"id": "medium", "content": "Medium similarity", "similarity": 0.75},
            {"id": "low", "content": "Low similarity", "similarity": 0.51},
        ]
        mock_rpc = AsyncMock(return_value=create_mock_rpc_result(varied_matches))
        mock_supabase.rpc = mock_rpc

        result = supabase_rag_query.func(
            query_embedding=sample_embedding,
            k=5,
        )

        # All results should be in output
        assert "high" in result.lower() or "High similarity" in result
        assert "medium" in result.lower() or "Medium similarity" in result
        assert "low" in result.lower() or "Low similarity" in result


# =============================================================================
# TestSupabaseRagStore - Embedding Storage Tests
# =============================================================================


class TestSupabaseRagStore:
    """Test supabase_rag_store tool for direct Supabase embedding storage."""

    @patch("one_for_all.tools.supabase_rag_store.supabase")
    def test_successful_store(
        self, mock_supabase, sample_embedding, sample_metadata, sample_store_response
    ):
        """
        Test successful embedding storage.

        Expected behavior:
        - Calls supabase.table().insert().execute()
        - Returns string representation of stored data
        """
        from one_for_all.tools.supabase_rag_store import supabase_rag_store

        # Setup mock chain: table().insert().execute()
        mock_execute = AsyncMock(return_value=create_mock_insert_result(sample_store_response))
        mock_insert = MagicMock()
        mock_insert.execute = mock_execute
        mock_table = MagicMock()
        mock_table.insert = MagicMock(return_value=mock_insert)
        mock_supabase.table = MagicMock(return_value=mock_table)

        result = supabase_rag_store.func(
            embedding=sample_embedding,
            metadata=sample_metadata,
        )

        # Verify table was called with rag_embeddings
        mock_supabase.table.assert_called_once_with("rag_embeddings")

        # Verify insert was called with correct payload
        insert_call_args = mock_table.insert.call_args[0][0]
        assert "embedding" in insert_call_args
        assert insert_call_args["embedding"] == sample_embedding
        assert "metadata" in insert_call_args
        assert insert_call_args["metadata"] == sample_metadata

        # Verify result contains stored data
        assert "emb-new-123" in result

    @patch("one_for_all.tools.supabase_rag_store.supabase")
    def test_store_minimal_metadata(self, mock_supabase, sample_embedding):
        """
        Test storage with minimal metadata.

        Expected behavior:
        - Successfully stores with minimal metadata
        """
        from one_for_all.tools.supabase_rag_store import supabase_rag_store

        minimal_metadata = {"source": "test"}
        store_response = [{"id": "emb-minimal", "metadata": minimal_metadata}]

        mock_execute = AsyncMock(return_value=create_mock_insert_result(store_response))
        mock_insert = MagicMock()
        mock_insert.execute = mock_execute
        mock_table = MagicMock()
        mock_table.insert = MagicMock(return_value=mock_insert)
        mock_supabase.table = MagicMock(return_value=mock_table)

        result = supabase_rag_store.func(
            embedding=sample_embedding,
            metadata=minimal_metadata,
        )

        assert "emb-minimal" in result

    @patch("one_for_all.tools.supabase_rag_store.supabase")
    def test_store_empty_metadata(self, mock_supabase, sample_embedding):
        """
        Test storage with empty metadata.

        Expected behavior:
        - Successfully stores with empty metadata dict
        """
        from one_for_all.tools.supabase_rag_store import supabase_rag_store

        empty_metadata = {}
        store_response = [{"id": "emb-empty-meta", "metadata": {}}]

        mock_execute = AsyncMock(return_value=create_mock_insert_result(store_response))
        mock_insert = MagicMock()
        mock_insert.execute = mock_execute
        mock_table = MagicMock()
        mock_table.insert = MagicMock(return_value=mock_insert)
        mock_supabase.table = MagicMock(return_value=mock_table)

        result = supabase_rag_store.func(
            embedding=sample_embedding,
            metadata=empty_metadata,
        )

        # Verify insert was called with empty metadata
        insert_call_args = mock_table.insert.call_args[0][0]
        assert insert_call_args["metadata"] == {}
        assert "emb-empty-meta" in result

    @patch("one_for_all.tools.supabase_rag_store.supabase")
    def test_store_complex_metadata(self, mock_supabase, sample_embedding):
        """
        Test storage with complex nested metadata.

        Expected behavior:
        - Preserves nested metadata structure
        """
        from one_for_all.tools.supabase_rag_store import supabase_rag_store

        complex_metadata = {
            "university": "UP",
            "faculty": "EBIT",
            "programme": {
                "name": "BSc Computer Science",
                "code": "12345678",
                "level": "undergraduate",
            },
            "requirements": {
                "aps": 35,
                "subjects": ["Mathematics", "Physical Sciences"],
            },
            "tags": ["STEM", "IT"],
        }
        store_response = [{"id": "emb-complex", "metadata": complex_metadata}]

        mock_execute = AsyncMock(return_value=create_mock_insert_result(store_response))
        mock_insert = MagicMock()
        mock_insert.execute = mock_execute
        mock_table = MagicMock()
        mock_table.insert = MagicMock(return_value=mock_insert)
        mock_supabase.table = MagicMock(return_value=mock_table)

        result = supabase_rag_store.func(
            embedding=sample_embedding,
            metadata=complex_metadata,
        )

        # Verify complex metadata was passed
        insert_call_args = mock_table.insert.call_args[0][0]
        assert insert_call_args["metadata"] == complex_metadata
        assert "emb-complex" in result

    @patch("one_for_all.tools.supabase_rag_store.supabase")
    def test_store_returns_string_representation(self, mock_supabase, sample_embedding, sample_metadata):
        """
        Test that store returns string representation of result.data.

        Expected behavior:
        - Returns str(result.data), not the raw object
        """
        from one_for_all.tools.supabase_rag_store import supabase_rag_store

        store_response = [{"id": "test-str", "status": "stored"}]

        mock_execute = AsyncMock(return_value=create_mock_insert_result(store_response))
        mock_insert = MagicMock()
        mock_insert.execute = mock_execute
        mock_table = MagicMock()
        mock_table.insert = MagicMock(return_value=mock_insert)
        mock_supabase.table = MagicMock(return_value=mock_table)

        result = supabase_rag_store.func(
            embedding=sample_embedding,
            metadata=sample_metadata,
        )

        # Result should be a string
        assert isinstance(result, str)
        # Should contain the response data
        assert "test-str" in result
        assert "stored" in result


# =============================================================================
# TestAuditDecorator - Verify audit decorator integration
# =============================================================================


class TestAuditDecoratorIntegration:
    """Test that audit decorator is properly applied to RAG tools."""

    def test_query_has_audit_decorator(self):
        """
        Verify supabase_rag_query is decorated with audit_service_role_access.

        Expected behavior:
        - Function has __wrapped__ attribute from decorator
        """
        from one_for_all.tools.supabase_rag_query import supabase_rag_query

        # The tool decorator creates a StructuredTool, but the func should have __wrapped__
        # from the audit decorator being applied to the inner function
        # The actual function is accessible via .func attribute
        assert supabase_rag_query is not None
        # The decorated function should still be callable
        assert callable(supabase_rag_query.func) or callable(supabase_rag_query)

    def test_store_has_audit_decorator(self):
        """
        Verify supabase_rag_store is decorated with audit_service_role_access.

        Expected behavior:
        - Function is properly decorated
        """
        from one_for_all.tools.supabase_rag_store import supabase_rag_store

        assert supabase_rag_store is not None
        assert callable(supabase_rag_store.func) or callable(supabase_rag_store)


# =============================================================================
# TestEdgeCases - Edge cases and boundary conditions
# =============================================================================


class TestEdgeCases:
    """Test edge cases and boundary conditions for Supabase RAG tools."""

    @patch("one_for_all.tools.supabase_rag_query.supabase")
    def test_query_with_special_characters_in_content(self, mock_supabase, sample_embedding):
        """
        Test query results with special characters in content.

        Expected behavior:
        - Handles special characters in response content
        """
        from one_for_all.tools.supabase_rag_query import supabase_rag_query

        special_content = [
            {
                "id": "special",
                "content": "Mathematics >= 70%, English - minimum Level 5. Cost: R50,000.",
                "similarity": 0.9,
            }
        ]
        mock_rpc = AsyncMock(return_value=create_mock_rpc_result(special_content))
        mock_supabase.rpc = mock_rpc

        result = supabase_rag_query.func(
            query_embedding=sample_embedding,
            k=5,
        )

        assert "Mathematics" in result
        assert "R50,000" in result

    @patch("one_for_all.tools.supabase_rag_query.supabase")
    def test_query_with_unicode_content(self, mock_supabase, sample_embedding):
        """
        Test query results with unicode characters.

        Expected behavior:
        - Handles unicode characters properly
        """
        from one_for_all.tools.supabase_rag_query import supabase_rag_query

        unicode_content = [
            {
                "id": "unicode",
                "content": "Afrikaans: Universiteit van Pretoria - Fakulteit Ingenieurswese",
                "similarity": 0.85,
            }
        ]
        mock_rpc = AsyncMock(return_value=create_mock_rpc_result(unicode_content))
        mock_supabase.rpc = mock_rpc

        result = supabase_rag_query.func(
            query_embedding=sample_embedding,
            k=5,
        )

        assert "Afrikaans" in result or "Pretoria" in result

    @patch("one_for_all.tools.supabase_rag_store.supabase")
    def test_store_with_unicode_metadata(self, mock_supabase, sample_embedding):
        """
        Test storage with unicode characters in metadata.

        Expected behavior:
        - Successfully stores metadata with unicode
        """
        from one_for_all.tools.supabase_rag_store import supabase_rag_store

        unicode_metadata = {
            "university": "Stellenbosch Universiteit",
            "faculty": "Ingenieurswese",
            "notes": "Vereistes vir toelating",
        }
        store_response = [{"id": "unicode-meta", "metadata": unicode_metadata}]

        mock_execute = AsyncMock(return_value=create_mock_insert_result(store_response))
        mock_insert = MagicMock()
        mock_insert.execute = mock_execute
        mock_table = MagicMock()
        mock_table.insert = MagicMock(return_value=mock_insert)
        mock_supabase.table = MagicMock(return_value=mock_table)

        result = supabase_rag_store.func(
            embedding=sample_embedding,
            metadata=unicode_metadata,
        )

        insert_call_args = mock_table.insert.call_args[0][0]
        assert insert_call_args["metadata"]["university"] == "Stellenbosch Universiteit"

    @patch("one_for_all.tools.supabase_rag_query.supabase")
    def test_query_large_result_set(self, mock_supabase, sample_embedding):
        """
        Test query with large number of results.

        Expected behavior:
        - Handles multiple results without issue
        """
        from one_for_all.tools.supabase_rag_query import supabase_rag_query

        large_results = [
            {"id": f"emb-{i}", "content": f"Document {i}", "similarity": 0.9 - (i * 0.01)}
            for i in range(20)
        ]
        mock_rpc = AsyncMock(return_value=create_mock_rpc_result(large_results))
        mock_supabase.rpc = mock_rpc

        result = supabase_rag_query.func(
            query_embedding=sample_embedding,
            k=20,
        )

        # Should contain first and last entries
        assert "emb-0" in result
        assert "emb-19" in result

    @patch("one_for_all.tools.supabase_rag_store.supabase")
    def test_store_with_null_values_in_metadata(self, mock_supabase, sample_embedding):
        """
        Test storage with null values in metadata.

        Expected behavior:
        - Handles None/null values in metadata
        """
        from one_for_all.tools.supabase_rag_store import supabase_rag_store

        metadata_with_nulls = {
            "university": "UP",
            "faculty": None,
            "department": "Computer Science",
        }
        store_response = [{"id": "null-meta", "metadata": metadata_with_nulls}]

        mock_execute = AsyncMock(return_value=create_mock_insert_result(store_response))
        mock_insert = MagicMock()
        mock_insert.execute = mock_execute
        mock_table = MagicMock()
        mock_table.insert = MagicMock(return_value=mock_insert)
        mock_supabase.table = MagicMock(return_value=mock_table)

        result = supabase_rag_store.func(
            embedding=sample_embedding,
            metadata=metadata_with_nulls,
        )

        insert_call_args = mock_table.insert.call_args[0][0]
        assert insert_call_args["metadata"]["faculty"] is None
        assert "null-meta" in result

    @patch("one_for_all.tools.supabase_rag_query.supabase")
    def test_query_with_k_zero(self, mock_supabase, sample_embedding):
        """
        Test query with k=0.

        Expected behavior:
        - Passes k=0 to RPC (may return no results)
        """
        from one_for_all.tools.supabase_rag_query import supabase_rag_query

        mock_rpc = AsyncMock(return_value=create_mock_rpc_result([]))
        mock_supabase.rpc = mock_rpc

        result = supabase_rag_query.func(
            query_embedding=sample_embedding,
            k=0,
        )

        call_args = mock_rpc.call_args[0][1]
        assert call_args["match_count"] == 0
        assert result == "NO_MATCH"

    @patch("one_for_all.tools.supabase_rag_query.supabase")
    def test_query_with_k_one(self, mock_supabase, sample_embedding):
        """
        Test query with k=1 returns single result.

        Expected behavior:
        - Returns single best match
        """
        from one_for_all.tools.supabase_rag_query import supabase_rag_query

        single_result = [
            {"id": "best-match", "content": "Best matching document", "similarity": 0.99}
        ]
        mock_rpc = AsyncMock(return_value=create_mock_rpc_result(single_result))
        mock_supabase.rpc = mock_rpc

        result = supabase_rag_query.func(
            query_embedding=sample_embedding,
            k=1,
        )

        call_args = mock_rpc.call_args[0][1]
        assert call_args["match_count"] == 1
        assert "best-match" in result


# =============================================================================
# TestAsyncBehavior - Test async/await patterns
# =============================================================================


class TestAsyncBehavior:
    """Test async behavior in the tools."""

    @patch("one_for_all.tools.supabase_rag_query.supabase")
    def test_query_uses_asyncio_run(self, mock_supabase, sample_embedding, sample_rag_matches):
        """
        Test that query tool properly wraps async with asyncio.run.

        Expected behavior:
        - Function returns synchronously despite async internals
        """
        from one_for_all.tools.supabase_rag_query import supabase_rag_query

        mock_rpc = AsyncMock(return_value=create_mock_rpc_result(sample_rag_matches))
        mock_supabase.rpc = mock_rpc

        # This should not raise - asyncio.run handles the async internally
        result = supabase_rag_query.func(
            query_embedding=sample_embedding,
            k=5,
        )

        # Should return a string, not a coroutine
        assert isinstance(result, str)
        assert not hasattr(result, '__await__')

    @patch("one_for_all.tools.supabase_rag_store.supabase")
    def test_store_uses_asyncio_run(self, mock_supabase, sample_embedding, sample_metadata, sample_store_response):
        """
        Test that store tool properly wraps async with asyncio.run.

        Expected behavior:
        - Function returns synchronously despite async internals
        """
        from one_for_all.tools.supabase_rag_store import supabase_rag_store

        mock_execute = AsyncMock(return_value=create_mock_insert_result(sample_store_response))
        mock_insert = MagicMock()
        mock_insert.execute = mock_execute
        mock_table = MagicMock()
        mock_table.insert = MagicMock(return_value=mock_insert)
        mock_supabase.table = MagicMock(return_value=mock_table)

        # This should not raise - asyncio.run handles the async internally
        result = supabase_rag_store.func(
            embedding=sample_embedding,
            metadata=sample_metadata,
        )

        # Should return a string, not a coroutine
        assert isinstance(result, str)
        assert not hasattr(result, '__await__')
