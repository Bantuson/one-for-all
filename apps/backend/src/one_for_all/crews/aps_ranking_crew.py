"""
APS Ranking Crew for South African University Admissions

This crew ranks applications by their existing APS scores (does NOT calculate APS).
It processes applications from agent_sessions.target_ids, applies intake threshold
logic, and records ranking recommendations to the agent_decisions table.

KEY BEHAVIOR:
- Does NOT calculate APS scores - reads existing APS from academic_info.aps_score
- Requires intake_limit as input parameter
- Generates ranking RECOMMENDATIONS (not final decisions)
- Recommendations require human review

Ranking Thresholds:
- Top 80% of intake limit: auto_accept_recommended
- Remaining 20% within intake: conditional_recommended
- 50% beyond intake limit: waitlist_recommended
- Beyond waitlist: rejection_flagged

Output Format:
{
    "total_ranked": 150,
    "intake_limit": 100,
    "cutoff_aps": 35,
    "rankings": {
        "auto_accept_recommended": [...],
        "conditional_recommended": [...],
        "waitlist_recommended": [...],
        "rejection_flagged": [...]
    },
    "decisions_recorded": True
}
"""

import json
import logging
import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime
from pathlib import Path

import yaml
from crewai import Crew, Process, Agent, Task

from one_for_all.tools.supabase_client import get_supabase_client
# Note: We do NOT import calculate_aps - agent should NOT calculate APS
from one_for_all.tools.course_requirements import (
    get_course_requirements,
    check_subject_requirements,
    compare_to_cutoff,
    get_eligible_courses,
    check_full_eligibility,
)

logger = logging.getLogger(__name__)


def calculate_thresholds(intake_limit: int) -> Dict[str, int]:
    """
    Calculate ranking thresholds based on intake limit.

    Args:
        intake_limit: Maximum number of students to accept

    Returns:
        Dict with threshold boundaries:
        - auto_accept_limit: Top 80% of intake (positions 1 to this value)
        - conditional_limit: Intake limit (positions auto_accept_limit+1 to this value)
        - waitlist_limit: 50% beyond intake (positions conditional_limit+1 to this value)
        - Beyond waitlist_limit: rejection_flagged
    """
    auto_accept_count = int(intake_limit * 0.8)  # Top 80%
    conditional_count = intake_limit - auto_accept_count  # Remaining 20%
    waitlist_count = int(intake_limit * 0.5)  # 50% beyond intake

    return {
        "auto_accept_limit": auto_accept_count,  # Ranks 1-80 (for intake_limit=100)
        "conditional_limit": intake_limit,  # Ranks 81-100
        "waitlist_limit": intake_limit + waitlist_count,  # Ranks 101-150
        # Beyond waitlist_limit: rejection_flagged
    }


def get_recommendation_for_rank(rank: int, thresholds: Dict[str, int]) -> str:
    """
    Determine the recommendation based on rank position.

    Args:
        rank: The applicant's rank position (1 = highest APS)
        thresholds: The threshold boundaries from calculate_thresholds

    Returns:
        Recommendation status string
    """
    if rank <= thresholds["auto_accept_limit"]:
        return "auto_accept_recommended"
    elif rank <= thresholds["conditional_limit"]:
        return "conditional_recommended"
    elif rank <= thresholds["waitlist_limit"]:
        return "waitlist_recommended"
    else:
        return "rejection_flagged"


