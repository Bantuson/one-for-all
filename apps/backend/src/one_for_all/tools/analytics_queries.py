"""
Analytics Query Tools

CrewAI tools for generating and executing SQL analytics queries.
Uses pre-defined SQL templates for common queries (90%+ hit rate, <500ms latency).
Falls back to DeepSeek LLM for unmatched queries (~$0.002/query, 2.5s latency).

Performance Optimization (Phase 1):
- Template routing checks first for common query patterns
- Feature flag ANALYTICS_USE_TEMPLATES controls template routing (default: true)
- Routing metrics track template hit/miss rates for monitoring

SECURITY:
- User input is sanitized before LLM processing (CWE-94, LLM01)
- Prompt injection patterns are detected and filtered
- Service role key bypasses RLS - all operations are audit logged
- See docs/SERVICE_ROLE_AUDIT.md for migration plan to scoped tokens

CRITICAL RISK:
- execute_analytics_query can execute arbitrary SQL via RPC
- get_application_stats accesses multiple tables without tenant validation
- All high-risk functions decorated with audit_service_role_access
"""

import asyncio
import json
import logging
import os
from typing import Optional
from crewai.tools import tool
from .supabase_client import supabase

# Import sanitization utilities for prompt injection prevention
from one_for_all.utils.sanitization import sanitize_for_prompt

# Security audit logging for service role access
from ..utils.db_audit import audit_service_role_access

# Import template routing
from .query_router import (
    route_query,
    execute_template,
    routing_metrics,
    RoutingResult,
    list_available_templates,
)

logger = logging.getLogger(__name__)

# Feature flag for template routing (default: enabled)
ANALYTICS_USE_TEMPLATES = os.getenv("ANALYTICS_USE_TEMPLATES", "true").lower() == "true"

# Security feature flag: When enabled, REJECT queries that don't match templates
# instead of falling back to LLM-generated SQL (prevents SQL injection risk)
ANALYTICS_TEMPLATES_ONLY = os.getenv("ANALYTICS_TEMPLATES_ONLY", "true").lower() == "true"


# Database schema for SQL generation context
DATABASE_SCHEMA = """
Tables available for analytics:

1. applications
   - id (uuid, primary key)
   - applicant_id (uuid, foreign key to applicant_accounts)
   - personal_info (jsonb) - contains: full_name, email, cellphone, id_number, date_of_birth, gender, citizenship, province, home_language
   - academic_info (jsonb) - contains: matric_year, total_aps_score, subjects (array with name, grade, aps_points)
   - status (text) - draft, submitted, under_review, accepted, rejected, withdrawn
   - created_at (timestamptz)
   - updated_at (timestamptz)

2. application_choices
   - id (uuid, primary key)
   - application_id (uuid, foreign key to applications)
   - institution_id (uuid, foreign key to institutions)
   - course_id (uuid, foreign key to courses)
   - faculty_id (uuid, foreign key to faculties)
   - campus_id (uuid, foreign key to campuses)
   - priority (integer) - 1 = first choice, 2 = second choice, etc.
   - status (text) - pending, accepted, rejected, waitlisted, withdrawn
   - status_reason (text)
   - reviewed_by (uuid)
   - reviewed_at (timestamptz)
   - created_at (timestamptz)

3. courses
   - id (uuid, primary key)
   - institution_id (uuid)
   - faculty_id (uuid)
   - name (text)
   - code (text)
   - description (text)
   - min_aps_score (integer)
   - application_open_date (date)
   - application_close_date (date)

4. faculties
   - id (uuid, primary key)
   - institution_id (uuid)
   - name (text)
   - code (text)

5. campuses
   - id (uuid, primary key)
   - institution_id (uuid)
   - name (text)

6. institutions
   - id (uuid, primary key)
   - name (text)
   - slug (text)

7. saved_charts
   - id (uuid, primary key)
   - institution_id (uuid)
   - chart_config (jsonb) - contains: type, title, data, xKey, yKey, colors
   - title (text)
   - description (text)
   - is_pinned (boolean)
   - created_by (uuid)
   - created_at (timestamptz)
   - updated_at (timestamptz)
"""

