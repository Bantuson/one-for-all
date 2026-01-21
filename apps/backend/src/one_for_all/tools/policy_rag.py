"""
Policy RAG Tools

CrewAI tools for searching admission policies and course criteria using
hybrid search: keyword-first (BM25-style) with semantic fallback (pgvector).

Search Strategy:
- Simple queries -> Keyword search (<100ms latency)
- Complex/ambiguous queries -> Semantic search (~350ms latency)
- Configurable via POLICY_PRIMARY_SEARCH env var

Feature Flags:
- POLICY_PRIMARY_SEARCH: "keyword" | "semantic" | "hybrid" (default: "keyword")
- POLICY_SEMANTIC_FALLBACK: "true" | "false" (default: "true")
"""

import asyncio
import json
import os
import time
from typing import Optional

from crewai.tools import tool

from .supabase_client import supabase
from .policy_keyword_search import (
    analyze_query_complexity,
    preprocess_query,
    deduplicate_results,
    STOPWORDS,
)
from ..utils.db_audit import audit_service_role_access


# =============================================================================
# CONFIGURATION
# =============================================================================

# Search strategy configuration
POLICY_PRIMARY_SEARCH = os.getenv("POLICY_PRIMARY_SEARCH", "keyword")
POLICY_SEMANTIC_FALLBACK = os.getenv("POLICY_SEMANTIC_FALLBACK", "true").lower() == "true"
SEARCH_LATENCY_LOG_THRESHOLD_MS = int(os.getenv("SEARCH_LATENCY_LOG_THRESHOLD_MS", "100"))

# Thresholds for routing decisions
KEYWORD_MIN_RESULTS = int(os.getenv("KEYWORD_MIN_RESULTS", "2"))
COMPLEXITY_SEMANTIC_THRESHOLD = float(os.getenv("COMPLEXITY_SEMANTIC_THRESHOLD", "0.5"))


# =============================================================================
# INTERNAL SEARCH FUNCTIONS
# =============================================================================

async def _keyword_search(
    query: str,
    institution_id: Optional[str],
    source: Optional[str],
    k: int
) -> dict:
    """
    Execute keyword search using PostgreSQL full-text search.

    Returns dict with results and timing metrics.
    """
    start_time = time.perf_counter()

    processed_query = preprocess_query(query)

    params = {
        "search_query": processed_query,
        "max_results": k,
    }

    if institution_id:
        params["filter_institution_id"] = institution_id
    if source:
        params["filter_source"] = source

    try:
        result = await supabase.rpc("policy_keyword_search", params).execute()
        latency_ms = (time.perf_counter() - start_time) * 1000

        matches = []
        if result.data:
            for item in result.data:
                matches.append({
                    "id": str(item.get("id", "")),
                    "content": item.get("chunk", ""),
                    "source": item.get("source", "Unknown"),
                    "similarity": round(float(item.get("rank", 0)), 4),
                    "headline": item.get("headline", ""),
                    "metadata": item.get("metadata", {}),
                })

        return {
            "matches": matches,
            "latency_ms": round(latency_ms, 1),
            "search_type": "keyword",
            "success": True,
        }

    except Exception as e:
        latency_ms = (time.perf_counter() - start_time) * 1000
        return {
            "matches": [],
            "latency_ms": round(latency_ms, 1),
            "search_type": "keyword",
            "success": False,
            "error": str(e),
        }


async def _semantic_search(
    query: str,
    institution_id: Optional[str],
    k: int
) -> dict:
    """
    Execute semantic search using pgvector similarity.

    Returns dict with results and timing metrics.
    """
    start_time = time.perf_counter()

    params = {
        "query_text": query.strip(),
        "match_count": k,
    }

    if institution_id:
        params["filter_institution_id"] = institution_id

    try:
        # Try the match_policies RPC first
        try:
            result = await supabase.rpc("match_policies", params).execute()
        except Exception:
            # Fallback: search rag_embeddings table directly with text match
            query_builder = (
                supabase.table("rag_embeddings")
                .select("id, chunk, source, metadata, created_at")
                .ilike("chunk", f"%{query.strip()}%")
                .limit(k)
            )

            if institution_id:
                query_builder = query_builder.eq("institution_id", institution_id)

            result = await query_builder.execute()

        latency_ms = (time.perf_counter() - start_time) * 1000

        matches = []
        if result.data:
            for item in result.data:
                matches.append({
                    "id": str(item.get("id", "")),
                    "content": item.get("chunk", item.get("content", "")),
                    "source": item.get("source", "Unknown"),
                    "similarity": round(float(item.get("similarity", 0)), 4),
                    "metadata": item.get("metadata", {}),
                })

        return {
            "matches": matches,
            "latency_ms": round(latency_ms, 1),
            "search_type": "semantic",
            "success": True,
        }

    except Exception as e:
        latency_ms = (time.perf_counter() - start_time) * 1000
        return {
            "matches": [],
            "latency_ms": round(latency_ms, 1),
            "search_type": "semantic",
            "success": False,
            "error": str(e),
        }