class APSRankingCrew:
    """
    APS Ranking Crew for processing application rankings.

    IMPORTANT: This crew does NOT calculate APS scores.
    It reads existing APS from academic_info.aps_score and ranks applications.

    This crew:
    1. Fetches applications from agent_sessions.target_ids
    2. Reads existing APS scores from academic_info.aps_score
    3. Ranks applications by APS (descending)
    4. Applies intake threshold logic
    5. Records ranking RECOMMENDATIONS to agent_decisions table
    6. Updates session progress

    All ranking outputs are RECOMMENDATIONS that require human review.

    Usage:
        crew = APSRankingCrew(session_id="uuid", intake_limit=100)
        result = crew.run()
    """

    # Tool registry - Note: NO calculate_aps tool
    TOOL_REGISTRY = {
        "get_course_requirements": get_course_requirements,
        "check_subject_requirements": check_subject_requirements,
        "compare_to_cutoff": compare_to_cutoff,
        "get_eligible_courses": get_eligible_courses,
        "check_full_eligibility": check_full_eligibility,
    }

    def __init__(self, session_id: str, intake_limit: Optional[int] = None):
        """
        Initialize the APS Ranking Crew.

        Args:
            session_id: The agent_session ID containing target application IDs
            intake_limit: REQUIRED - Maximum number of students to accept for the course
                         This determines ranking threshold boundaries
        """
        self.session_id = session_id
        self.intake_limit = intake_limit
        self.supabase = get_supabase_client()

        # Load agent/task configs from YAML
        base_path = Path(__file__).resolve().parent.parent
        self.agents_config = self._load_yaml(base_path / "config" / "agents.yaml")
        self.tasks_config = self._load_yaml(base_path / "config" / "tasks.yaml")

        # Initialize agent and tasks
        self.agent = self._create_aps_agent()
        self.tasks = self._create_aps_tasks()

    def _load_yaml(self, path: Path) -> dict:
        """Load YAML configuration file."""
        try:
            with open(path, "r") as f:
                return yaml.safe_load(f) or {}
        except FileNotFoundError:
            logger.warning(f"Config file not found: {path}")
            return {}

    def _create_aps_agent(self) -> Agent:
        """Create the APS ranking agent from YAML config (without calculate_aps)."""
        config = self.agents_config.get("aps_ranking_agent", {})

        # Get tools from config but EXCLUDE calculate_aps
        tool_names = config.get("tools", [])
        # Filter out calculate_aps and related tools - agent should NOT calculate
        excluded_tools = ["calculate_aps", "get_subject_points", "validate_aps_score", "store_aps_calculation"]
        tool_names = [name for name in tool_names if name not in excluded_tools]

        tools = [self.TOOL_REGISTRY[name] for name in tool_names if name in self.TOOL_REGISTRY]

        return Agent(
            role=config.get("role", "APS Ranking Specialist"),
            goal="Rank applications by existing APS scores and apply intake threshold recommendations",
            backstory="""You rank South African university applications by their existing APS scores.
            You do NOT calculate APS - you read the pre-calculated APS from academic_info.aps_score.
            You apply intake threshold logic to generate ranking RECOMMENDATIONS that require human review.
            You understand that auto_accept_recommended, conditional_recommended, waitlist_recommended,
            and rejection_flagged are RECOMMENDATIONS, not final decisions.""",
            llm=config.get("llm", "deepseek/deepseek-chat"),
            memory=config.get("memory", False),
            tools=tools,
        )

    def _create_aps_tasks(self) -> List[Task]:
        """Create ranking tasks (without APS calculation)."""
        # Single ranking task - no calculation needed
        return [
            Task(
                description="""
                Rank applications by their existing APS scores (DO NOT calculate APS).

                Steps:
                1. Read the APS score from each application's academic_info.aps_score
                2. Sort applications by APS (highest first)
                3. Assign rank positions (1 = highest APS)
                4. Apply intake threshold recommendations

                Your final answer MUST be a JSON with:
                - total_ranked: Number of applications ranked
                - intake_limit: The intake limit used
                - cutoff_aps: APS score at the intake limit position
                - rankings: Object with recommendation categories
                """,
                expected_output="JSON with ranked applications and threshold recommendations",
                agent=self.agent,
            ),
        ]

    async def _fetch_session(self) -> Optional[Dict[str, Any]]:
        """Fetch the agent session from database."""
        if not self.supabase:
            logger.error("Supabase client not configured")
            return None

        result = await self.supabase.table("agent_sessions").select(
            "id, institution_id, agent_type, status, target_ids, "
            "input_context, processed_items, total_items, course_id"
        ).eq("id", self.session_id).single().execute()

        return result.data if result.data else None

    async def _fetch_applications(self, application_ids: List[str]) -> List[Dict[str, Any]]:
        """Fetch applications by IDs including academic_info with APS."""
        if not self.supabase or not application_ids:
            return []

        result = await self.supabase.table("applications").select(
            "id, applicant_id, institution_id, status, academic_info, course_id, "
            "applicants(id, full_name, email)"
        ).in_("id", application_ids).execute()

        return result.data or []

    async def _update_session_progress(
        self,
        status: str,
        processed: Optional[int] = None,
        total: Optional[int] = None,
        current_item: Optional[str] = None,
        output_summary: Optional[dict] = None,
        error: Optional[str] = None
    ):
        """Update the agent session status and progress."""
        if not self.supabase:
            return

        update_data = {"status": status}
        if processed is not None:
            update_data["processed_items"] = processed
        if total is not None:
            update_data["total_items"] = total
        if current_item:
            update_data["current_item"] = current_item
        if error:
            update_data["error_message"] = error
        if output_summary:
            update_data["output_summary"] = output_summary

        if status == "running":
            update_data["started_at"] = datetime.now().isoformat()
        elif status in ["completed", "failed"]:
            update_data["completed_at"] = datetime.now().isoformat()

        await self.supabase.table("agent_sessions").update(
            update_data
        ).eq("id", self.session_id).execute()

    async def _store_ranking_decision(
        self,
        application_id: str,
        rank_position: int,
        aps_score: float,
        recommendation: str,
        course_id: Optional[str] = None
    ) -> Optional[str]:
        """
        Store a ranking decision in the agent_decisions table.

        Args:
            application_id: UUID of the application
            rank_position: The rank (1 = highest APS)
            aps_score: The applicant's APS score
            recommendation: The recommendation status

        Returns:
            UUID of the created decision record
        """
        if not self.supabase:
            return None

        decision = {
            "session_id": self.session_id,
            "target_type": "application",
            "target_id": application_id,
            "decision_type": "ranking_assigned",
            "decision_value": {
                "rank_position": rank_position,
                "aps_score": aps_score,
                "recommendation": recommendation,
                "course_id": course_id,
                "intake_limit": self.intake_limit,
            },
            "reasoning": f"Ranked #{rank_position} with APS {aps_score}. Recommendation: {recommendation}",
            "confidence_score": 1.0,  # Ranking is deterministic based on APS
        }

        result = await self.supabase.table("agent_decisions").insert(decision).execute()
        return result.data[0]["id"] if result.data else None

    def _extract_aps_score(self, application: Dict[str, Any]) -> Optional[float]:
        """
        Extract APS score from application's academic_info.

        Args:
            application: Application record with academic_info

        Returns:
            APS score as float, or None if not found
        """
        academic_info = application.get("academic_info", {})

        # Handle case where academic_info might be a JSON string
        if isinstance(academic_info, str):
            try:
                academic_info = json.loads(academic_info)
            except json.JSONDecodeError:
                return None

        # Try multiple possible keys for APS score
        aps_keys = ["aps_score", "total_aps", "aps", "total_aps_score"]
        for key in aps_keys:
            if key in academic_info and academic_info[key] is not None:
                try:
                    return float(academic_info[key])
                except (ValueError, TypeError):
                    continue

        return None

    async def _rank_applications(self, applications: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Rank applications by APS score (descending).

        Args:
            applications: List of application records

        Returns:
            List of ranked applications with rank position and recommendation
        """
        # Extract APS scores and filter out applications without APS
        ranked_apps = []
        for app in applications:
            aps_score = self._extract_aps_score(app)
            if aps_score is not None:
                applicant = app.get("applicants", {}) or {}
                ranked_apps.append({
                    "application_id": app.get("id"),
                    "applicant_name": applicant.get("full_name", "Unknown"),
                    "aps_score": aps_score,
                    "course_id": app.get("course_id"),
                })

        # Sort by APS descending
        ranked_apps.sort(key=lambda x: x["aps_score"], reverse=True)

        # Calculate thresholds
        thresholds = calculate_thresholds(self.intake_limit)

        # Assign ranks and recommendations
        for i, app in enumerate(ranked_apps, start=1):
            app["rank"] = i
            app["recommendation"] = get_recommendation_for_rank(i, thresholds)

        return ranked_apps

    async def _async_run(self) -> Dict[str, Any]:
        """Async implementation of the run method."""
        try:
            # Fetch session
            session = await self._fetch_session()
            if not session:
                return {
                    "success": False,
                    "error": f"Session not found: {self.session_id}"
                }

            # Get intake_limit from session input_context if not provided
            if self.intake_limit is None:
                input_context = session.get("input_context", {})
                if isinstance(input_context, str):
                    try:
                        input_context = json.loads(input_context)
                    except json.JSONDecodeError:
                        input_context = {}

                self.intake_limit = input_context.get("intake_limit")

            if self.intake_limit is None or self.intake_limit <= 0:
                return {
                    "success": False,
                    "error": "intake_limit is required and must be a positive integer. "
                            "Please provide the course intake limit."
                }

            # Get target application IDs
            target_ids = session.get("target_ids", [])
            if not target_ids:
                return {
                    "success": False,
                    "error": "No target application IDs in session"
                }

            # Update session to running
            await self._update_session_progress("running", processed=0, total=len(target_ids))

            # Fetch applications
            applications = await self._fetch_applications(target_ids)
            if not applications:
                await self._update_session_progress("failed", error="No applications found")
                return {
                    "success": False,
                    "error": "No applications found for target IDs"
                }

            # Rank applications
            ranked_apps = await self._rank_applications(applications)

            if not ranked_apps:
                await self._update_session_progress("failed", error="No applications with APS scores found")
                return {
                    "success": False,
                    "error": "No applications have APS scores in academic_info.aps_score"
                }

            # Calculate thresholds for output
            thresholds = calculate_thresholds(self.intake_limit)

            # Group by recommendation
            rankings = {
                "auto_accept_recommended": [],
                "conditional_recommended": [],
                "waitlist_recommended": [],
                "rejection_flagged": [],
            }

            # Store decisions and group rankings
            processed = 0
            for app in ranked_apps:
                # Update progress
                await self._update_session_progress(
                    "running",
                    processed=processed,
                    total=len(ranked_apps),
                    current_item=f"Processing rank #{app['rank']}: {app['applicant_name']}"
                )

                # Store decision in agent_decisions table
                await self._store_ranking_decision(
                    application_id=app["application_id"],
                    rank_position=app["rank"],
                    aps_score=app["aps_score"],
                    recommendation=app["recommendation"],
                    course_id=app.get("course_id")
                )

                # Add to appropriate category
                ranking_entry = {
                    "rank": app["rank"],
                    "applicant_name": app["applicant_name"],
                    "aps": app["aps_score"],
                }
                rankings[app["recommendation"]].append(ranking_entry)

                processed += 1

            # Calculate cutoff APS (APS at intake_limit position)
            cutoff_aps = None
            if len(ranked_apps) >= self.intake_limit:
                cutoff_aps = ranked_apps[self.intake_limit - 1]["aps_score"]
            elif ranked_apps:
                cutoff_aps = ranked_apps[-1]["aps_score"]

            # Build result
            result = {
                "success": True,
                "session_id": self.session_id,
                "total_ranked": len(ranked_apps),
                "intake_limit": self.intake_limit,
                "cutoff_aps": cutoff_aps,
                "thresholds": {
                    "auto_accept_limit": thresholds["auto_accept_limit"],
                    "conditional_limit": thresholds["conditional_limit"],
                    "waitlist_limit": thresholds["waitlist_limit"],
                },
                "rankings": rankings,
                "decisions_recorded": True,
                "summary": {
                    "auto_accept_recommended_count": len(rankings["auto_accept_recommended"]),
                    "conditional_recommended_count": len(rankings["conditional_recommended"]),
                    "waitlist_recommended_count": len(rankings["waitlist_recommended"]),
                    "rejection_flagged_count": len(rankings["rejection_flagged"]),
                }
            }

            # Update session to completed
            await self._update_session_progress(
                "completed",
                processed=len(ranked_apps),
                total=len(ranked_apps),
                output_summary=result
            )

            return result

        except Exception as e:
            logger.error(f"APS Ranking Crew failed: {e}")
            await self._update_session_progress("failed", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }

    def crew(self) -> Crew:
        """Create and return the CrewAI crew."""
        return Crew(
            agents=[self.agent],
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True,
        )

    def run(self) -> Dict[str, Any]:
        """
        Execute the APS ranking workflow.

        Returns:
            Dict with ranking results in the format:
            {
                "total_ranked": 150,
                "intake_limit": 100,
                "cutoff_aps": 35,
                "rankings": {
                    "auto_accept_recommended": [
                        {"rank": 1, "applicant_name": "Thabo Mokoena", "aps": 45},
                        {"rank": 2, "applicant_name": "Lerato Ndlovu", "aps": 43},
                        ...
                    ],
                    "conditional_recommended": [...],
                    "waitlist_recommended": [...],
                    "rejection_flagged": [...]
                },
                "decisions_recorded": True
            }

        Note: All recommendations require human review before final decisions.
        """
        return asyncio.run(self._async_run())


async def run_aps_ranking(session_id: str, intake_limit: Optional[int] = None) -> Dict[str, Any]:
    """
    Convenience function to run APS ranking for a session.

    Args:
        session_id: The agent_session ID
        intake_limit: Maximum number of students to accept (required)

    Returns:
        Dict with ranking results
    """
    crew = APSRankingCrew(session_id, intake_limit=intake_limit)
    return await crew._async_run()