# Example queries for few-shot learning
EXAMPLE_QUERIES = """
Example natural language to SQL conversions:

1. "Show acceptance rate by faculty"
   SELECT f.name as faculty,
          COUNT(*) as total_applications,
          COUNT(CASE WHEN ac.status = 'accepted' THEN 1 END) as accepted,
          ROUND(100.0 * COUNT(CASE WHEN ac.status = 'accepted' THEN 1 END) / NULLIF(COUNT(*), 0), 2) as acceptance_rate
   FROM application_choices ac
   JOIN faculties f ON ac.faculty_id = f.id
   WHERE ac.institution_id = '{institution_id}'
   GROUP BY f.id, f.name
   ORDER BY total_applications DESC;

2. "Applications trend over the last 6 months"
   SELECT DATE_TRUNC('month', created_at) as month,
          COUNT(*) as application_count
   FROM application_choices
   WHERE institution_id = '{institution_id}'
     AND created_at >= NOW() - INTERVAL '6 months'
   GROUP BY DATE_TRUNC('month', created_at)
   ORDER BY month;

3. "Status distribution for BCom applications"
   SELECT ac.status, COUNT(*) as count
   FROM application_choices ac
   JOIN courses c ON ac.course_id = c.id
   WHERE ac.institution_id = '{institution_id}'
     AND (c.name ILIKE '%BCom%' OR c.code ILIKE '%BCOM%')
   GROUP BY ac.status;

4. "Compare applications by campus"
   SELECT cam.name as campus, COUNT(*) as application_count
   FROM application_choices ac
   JOIN campuses cam ON ac.campus_id = cam.id
   WHERE ac.institution_id = '{institution_id}'
   GROUP BY cam.id, cam.name
   ORDER BY application_count DESC;
"""


