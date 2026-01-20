"""
Policy Keyword Search Tools

CrewAI tools for fast keyword-based policy search using PostgreSQL full-text
search with BM25-style ranking. Designed for <100ms P95 latency.

This module provides:
- Fast keyword search using PostgreSQL tsvector/tsquery
- Query preprocessing and normalization
- Result ranking and deduplication
- Simple query detection for routing decisions
"""

import asyncio
import json
import os
import re
import time
from typing import Optional

from crewai.tools import tool

from .supabase_client import supabase


# =============================================================================
# CONFIGURATION
# =============================================================================

# Feature flags loaded from environment
POLICY_PRIMARY_SEARCH = os.getenv("POLICY_PRIMARY_SEARCH", "keyword")
POLICY_SEMANTIC_FALLBACK = os.getenv("POLICY_SEMANTIC_FALLBACK", "true").lower() == "true"
SEARCH_LATENCY_LOG_THRESHOLD_MS = int(os.getenv("SEARCH_LATENCY_LOG_THRESHOLD_MS", "100"))


# =============================================================================
# QUERY ANALYSIS UTILITIES
# =============================================================================

# Common stopwords for query simplification (subset - Postgres handles full list)
STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "can", "what", "which", "who",
    "whom", "this", "that", "these", "those", "i", "you", "he", "she",
    "it", "we", "they", "me", "him", "her", "us", "them", "my", "your",
}

# Patterns indicating complex queries better suited for semantic search
COMPLEX_QUERY_PATTERNS = [
    r"\b(how|why|explain|compare|difference|between|relationship)\b",
    r"\b(similar to|like|such as|for example)\b",
    r"\b(best|better|worse|optimal|recommended)\b",
    r"\b(what if|suppose|assuming|given that)\b",
]


def analyze_query_complexity(query: str) -> dict:
    """
    Analyze a query to determine its complexity and optimal search method.

    Simple queries (single words, exact phrases, specific terms) work best
    with keyword search. Complex queries (multi-concept, comparative,
    explanatory) benefit from semantic search.

    Args:
        query: The search query text

    Returns:
        dict with:
        - is_simple: bool indicating if keyword search is preferred
        - complexity_score: 0-1 score (higher = more complex)
        - word_count: number of significant words
        - has_complex_patterns: bool for multi-concept patterns
        - recommendation: "keyword" | "semantic" | "hybrid"
    """
    query_lower = query.lower().strip()
    words = query_lower.split()

    # Remove stopwords for meaningful word count
    significant_words = [w for w in words if w not in STOPWORDS and len(w) > 2]
    word_count = len(significant_words)

    # Check for complex patterns
    has_complex_patterns = any(
        re.search(pattern, query_lower)
        for pattern in COMPLEX_QUERY_PATTERNS
    )

    # Check for exact phrase (quoted)
    is_exact_phrase = query.startswith('"') and query.endswith('"')

    # Calculate complexity score
    complexity_factors = []

    # Word count factor (1-2 words = simple, 5+ = complex)
    if word_count <= 2:
        complexity_factors.append(0.1)
    elif word_count <= 4:
        complexity_factors.append(0.3)
    else:
        complexity_factors.append(0.6)

    # Complex pattern factor
    if has_complex_patterns:
        complexity_factors.append(0.4)
    else:
        complexity_factors.append(0.0)

    # Question word factor
    if any(query_lower.startswith(q) for q in ["what", "why", "how", "when", "where"]):
        complexity_factors.append(0.2)
    else:
        complexity_factors.append(0.0)

    complexity_score = min(1.0, sum(complexity_factors))

    # Determine if query is simple enough for keyword search
    is_simple = (
        complexity_score < 0.4
        or is_exact_phrase
        or word_count <= 2
    )

    # Recommendation based on analysis
    if is_simple:
        recommendation = "keyword"
    elif complexity_score > 0.7:
        recommendation = "semantic"
    else:
        recommendation = "hybrid"

    return {
        "is_simple": is_simple,
        "complexity_score": round(complexity_score, 2),
        "word_count": word_count,
        "has_complex_patterns": has_complex_patterns,
        "is_exact_phrase": is_exact_phrase,
        "recommendation": recommendation,
    }