async def _hybrid_search(
    query: str,
    institution_id: Optional[str],
    k: int
) -> dict:
    """
    Execute hybrid search using Reciprocal Rank Fusion.

    Combines keyword and semantic results for best of both worlds.
    """
    start_time = time.perf_counter()

    # Run both searches in parallel
    keyword_task = _keyword_search(query, institution_id, None, k * 2)
    semantic_task = _semantic_search(query, institution_id, k * 2)

    keyword_result, semantic_result = await asyncio.gather(keyword_task, semantic_task)

    # Merge results using RRF
    rrf_k = 60  # Standard RRF constant

    # Build position maps
    keyword_positions = {
        m["id"]: (i + 1, m) for i, m in enumerate(keyword_result["matches"])
    }
    semantic_positions = {
        m["id"]: (i + 1, m) for i, m in enumerate(semantic_result["matches"])
    }

    # Get all unique IDs
    all_ids = set(keyword_positions.keys()) | set(semantic_positions.keys())

    # Calculate RRF scores
    rrf_scored = []
    for doc_id in all_ids:
        kw_pos, kw_match = keyword_positions.get(doc_id, (None, None))
        sem_pos, sem_match = semantic_positions.get(doc_id, (None, None))

        # RRF score: 1/(k + position) for each ranking
        kw_score = 1.0 / (rrf_k + kw_pos) if kw_pos else 0
        sem_score = 1.0 / (rrf_k + sem_pos) if sem_pos else 0
        rrf_score = kw_score + sem_score

        # Use whichever match we have
        match = kw_match or sem_match
        if match:
            match = match.copy()
            match["rrf_score"] = round(rrf_score, 6)
            match["keyword_rank"] = kw_pos
            match["semantic_rank"] = sem_pos
            rrf_scored.append(match)

    # Sort by RRF score and take top k
    rrf_scored.sort(key=lambda x: x["rrf_score"], reverse=True)
    matches = rrf_scored[:k]

    latency_ms = (time.perf_counter() - start_time) * 1000

    return {
        "matches": matches,
        "latency_ms": round(latency_ms, 1),
        "search_type": "hybrid",
        "keyword_latency_ms": keyword_result["latency_ms"],
        "semantic_latency_ms": semantic_result["latency_ms"],
        "success": True,
    }


# =============================================================================
# MAIN SEARCH TOOL
# =============================================================================

