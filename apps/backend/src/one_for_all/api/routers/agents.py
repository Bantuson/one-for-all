"""
Agent Execution Endpoints

These endpoints are called by the Bun Agent Runner to execute CrewAI agents.
Each endpoint:
1. Receives a session_id
2. Loads the session from database to get target_ids and context
3. Executes the appropriate crew
4. Returns the result (Bun runner updates the session status)

SECURITY:
- User inputs (question, query) are sanitized before agent processing
- Prompt injection patterns are detected and filtered (CWE-94, LLM01)
- Rate limited to 10/minute to prevent resource exhaustion (CWE-400)
- Tenant isolation enforced via TenantRequired dependency (CWE-862)
- Session ownership verified against tenant context (IDOR prevention)
"""

import asyncio
import logging
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from ..dependencies import SupabaseClient, TenantRequired
from ..middleware import limiter, RATE_LIMITS
from ..schemas.tenant import TenantContext

# Import sanitization utilities for prompt injection prevention
from one_for_all.utils.sanitization import sanitize_for_prompt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/agents", tags=["agents"])


class ExecuteRequest(BaseModel):
    """Request body for agent execution endpoints."""

    session_id: str


class ExecuteResponse(BaseModel):
    """Response body for agent execution endpoints."""

    success: bool
    session_id: str
    result: dict[str, Any] | None = None
    error: str | None = None


async def _get_session(supabase: Any, session_id: str) -> dict | None:
    """
    Fetch an agent session from the database.

    Args:
        supabase: Supabase client instance
        session_id: UUID of the agent session

    Returns:
        Session data or None if not found
    """
    try:
        result = (
            supabase.table("agent_sessions")
            .select(
                "id, agent_type, status, target_type, target_ids, "
                "input_context, institution_id, initiated_by"
            )
            .eq("id", session_id)
            .single()
            .execute()
        )
        return result.data
    except Exception as e:
        logger.error(f"Failed to fetch session {session_id}: {e}")
        return None


def _verify_session_ownership(
    session: dict,
    tenant_context: TenantContext
) -> None:
    """
    Verify that the session belongs to the user's institution.

    This prevents IDOR (Insecure Direct Object Reference) attacks where
    a user could potentially access sessions from other institutions
    by guessing session IDs.

    Args:
        session: The agent session data from database
        tenant_context: The validated tenant context from middleware

    Raises:
        HTTPException: 403 if session doesn't belong to user's institution
    """
    session_institution_id = session.get("institution_id")

    if not session_institution_id:
        logger.warning(f"Session {session.get('id')} has no institution_id")
        raise HTTPException(
            status_code=403,
            detail="Session has no associated institution",
        )

    # Compare UUIDs as strings (handle both UUID objects and strings)
    session_inst_str = str(session_institution_id)
    tenant_inst_str = str(tenant_context.institution_id)

    if session_inst_str != tenant_inst_str:
        logger.warning(
            f"IDOR attempt: User {tenant_context.clerk_user_id} from institution "
            f"{tenant_inst_str} attempted to access session from institution "
            f"{session_inst_str}"
        )
        raise HTTPException(
            status_code=403,
            detail="Session does not belong to your institution",
        )


def _run_crew_sync(crew_run_func) -> dict:
    """
    Run a crew's synchronous run method.

    CrewAI crews typically use asyncio.run() internally in their run() methods,
    so we call them directly without additional async handling.

    Args:
        crew_run_func: The crew's run method (already bound to instance)

    Returns:
        The crew's result dictionary
    """
    return crew_run_func()