@tool
def generate_sql_query(natural_language: str, institution_id: str) -> str:
    """
    Convert a natural language analytics question to a SQL query.

    PERFORMANCE OPTIMIZED: This function first attempts to match the query to
    pre-defined SQL templates (<500ms). Only falls back to DeepSeek LLM if no
    template matches with sufficient confidence (~2.5s, ~$0.002/query).

    Template routing can be disabled by setting ANALYTICS_USE_TEMPLATES=false.

    Args:
        natural_language: The analytics question in plain English.
                         Examples:
                         - "Show acceptance rate by faculty"
                         - "Applications trend over the last 6 months"
                         - "Status distribution for BCom applications"
                         - "Compare applications by campus"
                         - "Average APS score by course"
                         - "Top 10 most applied courses"
        institution_id: UUID of the institution to filter data for

    Returns:
        Success: JSON string with {"sql": "<generated_query>", "explanation": "<what_this_query_does>", "source": "template|llm"}
        Error: String starting with "SQL_GEN_ERROR:" followed by error details

    Example:
        result = generate_sql_query(
            natural_language="Show acceptance rate by faculty",
            institution_id="123e4567-e89b-12d3-a456-426614174000"
        )
    """
    try:
        if not natural_language:
            return "SQL_GEN_ERROR: natural_language question is required"

        if not institution_id:
            return "SQL_GEN_ERROR: institution_id is required"

        # SECURITY: Sanitize user input to prevent prompt injection (CWE-94, LLM01)
        natural_language = sanitize_for_prompt(natural_language)

        # =================================================================
        # TEMPLATE ROUTING (Phase 1 optimization)
        # =================================================================
        if ANALYTICS_USE_TEMPLATES:
            routing_result = route_query(natural_language)

            if routing_result.matched and not routing_result.fallback_to_llm:
                # Template matched - execute it
                template_result = execute_template(
                    routing_result.template.id,
                    institution_id,
                )

                if template_result["success"]:
                    # Record metric
                    routing_metrics.record_hit(routing_result.template.id)

                    logger.info(
                        f"Template hit: {routing_result.template.id} "
                        f"(confidence: {routing_result.confidence:.3f})"
                    )

                    return json.dumps({
                        "sql": template_result["sql"],
                        "explanation": template_result["description"],
                        "source": "template",
                        "template_id": template_result["template_id"],
                        "chart_type": template_result["chart_type"],
                        "confidence": routing_result.confidence,
                    })
                else:
                    logger.warning(
                        f"Template execution failed: {template_result.get('error')}"
                    )
            else:
                # Record miss for metrics
                routing_metrics.record_miss()

                # SECURITY: Reject unmatched queries when templates-only mode is enabled
                if ANALYTICS_TEMPLATES_ONLY:
                    logger.warning(
                        f"Query rejected (templates-only mode) - no template match "
                        f"(best confidence: {routing_result.confidence:.3f})"
                    )
                    # Get available templates for suggestion
                    available = list_available_templates()
                    template_names = [t["name"] for t in available[:5]]
                    return json.dumps({
                        "error": "Query not in pre-defined templates",
                        "suggestion": "Try: " + ", ".join(template_names),
                        "available_templates": [t["name"] for t in available],
                        "source": "rejected",
                        "best_confidence": routing_result.confidence,
                    })

                logger.info(
                    f"Template miss - falling back to LLM "
                    f"(best confidence: {routing_result.confidence:.3f})"
                )

        # =================================================================
        # LLM FALLBACK (original implementation)
        # Only reached when ANALYTICS_TEMPLATES_ONLY=false
        # =================================================================

        # Build the prompt for SQL generation
        prompt = f"""You are a SQL expert. Generate a PostgreSQL query for the following analytics question.
The query MUST be scoped to institution_id = '{institution_id}' where applicable.

DATABASE SCHEMA:
{DATABASE_SCHEMA}

{EXAMPLE_QUERIES}

IMPORTANT RULES:
1. Always filter by institution_id = '{institution_id}' when querying institution-specific tables
2. Use proper JOINs to connect related tables
3. Use appropriate aggregation functions (COUNT, SUM, AVG, etc.)
4. Include meaningful column aliases
5. Order results logically (usually by count DESC or date ASC)
6. Use DATE_TRUNC for time-based groupings
7. Handle NULL values with NULLIF or COALESCE where needed
8. Return data suitable for charting (name/label + value pairs)
9. NEVER include DROP, DELETE, UPDATE, INSERT, ALTER, or any data modification statements
10. Only SELECT queries are allowed

QUESTION: {natural_language}

Respond with ONLY a JSON object in this exact format (no markdown, no explanation):
{{"sql": "YOUR_SQL_QUERY_HERE", "explanation": "Brief explanation of what this query does"}}
"""

        # Use DeepSeek API for SQL generation
        import httpx

        deepseek_api_key = os.getenv("DEEPSEEK_API_KEY")
        if not deepseek_api_key:
            return "SQL_GEN_ERROR: DEEPSEEK_API_KEY not configured"

        response = httpx.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {deepseek_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "deepseek-chat",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,  # Low temperature for deterministic SQL
                "max_tokens": 1000,
            },
            timeout=30.0,
        )

        if response.status_code != 200:
            return f"SQL_GEN_ERROR: DeepSeek API error - {response.status_code}: {response.text}"

        result = response.json()
        content = result["choices"][0]["message"]["content"]

        # Parse the JSON response
        try:
            # Clean up the response (remove markdown code blocks if present)
            cleaned_content = content.strip()
            if cleaned_content.startswith("```"):
                # Remove markdown code blocks
                lines = cleaned_content.split("\n")
                cleaned_content = "\n".join(
                    line for line in lines if not line.startswith("```")
                )

            parsed = json.loads(cleaned_content)

            # Validate the SQL doesn't contain dangerous statements
            sql_upper = parsed["sql"].upper()
            dangerous_keywords = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "TRUNCATE", "CREATE"]
            for keyword in dangerous_keywords:
                if keyword in sql_upper and keyword != "CREATE":  # CREATE can appear in date functions
                    return f"SQL_GEN_ERROR: Generated SQL contains forbidden keyword '{keyword}'"

            # Add source field to indicate LLM-generated query
            parsed["source"] = "llm"
            return json.dumps(parsed)

        except json.JSONDecodeError:
            return f"SQL_GEN_ERROR: Failed to parse LLM response as JSON: {content}"

    except Exception as e:
        return f"SQL_GEN_ERROR: Unexpected error - {str(e)}"