def preprocess_query(query: str) -> str:
    """
    Preprocess a query for PostgreSQL full-text search.

    - Normalizes whitespace
    - Handles quoted phrases
    - Removes special characters that could break tsquery

    Args:
        query: Raw query string

    Returns:
        Preprocessed query safe for websearch_to_tsquery
    """
    # Normalize whitespace
    query = " ".join(query.split())

    # Remove characters that could cause tsquery parsing issues
    # Keep alphanumeric, spaces, quotes, and hyphens
    query = re.sub(r"[^\w\s\"\'-]", " ", query)

    # Normalize multiple spaces again
    query = " ".join(query.split())

    return query.strip()


# =============================================================================
# KEYWORD SEARCH TOOL
# =============================================================================

@tool
def keyword_search_policies(
    query: str,
    institution_id: Optional[str] = None,
    source: Optional[str] = None,
    k: int = 5
) -> str:
    """
    Fast keyword search for admission policies using PostgreSQL full-text search.

    This tool provides BM25-style ranking with <100ms latency. Use it for:
    - Simple lookups (e.g., "APS requirements")
    - Exact phrase searches (e.g., '"conditional acceptance"')
    - Specific term queries (e.g., "NSFAS eligibility")

    For complex, multi-concept queries, use search_policies instead.

    Args:
        query: Search terms (supports phrases in quotes, OR/AND operators)
        institution_id: Optional UUID to filter by institution
        source: Optional source name filter (e.g., "UCT", "Wits")
        k: Number of results to return (default 5, max 20)

    Returns:
        JSON string with:
        - matches: Array of {content, source, rank, headline}
        - query_analysis: Complexity metrics
        - latency_ms: Search execution time
        - total_found: Number of results

    Example:
        result = keyword_search_policies(
            query="minimum APS score engineering",
            institution_id="123e4567-e89b-12d3-a456-426614174000",
            k=5
        )
    """

    async def async_search():
        start_time = time.perf_counter()

        try:
            # Validate inputs
            if not query or len(query.strip()) < 2:
                return json.dumps({
                    "error": "Query must be at least 2 characters",
                    "query": query,
                    "matches": [],
                })

            # Preprocess and analyze query
            processed_query = preprocess_query(query)
            query_analysis = analyze_query_complexity(processed_query)

            k_clamped = min(max(k, 1), 20)

            # Build RPC parameters
            params = {
                "search_query": processed_query,
                "max_results": k_clamped,
            }

            if institution_id:
                params["filter_institution_id"] = institution_id

            if source:
                params["filter_source"] = source

            # Execute keyword search via RPC
            result = await supabase.rpc("policy_keyword_search", params).execute()

            latency_ms = (time.perf_counter() - start_time) * 1000

            # Log if latency exceeds threshold
            if latency_ms > SEARCH_LATENCY_LOG_THRESHOLD_MS:
                print(f"[SEARCH_LATENCY] keyword_search took {latency_ms:.1f}ms for query: {query[:50]}")

            if not result.data:
                return json.dumps({
                    "query": query,
                    "processed_query": processed_query,
                    "query_analysis": query_analysis,
                    "matches": [],
                    "total_found": 0,
                    "latency_ms": round(latency_ms, 1),
                    "message": "No matching policies found. Consider using semantic search for complex queries.",
                    "fallback_recommended": query_analysis["recommendation"] != "keyword",
                })

            # Format results
            matches = []
            for item in result.data:
                matches.append({
                    "id": str(item.get("id", "")),
                    "content": item.get("chunk", ""),
                    "source": item.get("source", "Unknown"),
                    "rank": round(float(item.get("rank", 0)), 4),
                    "headline": item.get("headline", ""),
                    "metadata": item.get("metadata", {}),
                })

            return json.dumps({
                "query": query,
                "processed_query": processed_query,
                "query_analysis": query_analysis,
                "matches": matches,
                "total_found": len(matches),
                "latency_ms": round(latency_ms, 1),
                "search_type": "keyword",
            })

        except Exception as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            return json.dumps({
                "error": f"KEYWORD_SEARCH_ERROR: {str(e)}",
                "query": query,
                "matches": [],
                "latency_ms": round(latency_ms, 1),
            })

    return asyncio.run(async_search())