@router.post("/reviewer-assistant/execute", response_model=ExecuteResponse)
@limiter.limit(RATE_LIMITS["agent_execute"])
async def execute_reviewer_assistant(
    request: Request,  # Required by slowapi for rate limiting
    body: ExecuteRequest,
    supabase: SupabaseClient,
    tenant: TenantRequired,  # Tenant isolation enforcement
) -> ExecuteResponse:
    """
    Execute the Reviewer Assistant crew for a session.

    This endpoint triggers the ReviewerAssistantCrew to answer questions
    about applications, policies, and eligibility. The crew uses RAG to:
    - Search policy documents for relevant information
    - Analyze application data
    - Provide structured answers with citations

    The session's input_context should contain:
    - question: The question to answer
    - application_id: (optional) Specific application context
    - course_id: (optional) Specific course context

    Security:
    - Requires valid JWT and institution membership (TenantRequired)
    - Verifies session belongs to user's institution (IDOR prevention)

    Args:
        body: Contains the session_id to process
        supabase: Injected Supabase client
        tenant: Validated tenant context from middleware

    Returns:
        ExecuteResponse with success status and answer/citations
    """
    try:
        # Verify session exists and is for reviewer assistant
        session = await _get_session(supabase, body.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # SECURITY: Verify session belongs to user's institution (IDOR prevention)
        _verify_session_ownership(session, tenant)

        if session.get("agent_type") != "reviewer_assistant":
            raise HTTPException(
                status_code=400,
                detail=f"Invalid agent type: expected 'reviewer_assistant', "
                f"got '{session.get('agent_type')}'",
            )

        # Extract context from session
        input_context = session.get("input_context", {}) or {}
        question = input_context.get("question")

        if not question:
            raise HTTPException(
                status_code=400,
                detail="No question provided in session input_context",
            )

        # SECURITY: Sanitize user input to prevent prompt injection (CWE-94, LLM01)
        question = sanitize_for_prompt(question)

        logger.info(f"Starting reviewer assistant for session {body.session_id}")

        # Import crew here to avoid circular imports
        from one_for_all.crews import ReviewerAssistantCrew

        # Create crew instance with context
        crew = ReviewerAssistantCrew(
            institution_id=session.get("institution_id"),
            application_id=input_context.get("application_id"),
            course_id=input_context.get("course_id"),
        )

        # Run the crew's answer_question method
        # This is synchronous and handles async internally
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, lambda: crew.answer_question(question)
        )

        return ExecuteResponse(
            success=True,
            session_id=body.session_id,
            result=result,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Reviewer assistant failed for session {body.session_id}: {e}"
        )
        return ExecuteResponse(
            success=False,
            session_id=body.session_id,
            error=str(e),
        )


@router.post("/analytics/execute", response_model=ExecuteResponse)
@limiter.limit(RATE_LIMITS["agent_execute"])
async def execute_analytics(
    request: Request,  # Required by slowapi for rate limiting
    body: ExecuteRequest,
    supabase: SupabaseClient,
    tenant: TenantRequired,  # Tenant isolation enforcement
) -> ExecuteResponse:
    """
    Execute the Analytics crew for a session.

    This endpoint triggers the AnalyticsCrew to process natural language
    analytics queries. The crew will:
    - Convert the question to SQL
    - Execute the query
    - Generate appropriate visualizations (Recharts config)
    - Optionally save the chart

    The session's input_context should contain:
    - query: The natural language analytics question
    - save_result: (optional) Whether to save the chart
    - pin_chart: (optional) Whether to pin the chart to dashboard

    Security:
    - Requires valid JWT and institution membership (TenantRequired)
    - Verifies session belongs to user's institution (IDOR prevention)
    - Uses tenant's institution_id for query scoping

    Args:
        body: Contains the session_id to process
        supabase: Injected Supabase client
        tenant: Validated tenant context from middleware

    Returns:
        ExecuteResponse with success status and chart configuration
    """
    try:
        # Verify session exists and is for analytics
        session = await _get_session(supabase, body.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # SECURITY: Verify session belongs to user's institution (IDOR prevention)
        _verify_session_ownership(session, tenant)

        if session.get("agent_type") != "analytics":
            raise HTTPException(
                status_code=400,
                detail=f"Invalid agent type: expected 'analytics', "
                f"got '{session.get('agent_type')}'",
            )

        # Extract context from session
        input_context = session.get("input_context", {}) or {}
        query = input_context.get("query")
        institution_id = session.get("institution_id")

        if not query:
            raise HTTPException(
                status_code=400,
                detail="No query provided in session input_context",
            )

        if not institution_id:
            raise HTTPException(
                status_code=400,
                detail="No institution_id in session",
            )

        # SECURITY: Sanitize user input to prevent prompt injection (CWE-94, LLM01)
        query = sanitize_for_prompt(query)

        logger.info(f"Starting analytics for session {body.session_id}")

        # Import crew here to avoid circular imports
        from one_for_all.crews import AnalyticsCrew

        # Create crew instance
        crew = AnalyticsCrew(institution_id=institution_id)

        # Run the crew with options from context
        save_result = input_context.get("save_result", False)
        pin_chart = input_context.get("pin_chart", False)

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, lambda: crew.run(query, save_result=save_result, pin_chart=pin_chart)
        )

        return ExecuteResponse(
            success=result.get("success", False),
            session_id=body.session_id,
            result=result,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analytics failed for session {body.session_id}: {e}")
        return ExecuteResponse(
            success=False,
            session_id=body.session_id,
            error=str(e),
        )