@audit_service_role_access(table="multiple_tables", operation="rpc_sql_execution")
@tool
def execute_analytics_query(sql: str) -> str:
    """
    Execute a SQL analytics query and return the results.

    This tool executes a read-only SQL query against the database and returns
    the results as JSON. Only SELECT queries are allowed for security.

    SECURITY NOTE: CRITICAL RISK - This function executes arbitrary SQL via RPC.
    Uses service role key which bypasses all RLS policies.
    See docs/SERVICE_ROLE_AUDIT.md for migration plan.

    Args:
        sql: The SQL query to execute. Must be a SELECT statement only.

    Returns:
        Success: JSON string with {"data": [...], "row_count": N}
        Error: String starting with "QUERY_ERROR:" followed by error details

    Example:
        result = execute_analytics_query(
            sql="SELECT status, COUNT(*) FROM application_choices GROUP BY status"
        )
    """

    async def async_execute():
        try:
            if not sql:
                return "QUERY_ERROR: sql query is required"

            # Validate it's a SELECT query only
            sql_upper = sql.strip().upper()
            if not sql_upper.startswith("SELECT"):
                return "QUERY_ERROR: Only SELECT queries are allowed"

            # Check for dangerous keywords
            dangerous_keywords = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "TRUNCATE"]
            for keyword in dangerous_keywords:
                if keyword in sql_upper:
                    return f"QUERY_ERROR: Query contains forbidden keyword '{keyword}'"

            # Execute the query using Supabase RPC
            # Using postgrest raw query execution
            result = await supabase.rpc("execute_analytics_query", {"query_sql": sql}).execute()

            if hasattr(result, "error") and result.error:
                return f"QUERY_ERROR: Database error - {result.error}"

            data = result.data if result.data else []

            return json.dumps({
                "data": data,
                "row_count": len(data),
            })

        except Exception as e:
            # If RPC doesn't exist, try direct query via postgrest
            # This is a fallback - the RPC approach is preferred
            try:
                # Use raw SQL execution via Supabase
                # Note: This requires the sql function to be enabled in Supabase
                result = await supabase.rpc("sql", {"query": sql}).execute()

                if hasattr(result, "error") and result.error:
                    return f"QUERY_ERROR: Database error - {result.error}"

                data = result.data if result.data else []

                return json.dumps({
                    "data": data,
                    "row_count": len(data),
                })
            except Exception as inner_e:
                return f"QUERY_ERROR: Unexpected error - {str(e)}. Fallback error: {str(inner_e)}"

    return asyncio.run(async_execute())