@audit_service_role_access(table="rag_embeddings", operation="select")
@tool
def search_policies(
    query: str,
    institution_id: Optional[str] = None,
    k: int = 5,
    force_search_type: Optional[str] = None
) -> str:
    """
    Search admission policies using intelligent hybrid search.

    This tool automatically routes queries to the optimal search method:
    - Simple queries (keywords, exact phrases) -> Fast keyword search (<100ms)
    - Complex queries (multi-concept, comparative) -> Semantic search (~350ms)
    - Ambiguous queries -> Hybrid search (RRF fusion)

    Override automatic routing with force_search_type parameter.

    Args:
        query: Natural language search query (e.g., "conditional acceptance criteria")
        institution_id: Optional UUID to filter policies by institution
        k: Number of results to return (default 5, max 20)
        force_search_type: Optional override: "keyword" | "semantic" | "hybrid"

    Returns:
        JSON string with matching policy documents including:
        - content: The policy text
        - source: URL or document reference
        - similarity: Relevance score (0-1)
        - metadata: Additional context
        - search_type: Which search method was used
        - latency_ms: Search execution time

    Example:
        result = search_policies(
            query="What are the requirements for conditional acceptance?",
            institution_id="123e4567-e89b-12d3-a456-426614174000",
            k=5
        )
    """

    async def async_search():
        total_start = time.perf_counter()

        try:
            # Validate inputs
            if not query or len(query.strip()) < 3:
                return json.dumps({
                    "error": "Query must be at least 3 characters",
                    "query": query,
                    "matches": [],
                })

            k_clamped = min(max(k, 1), 20)

            # Analyze query complexity for routing decision
            query_analysis = analyze_query_complexity(query)

            # Determine search type
            if force_search_type:
                search_type = force_search_type.lower()
            elif POLICY_PRIMARY_SEARCH == "hybrid":
                search_type = "hybrid"
            elif POLICY_PRIMARY_SEARCH == "semantic":
                search_type = "semantic"
            elif query_analysis["complexity_score"] > COMPLEXITY_SEMANTIC_THRESHOLD:
                # Complex query - use semantic or hybrid based on config
                search_type = "hybrid" if POLICY_SEMANTIC_FALLBACK else "semantic"
            else:
                # Simple query - use keyword search
                search_type = "keyword"

            # Execute appropriate search
            if search_type == "keyword":
                result = await _keyword_search(query, institution_id, None, k_clamped)

                # Fallback to semantic if keyword returns too few results
                if (
                    POLICY_SEMANTIC_FALLBACK
                    and len(result["matches"]) < KEYWORD_MIN_RESULTS
                    and result["success"]
                ):
                    semantic_result = await _semantic_search(query, institution_id, k_clamped)
                    if len(semantic_result["matches"]) > len(result["matches"]):
                        result = semantic_result
                        result["fallback_used"] = True

            elif search_type == "semantic":
                result = await _semantic_search(query, institution_id, k_clamped)

            else:  # hybrid
                result = await _hybrid_search(query, institution_id, k_clamped)

            # Deduplicate results
            if result["matches"]:
                result["matches"] = deduplicate_results(result["matches"])

            total_latency_ms = (time.perf_counter() - total_start) * 1000

            # Log if latency exceeds threshold
            if total_latency_ms > SEARCH_LATENCY_LOG_THRESHOLD_MS:
                print(
                    f"[SEARCH_LATENCY] search_policies ({result.get('search_type', 'unknown')}) "
                    f"took {total_latency_ms:.1f}ms for query: {query[:50]}"
                )

            if not result["matches"]:
                return json.dumps({
                    "query": query,
                    "matches": [],
                    "total_found": 0,
                    "search_type": result.get("search_type", "unknown"),
                    "latency_ms": round(total_latency_ms, 1),
                    "query_analysis": query_analysis,
                    "message": "No matching policies found. Try rephrasing your query.",
                })

            return json.dumps({
                "query": query,
                "matches": result["matches"],
                "total_found": len(result["matches"]),
                "institution_id": institution_id,
                "search_type": result.get("search_type", "unknown"),
                "latency_ms": round(total_latency_ms, 1),
                "query_analysis": query_analysis,
                "fallback_used": result.get("fallback_used", False),
            })

        except Exception as e:
            total_latency_ms = (time.perf_counter() - total_start) * 1000
            return json.dumps({
                "error": f"POLICY_ERROR: {str(e)}",
                "query": query,
                "matches": [],
                "latency_ms": round(total_latency_ms, 1),
            })

    return asyncio.run(async_search())


# =============================================================================
# COURSE CRITERIA TOOL
# =============================================================================

@audit_service_role_access(table="courses", operation="select")
@tool
def get_admission_criteria(course_id: str) -> str:
    """
    Fetch admission criteria for a specific course.

    This tool retrieves the complete admission requirements for a course,
    including APS minimums, subject requirements, and any special conditions.

    Args:
        course_id: UUID of the course

    Returns:
        JSON string with course admission criteria including:
        - course_name: Name of the course
        - course_code: Course code
        - requirements: Admission requirements object
        - faculty: Faculty name
        - institution: Institution name

    Example:
        result = get_admission_criteria(
            course_id="123e4567-e89b-12d3-a456-426614174000"
        )
    """

    async def async_get_criteria():
        try:
            if not course_id:
                return json.dumps({"error": "CRITERIA_ERROR: course_id is required"})

            # Fetch course with related data
            result = (
                await supabase.table("courses")
                .select(
                    "id, name, code, requirements, status, "
                    "faculty:faculties(id, name), "
                    "institution:institutions(id, name, slug)"
                )
                .eq("id", course_id)
                .single()
                .execute()
            )

            if not result.data:
                return json.dumps({"error": f"CRITERIA_ERROR: Course {course_id} not found"})

            course = result.data
            requirements = course.get("requirements", {})

            # Format criteria for reviewer consumption
            criteria = {
                "course_id": course["id"],
                "course_name": course.get("name", "Unknown"),
                "course_code": course.get("code", ""),
                "status": course.get("status", "unknown"),
                "faculty": course.get("faculty", {}).get("name", "Unknown Faculty"),
                "institution": course.get("institution", {}).get("name", "Unknown Institution"),
                "requirements": {
                    "min_aps": requirements.get("min_aps", "Not specified"),
                    "required_subjects": requirements.get("required_subjects", []),
                    "recommended_subjects": requirements.get("recommended_subjects", []),
                    "minimum_levels": requirements.get("minimum_levels", {}),
                    "additional_requirements": requirements.get("additional", []),
                    "notes": requirements.get("notes", ""),
                },
            }

            return json.dumps(criteria)

        except Exception as e:
            return json.dumps({"error": f"CRITERIA_ERROR: {str(e)}"})

    return asyncio.run(async_get_criteria())


# =============================================================================
# SIMILAR COURSES TOOL
# =============================================================================

