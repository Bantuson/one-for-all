"""
APS Ranking Crew for South African University Admissions

This crew orchestrates the APS calculation and eligibility assessment workflow.
It processes applications from agent_sessions.target_ids and records decisions
to the agent_decisions table.
"""

import json
import logging
import asyncio
from typing import List, Optional, Dict, Any
from pathlib import Path

import yaml
from crewai import Crew, Process, Agent, Task

from one_for_all.tools.supabase_client import get_supabase_client
from one_for_all.tools.aps_calculator import (
    calculate_aps,
    get_subject_points,
    validate_aps_score,
    store_aps_calculation,
)
from one_for_all.tools.course_requirements import (
    get_course_requirements,
    check_subject_requirements,
    compare_to_cutoff,
    get_eligible_courses,
    check_full_eligibility,
)

logger = logging.getLogger(__name__)


class APSRankingCrew:
    """
    APS Ranking Crew for processing application APS calculations.

    This crew:
    1. Fetches applications from agent_sessions.target_ids
    2. Calculates APS scores for each application
    3. Checks eligibility for selected courses
    4. Records decisions to agent_decisions table
    5. Updates session progress

    Usage:
        crew = APSRankingCrew(session_id="uuid")
        result = crew.run()
    """

    # Tool registry for APS ranking agent
    TOOL_REGISTRY = {
        "calculate_aps": calculate_aps,
        "get_subject_points": get_subject_points,
        "validate_aps_score": validate_aps_score,
        "store_aps_calculation": store_aps_calculation,
        "get_course_requirements": get_course_requirements,
        "check_subject_requirements": check_subject_requirements,
        "compare_to_cutoff": compare_to_cutoff,
        "get_eligible_courses": get_eligible_courses,
        "check_full_eligibility": check_full_eligibility,
    }

    def __init__(self, session_id: str):
        """
        Initialize the APS Ranking Crew.

        Args:
            session_id: The agent_session ID containing target application IDs
        """
        self.session_id = session_id
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
        """Create the APS ranking agent from YAML config."""
        config = self.agents_config.get("aps_ranking_agent", {})

        # Get tools from config
        tool_names = config.get("tools", [])
        tools = [self.TOOL_REGISTRY[name] for name in tool_names if name in self.TOOL_REGISTRY]

        return Agent(
            role=config.get("role", "APS Ranking Specialist"),
            goal=config.get("goal", "Calculate APS scores and assess course eligibility"),
            backstory=config.get("backstory", "You calculate SA APS scores and determine admission eligibility"),
            llm=config.get("llm", "deepseek/deepseek-chat"),
            memory=config.get("memory", False),
            tools=tools,
        )

    def _create_aps_tasks(self) -> List[Task]:
        """Create APS calculation tasks from YAML config."""
        tasks = []

        # Create calculation task
        calc_config = self.tasks_config.get("aps_calculation_task", {})
        if calc_config:
            tasks.append(Task(
                description=calc_config.get("description", "Calculate APS from academic results"),
                expected_output=calc_config.get("expected_output", "JSON with APS score and breakdown"),
                agent=self.agent,
            ))

        # Create eligibility task
        elig_config = self.tasks_config.get("aps_eligibility_task", {})
        if elig_config:
            tasks.append(Task(
                description=elig_config.get("description", "Check course eligibility based on APS"),
                expected_output=elig_config.get("expected_output", "JSON with eligibility assessment"),
                agent=self.agent,
            ))

        # Create ranking task
        rank_config = self.tasks_config.get("aps_ranking_task", {})
        if rank_config:
            tasks.append(Task(
                description=rank_config.get("description", "Rank applications by APS score"),
                expected_output=rank_config.get("expected_output", "JSON with ranked applications"),
                agent=self.agent,
            ))

        # If no tasks configured, create default tasks
        if not tasks:
            tasks = self._create_default_tasks()

        return tasks

    def _create_default_tasks(self) -> List[Task]:
        """Create default tasks if YAML config is missing."""
        return [
            Task(
                description="""
                Calculate the APS (Admission Point Score) for the provided application.

                Steps:
                1. Parse the academic_info JSON containing matric subjects and percentages
                2. Use calculate_aps tool to compute the total APS score
                3. Return the calculation breakdown

                Your final answer MUST be a JSON with:
                - total_aps: The calculated APS score
                - breakdown: Subject-by-subject point allocation
                - life_orientation: LO contribution (50% weighted)
                """,
                expected_output="JSON with total_aps and calculation breakdown",
                agent=self.agent,
            ),
            Task(
                description="""
                Check eligibility for the applicant's selected courses.

                Steps:
                1. For each course in the application, use check_full_eligibility tool
                2. Compare the calculated APS to course minimum requirements
                3. Verify subject-specific requirements are met
                4. Determine overall eligibility status

                Your final answer MUST be a JSON with:
                - eligibility_results: Array of course eligibility assessments
                - overall_status: "eligible", "partially_eligible", or "ineligible"
                - recommendations: Suggested actions or alternative courses
                """,
                expected_output="JSON with eligibility_results and recommendations",
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
            "input_context, processed_items, total_items"
        ).eq("id", self.session_id).single().execute()

        return result.data if result.data else None

    async def _fetch_applications(self, application_ids: List[str]) -> List[Dict[str, Any]]:
        """Fetch applications by IDs."""
        if not self.supabase or not application_ids:
            return []

        result = await self.supabase.table("applications").select(
            "id, applicant_id, institution_id, status, academic_info, course_id"
        ).in_("id", application_ids).execute()

        return result.data or []

    async def _update_session_status(
        self,
        status: str,
        processed: Optional[int] = None,
        total: Optional[int] = None,
        error: Optional[str] = None
    ):
        """Update the agent session status."""
        if not self.supabase:
            return

        update_data = {"status": status}
        if processed is not None:
            update_data["processed_items"] = processed
        if total is not None:
            update_data["total_items"] = total
        if error:
            update_data["error_message"] = error

        if status == "running":
            update_data["started_at"] = "now()"
        elif status in ["completed", "failed"]:
            update_data["completed_at"] = "now()"

        await self.supabase.table("agent_sessions").update(
            update_data
        ).eq("id", self.session_id).execute()

    async def _store_decision(
        self,
        application_id: str,
        session_id: str,
        decision_type: str,
        decision_value: Dict[str, Any],
        reasoning: str,
        confidence: float = 1.0
    ):
        """Store an agent decision in the database."""
        if not self.supabase:
            return None

        decision = {
            "application_id": application_id,
            "session_id": session_id,
            "decision_type": decision_type,
            "decision_value": decision_value,
            "reasoning": reasoning,
            "confidence_score": confidence,
        }

        result = await self.supabase.table("agent_decisions").insert(decision).execute()
        return result.data[0] if result.data else None

    async def _process_application(self, application: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single application for APS calculation."""
        app_id = application.get("id")
        academic_info = application.get("academic_info", {})
        course_id = application.get("course_id")

        # Ensure academic_info is a JSON string
        if isinstance(academic_info, dict):
            academic_info_str = json.dumps(academic_info)
        else:
            academic_info_str = str(academic_info)

        try:
            # Calculate APS
            aps_result_str = calculate_aps._run(academic_info_str)
            aps_result = json.loads(aps_result_str)

            if not aps_result.get("success"):
                return {
                    "application_id": app_id,
                    "success": False,
                    "error": aps_result.get("error", "APS calculation failed")
                }

            total_aps = aps_result.get("total_aps")

            # Store APS calculation decision
            await self._store_decision(
                application_id=app_id,
                session_id=self.session_id,
                decision_type="aps_score_calculated",
                decision_value={
                    "total_aps": total_aps,
                    "aps_with_decimal": aps_result.get("aps_with_decimal"),
                    "best_six_total": aps_result.get("best_six_total"),
                    "lo_contribution": aps_result.get("lo_contribution"),
                    "subjects_counted": aps_result.get("subjects_counted"),
                    "breakdown": aps_result.get("calculation_breakdown")
                },
                reasoning=f"Calculated APS score of {total_aps} from {aps_result.get('subjects_counted')} subjects",
                confidence=1.0  # APS calculation is deterministic
            )

            # If course_id provided, check eligibility
            eligibility_result = None
            if course_id:
                elig_str = check_full_eligibility._run(academic_info_str, course_id)
                eligibility_result = json.loads(elig_str)

                if eligibility_result.get("success"):
                    await self._store_decision(
                        application_id=app_id,
                        session_id=self.session_id,
                        decision_type="eligibility_checked",
                        decision_value={
                            "course_id": course_id,
                            "is_eligible": eligibility_result.get("is_eligible"),
                            "eligibility_status": eligibility_result.get("eligibility_status"),
                            "aps_assessment": eligibility_result.get("aps_assessment"),
                            "subject_assessment": eligibility_result.get("subject_assessment"),
                        },
                        reasoning=eligibility_result.get("recommendation", "Eligibility assessed"),
                        confidence=0.95
                    )

            return {
                "application_id": app_id,
                "success": True,
                "total_aps": total_aps,
                "aps_breakdown": aps_result.get("calculation_breakdown"),
                "eligibility": eligibility_result
            }

        except Exception as e:
            logger.error(f"Error processing application {app_id}: {e}")
            return {
                "application_id": app_id,
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
            Dict with processing results and statistics.
        """
        return asyncio.run(self._async_run())

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

            # Get target application IDs
            target_ids = session.get("target_ids", [])
            if not target_ids:
                return {
                    "success": False,
                    "error": "No target application IDs in session"
                }

            # Update session to running
            await self._update_session_status("running", processed=0, total=len(target_ids))

            # Fetch applications
            applications = await self._fetch_applications(target_ids)
            if not applications:
                await self._update_session_status("failed", error="No applications found")
                return {
                    "success": False,
                    "error": "No applications found for target IDs"
                }

            # Process each application
            results = []
            processed = 0

            for app in applications:
                result = await self._process_application(app)
                results.append(result)
                processed += 1

                # Update progress
                await self._update_session_status("running", processed=processed)

            # Calculate summary
            successful = [r for r in results if r.get("success")]
            failed = [r for r in results if not r.get("success")]

            # Sort by APS for ranking
            successful.sort(key=lambda x: x.get("total_aps", 0), reverse=True)

            # Add ranks
            for i, result in enumerate(successful, 1):
                result["rank"] = i

            # Update session to completed
            await self._update_session_status("completed", processed=len(results))

            return {
                "success": True,
                "session_id": self.session_id,
                "total_processed": len(results),
                "successful": len(successful),
                "failed": len(failed),
                "ranked_results": successful,
                "errors": [{"application_id": r["application_id"], "error": r.get("error")} for r in failed]
            }

        except Exception as e:
            logger.error(f"APS Ranking Crew failed: {e}")
            await self._update_session_status("failed", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }


async def run_aps_ranking(session_id: str) -> Dict[str, Any]:
    """
    Convenience function to run APS ranking for a session.

    Args:
        session_id: The agent_session ID

    Returns:
        Dict with processing results
    """
    crew = APSRankingCrew(session_id)
    return await crew._async_run()
