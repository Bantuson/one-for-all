"""
Agent Execution Endpoints

These endpoints are called by the Bun Agent Runner to execute CrewAI agents.
Each endpoint:
1. Receives a session_id
2. Loads the session from database to get target_ids and context
3. Executes the appropriate crew
4. Returns the result (Bun runner updates the session status)
"""

import asyncio
import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..dependencies import SupabaseClient

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
async def execute_reviewer_assistant(
    request: ExecuteRequest, supabase: SupabaseClient
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

    Args:
        request: Contains the session_id to process
        supabase: Injected Supabase client

    Returns:
        ExecuteResponse with success status and answer/citations
    """
    try:
        # Verify session exists and is for reviewer assistant
        session = await _get_session(supabase, request.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

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

        logger.info(f"Starting reviewer assistant for session {request.session_id}")

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
            session_id=request.session_id,
            result=result,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Reviewer assistant failed for session {request.session_id}: {e}"
        )
        return ExecuteResponse(
            success=False,
            session_id=request.session_id,
            error=str(e),
        )


@router.post("/analytics/execute", response_model=ExecuteResponse)
async def execute_analytics(
    request: ExecuteRequest, supabase: SupabaseClient
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

    Args:
        request: Contains the session_id to process
        supabase: Injected Supabase client

    Returns:
        ExecuteResponse with success status and chart configuration
    """
    try:
        # Verify session exists and is for analytics
        session = await _get_session(supabase, request.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

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

        logger.info(f"Starting analytics for session {request.session_id}")

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
            session_id=request.session_id,
            result=result,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analytics failed for session {request.session_id}: {e}")
        return ExecuteResponse(
            success=False,
            session_id=request.session_id,
            error=str(e),
        )