@audit_service_role_access(table="courses", operation="select")
@tool
def search_similar_courses(
    course_id: str,
    institution_id: Optional[str] = None,
    k: int = 5
) -> str:
    """
    Find courses with similar admission requirements.

    This tool helps reviewers identify alternative courses an applicant
    might qualify for, based on similar APS and subject requirements.

    Args:
        course_id: UUID of the reference course
        institution_id: Optional filter to same institution
        k: Number of similar courses to return (default 5)

    Returns:
        JSON string with similar courses including:
        - reference_course: The original course
        - similar_courses: Array of similar courses with requirements

    Example:
        result = search_similar_courses(
            course_id="123e4567-e89b-12d3-a456-426614174000",
            institution_id="456e7890-e89b-12d3-a456-426614174001"
        )
    """

    async def async_search_similar():
        try:
            if not course_id:
                return json.dumps({"error": "SIMILAR_ERROR: course_id is required"})

            # Get the reference course
            ref_result = (
                await supabase.table("courses")
                .select("id, name, code, requirements, faculty_id, institution_id")
                .eq("id", course_id)
                .single()
                .execute()
            )

            if not ref_result.data:
                return json.dumps({"error": f"SIMILAR_ERROR: Course {course_id} not found"})

            ref_course = ref_result.data
            ref_requirements = ref_course.get("requirements", {})
            ref_aps = ref_requirements.get("min_aps", 0)

            # Build query for similar courses
            query_builder = (
                supabase.table("courses")
                .select(
                    "id, name, code, requirements, "
                    "faculty:faculties(name), "
                    "institution:institutions(name)"
                )
                .neq("id", course_id)
                .eq("status", "active")
                .limit(k * 2)  # Fetch more to filter
            )

            if institution_id:
                query_builder = query_builder.eq("institution_id", institution_id)

            similar_result = await query_builder.execute()

            if not similar_result.data:
                return json.dumps({
                    "reference_course": {
                        "id": ref_course["id"],
                        "name": ref_course.get("name"),
                        "code": ref_course.get("code"),
                    },
                    "similar_courses": [],
                    "message": "No similar courses found",
                })

            # Score similarity based on APS range
            scored_courses = []
            for course in similar_result.data:
                course_req = course.get("requirements", {})
                course_aps = course_req.get("min_aps", 0)

                # Simple similarity: closer APS = more similar
                if isinstance(ref_aps, (int, float)) and isinstance(course_aps, (int, float)):
                    aps_diff = abs(ref_aps - course_aps)
                    similarity = max(0, 1 - (aps_diff / 50))  # 50 point range
                else:
                    similarity = 0.5

                scored_courses.append({
                    "id": course["id"],
                    "name": course.get("name"),
                    "code": course.get("code"),
                    "faculty": course.get("faculty", {}).get("name"),
                    "institution": course.get("institution", {}).get("name"),
                    "requirements": course_req,
                    "similarity_score": round(similarity, 2),
                })

            # Sort by similarity and take top k
            scored_courses.sort(key=lambda x: x["similarity_score"], reverse=True)
            top_similar = scored_courses[:k]

            return json.dumps({
                "reference_course": {
                    "id": ref_course["id"],
                    "name": ref_course.get("name"),
                    "code": ref_course.get("code"),
                    "min_aps": ref_aps,
                },
                "similar_courses": top_similar,
                "total_found": len(top_similar),
            })

        except Exception as e:
            return json.dumps({"error": f"SIMILAR_ERROR: {str(e)}"})

    return asyncio.run(async_search_similar())


# =============================================================================
# SEARCH CONFIGURATION TOOL
# =============================================================================

@audit_service_role_access(table="rag_embeddings", operation="select")
@tool
def get_search_config() -> str:
    """
    Get the current search configuration and feature flags.

    Use this to understand how policy search is configured and what
    routing decisions will be made for different query types.

    Returns:
        JSON string with current configuration:
        - primary_search: Current primary search method
        - semantic_fallback: Whether fallback is enabled
        - complexity_threshold: Score threshold for semantic routing
        - min_keyword_results: Minimum results before fallback triggers
    """
    return json.dumps({
        "primary_search": POLICY_PRIMARY_SEARCH,
        "semantic_fallback": POLICY_SEMANTIC_FALLBACK,
        "complexity_threshold": COMPLEXITY_SEMANTIC_THRESHOLD,
        "min_keyword_results": KEYWORD_MIN_RESULTS,
        "latency_log_threshold_ms": SEARCH_LATENCY_LOG_THRESHOLD_MS,
        "routing_rules": {
            "simple_queries": "keyword" if POLICY_PRIMARY_SEARCH == "keyword" else POLICY_PRIMARY_SEARCH,
            "complex_queries": "hybrid" if POLICY_SEMANTIC_FALLBACK else "semantic",
            "fallback_on_empty": POLICY_SEMANTIC_FALLBACK,
        },
    })
