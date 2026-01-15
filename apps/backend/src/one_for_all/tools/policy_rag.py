"""
Policy RAG Tools

CrewAI tools for searching admission policies and course criteria using
vector similarity search (pgvector).
"""

import asyncio
import json
from typing import Optional

from crewai.tools import tool

from .supabase_client import supabase


@tool
def search_policies(query: str, institution_id: Optional[str] = None, k: int = 5) -> str:
    """
    Search admission policies using vector similarity search.

    This tool searches the RAG embeddings table for policy documents
    related to the query. Results include content, source URLs, and
    relevance scores for citation purposes.

    Args:
        query: Natural language search query (e.g., "conditional acceptance criteria")
        institution_id: Optional UUID to filter policies by institution
        k: Number of results to return (default 5, max 20)

    Returns:
        JSON string with matching policy documents including:
        - content: The policy text
        - source: URL or document reference
        - similarity: Relevance score (0-1)
        - metadata: Additional context

    Example:
        result = search_policies(
            query="What are the requirements for conditional acceptance?",
            institution_id="123e4567-e89b-12d3-a456-426614174000",
            k=5
        )
    """

    async def async_search():
        try:
            # Validate inputs
            if not query or len(query.strip()) < 3:
                return "POLICY_ERROR: Query must be at least 3 characters"

            k_clamped = min(max(k, 1), 20)  # Clamp k between 1 and 20

            # Build the query parameters
            params = {
                "query_text": query.strip(),
                "match_count": k_clamped,
            }

            if institution_id:
                params["filter_institution_id"] = institution_id

            # Call the RPC function for semantic search
            # This assumes a match_policies RPC function exists or falls back to basic search
            try:
                result = await supabase.rpc("match_policies", params).execute()
            except Exception:
                # Fallback: search rag_embeddings table directly with text match
                query_builder = (
                    supabase.table("rag_embeddings")
                    .select("id, content, source, metadata, created_at")
                    .ilike("content", f"%{query.strip()}%")
                    .limit(k_clamped)
                )

                if institution_id:
                    query_builder = query_builder.eq("institution_id", institution_id)

                result = await query_builder.execute()

            if not result.data:
                return json.dumps({
                    "query": query,
                    "matches": [],
                    "total_found": 0,
                    "message": "No matching policies found. Try rephrasing your query.",
                })

            # Format results for agent consumption
            matches = []
            for item in result.data:
                matches.append({
                    "content": item.get("content", ""),
                    "source": item.get("source", "Unknown source"),
                    "similarity": item.get("similarity", 0.0),
                    "metadata": item.get("metadata", {}),
                })

            return json.dumps({
                "query": query,
                "matches": matches,
                "total_found": len(matches),
                "institution_id": institution_id,
            })

        except Exception as e:
            return f"POLICY_ERROR: {str(e)}"

    return asyncio.run(async_search())


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
                return "CRITERIA_ERROR: course_id is required"

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
                return f"CRITERIA_ERROR: Course {course_id} not found"

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
            return f"CRITERIA_ERROR: {str(e)}"

    return asyncio.run(async_get_criteria())


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
                return "SIMILAR_ERROR: course_id is required"

            # Get the reference course
            ref_result = (
                await supabase.table("courses")
                .select("id, name, code, requirements, faculty_id, institution_id")
                .eq("id", course_id)
                .single()
                .execute()
            )

            if not ref_result.data:
                return f"SIMILAR_ERROR: Course {course_id} not found"

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
            return f"SIMILAR_ERROR: {str(e)}"

    return asyncio.run(async_search_similar())