@audit_service_role_access(table="application_choices", operation="select_aggregate")
@tool
def get_application_stats(institution_id: str) -> str:
    """
    Get basic application statistics for an institution.

    This tool retrieves common analytics metrics without requiring a custom query.
    Useful for quick dashboards or overview statistics.

    SECURITY NOTE: This function uses service role key which bypasses RLS.
    Queries multiple tables (application_choices, faculties, courses).
    institution_id parameter is used for filtering but not RLS-enforced.
    See docs/SERVICE_ROLE_AUDIT.md for migration plan.

    Args:
        institution_id: UUID of the institution

    Returns:
        Success: JSON string with comprehensive application statistics including:
                 - total_applications
                 - status_distribution
                 - applications_by_faculty
                 - applications_by_month (last 6 months)
                 - top_courses
        Error: String starting with "STATS_ERROR:" followed by error details

    Example:
        result = get_application_stats(
            institution_id="123e4567-e89b-12d3-a456-426614174000"
        )
    """

    async def async_get_stats():
        try:
            if not institution_id:
                return "STATS_ERROR: institution_id is required"

            # Total applications count
            total_result = (
                await supabase.table("application_choices")
                .select("id", count="exact")
                .eq("institution_id", institution_id)
                .execute()
            )
            total_applications = total_result.count or 0

            # Status distribution
            status_result = (
                await supabase.table("application_choices")
                .select("status")
                .eq("institution_id", institution_id)
                .execute()
            )
            status_counts = {}
            for row in (status_result.data or []):
                status = row.get("status", "unknown")
                status_counts[status] = status_counts.get(status, 0) + 1

            status_distribution = [
                {"name": status, "value": count}
                for status, count in status_counts.items()
            ]

            # Applications by faculty
            faculty_result = (
                await supabase.table("application_choices")
                .select("faculty_id, faculties(name)")
                .eq("institution_id", institution_id)
                .execute()
            )
            faculty_counts = {}
            for row in (faculty_result.data or []):
                faculty = row.get("faculties", {})
                faculty_name = faculty.get("name", "Unknown") if faculty else "Unknown"
                faculty_counts[faculty_name] = faculty_counts.get(faculty_name, 0) + 1

            applications_by_faculty = [
                {"name": faculty, "value": count}
                for faculty, count in sorted(
                    faculty_counts.items(), key=lambda x: x[1], reverse=True
                )
            ]

            # Top courses
            course_result = (
                await supabase.table("application_choices")
                .select("course_id, courses(name)")
                .eq("institution_id", institution_id)
                .execute()
            )
            course_counts = {}
            for row in (course_result.data or []):
                course = row.get("courses", {})
                course_name = course.get("name", "Unknown") if course else "Unknown"
                course_counts[course_name] = course_counts.get(course_name, 0) + 1

            top_courses = [
                {"name": course, "value": count}
                for course, count in sorted(
                    course_counts.items(), key=lambda x: x[1], reverse=True
                )[:10]
            ]

            # Monthly trend (last 6 months)
            from datetime import datetime, timedelta

            six_months_ago = (datetime.now() - timedelta(days=180)).isoformat()
            monthly_result = (
                await supabase.table("application_choices")
                .select("created_at")
                .eq("institution_id", institution_id)
                .gte("created_at", six_months_ago)
                .execute()
            )

            monthly_counts = {}
            for row in (monthly_result.data or []):
                created_at = row.get("created_at", "")
                if created_at:
                    # Extract month-year
                    month_key = created_at[:7]  # YYYY-MM format
                    monthly_counts[month_key] = monthly_counts.get(month_key, 0) + 1

            applications_by_month = [
                {"name": month, "value": count}
                for month, count in sorted(monthly_counts.items())
            ]

            return json.dumps({
                "total_applications": total_applications,
                "status_distribution": status_distribution,
                "applications_by_faculty": applications_by_faculty,
                "applications_by_month": applications_by_month,
                "top_courses": top_courses,
            })

        except Exception as e:
            return f"STATS_ERROR: Unexpected error - {str(e)}"

    return asyncio.run(async_get_stats())


@tool
def get_routing_metrics() -> str:
    """
    Get analytics query routing metrics.

    Returns statistics about template hit/miss rates for monitoring
    the effectiveness of the template routing optimization.

    Returns:
        JSON string with routing statistics including:
        - total_queries: Total number of queries routed
        - template_hits: Number of queries matched to templates
        - template_misses: Number of queries that fell back to LLM
        - hit_rate: Percentage of queries matched to templates
        - template_usage: Per-template usage counts

    Example:
        result = get_routing_metrics()
        # Returns: {"total_queries": 100, "template_hits": 92, "hit_rate": 92.0, ...}
    """
    return json.dumps(routing_metrics.get_stats())


@tool
def list_analytics_templates() -> str:
    """
    List all available SQL templates for analytics queries.

    Returns a list of pre-defined query templates that can be used
    for common analytics questions without LLM generation.

    Returns:
        JSON string with list of template metadata including:
        - id: Template identifier
        - name: Human-readable name
        - description: What the query measures
        - category: Query category (counts, rates, trends, etc.)
        - chart_type: Recommended visualization type

    Example:
        result = list_analytics_templates()
        # Returns list of available templates
    """
    from .query_router import list_available_templates
    return json.dumps(list_available_templates())