@tool
def analyze_search_query(query: str) -> str:
    """
    Analyze a query to determine the optimal search strategy.

    Use this to decide whether to use keyword search (fast, <100ms)
    or semantic search (more accurate for complex queries, ~350ms).

    Args:
        query: The search query to analyze

    Returns:
        JSON string with:
        - recommendation: "keyword" | "semantic" | "hybrid"
        - complexity_score: 0-1 (higher = more complex)
        - is_simple: bool for quick routing decisions
        - reasoning: Explanation of the recommendation

    Example:
        result = analyze_search_query("What are the conditional acceptance criteria for engineering?")
        # Returns: {"recommendation": "semantic", "complexity_score": 0.6, ...}
    """
    try:
        processed_query = preprocess_query(query)
        analysis = analyze_query_complexity(processed_query)

        # Generate reasoning
        reasons = []
        if analysis["word_count"] <= 2:
            reasons.append(f"Short query ({analysis['word_count']} significant words)")
        elif analysis["word_count"] > 4:
            reasons.append(f"Long query ({analysis['word_count']} significant words)")

        if analysis["has_complex_patterns"]:
            reasons.append("Contains comparative/explanatory patterns")

        if analysis["is_exact_phrase"]:
            reasons.append("Exact phrase search requested")

        if analysis["is_simple"]:
            reasons.append("Query structure is simple - keyword search will be fast and accurate")
        else:
            reasons.append("Query may benefit from semantic understanding")

        return json.dumps({
            "query": query,
            "processed_query": processed_query,
            **analysis,
            "reasoning": "; ".join(reasons) if reasons else "Standard query",
        })

    except Exception as e:
        return json.dumps({
            "error": f"ANALYSIS_ERROR: {str(e)}",
            "query": query,
            "recommendation": "keyword",  # Default to keyword on error
        })


@tool
def get_search_stats() -> str:
    """
    Get statistics about the full-text search index coverage.

    Use this to monitor the health of the keyword search system
    and identify potential indexing issues.

    Returns:
        JSON string with:
        - total_embeddings: Total documents in RAG store
        - indexed_for_fts: Documents with full-text search index
        - unique_sources: Number of unique sources
        - avg_terms_per_doc: Average searchable terms per document
    """

    async def async_stats():
        try:
            result = await supabase.from_("rag_search_stats").select("*").execute()

            if result.data and len(result.data) > 0:
                stats = result.data[0]
                return json.dumps({
                    "total_embeddings": stats.get("total_embeddings", 0),
                    "indexed_for_fts": stats.get("indexed_for_fts", 0),
                    "unique_sources": stats.get("unique_sources", 0),
                    "unique_institutions": stats.get("unique_institutions", 0),
                    "avg_terms_per_doc": round(float(stats.get("avg_terms_per_doc", 0)), 1),
                    "index_coverage_pct": round(
                        100 * stats.get("indexed_for_fts", 0) / max(stats.get("total_embeddings", 1), 1),
                        1
                    ),
                })

            return json.dumps({
                "error": "No stats available",
                "message": "The rag_search_stats view may not be populated yet",
            })

        except Exception as e:
            return json.dumps({
                "error": f"STATS_ERROR: {str(e)}",
            })

    return asyncio.run(async_stats())


# =============================================================================
# DEDUPLICATION UTILITIES
# =============================================================================

def deduplicate_results(results: list, similarity_threshold: float = 0.9) -> list:
    """
    Remove near-duplicate results based on content similarity.

    Uses a simple character-level Jaccard similarity for efficiency.
    This helps when the same content appears from multiple sources.

    Args:
        results: List of result dicts with 'content' field
        similarity_threshold: 0-1 threshold for considering duplicates

    Returns:
        Deduplicated list of results preserving order
    """
    if not results:
        return results

    def get_shingles(text: str, k: int = 3) -> set:
        """Get character k-shingles for similarity comparison."""
        text = text.lower().replace(" ", "")
        return set(text[i:i+k] for i in range(len(text) - k + 1))

    def jaccard_similarity(set1: set, set2: set) -> float:
        """Calculate Jaccard similarity between two sets."""
        if not set1 or not set2:
            return 0.0
        intersection = len(set1 & set2)
        union = len(set1 | set2)
        return intersection / union if union > 0 else 0.0

    deduplicated = []
    seen_shingles = []

    for result in results:
        content = result.get("content", "")
        if len(content) < 10:
            deduplicated.append(result)
            continue

        shingles = get_shingles(content)

        # Check against existing results
        is_duplicate = False
        for existing_shingles in seen_shingles:
            if jaccard_similarity(shingles, existing_shingles) > similarity_threshold:
                is_duplicate = True
                break

        if not is_duplicate:
            deduplicated.append(result)
            seen_shingles.append(shingles)

    return deduplicated
