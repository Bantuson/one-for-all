"""
Document Reviewer Crew

A specialized CrewAI crew for reviewing application documents using GPT-4V.
This crew processes documents from agent_sessions and records decisions
to the agent_decisions table, updating document review_status accordingly.

Workflow:
1. Load pending documents from agent_session.target_ids
2. For each document, analyze using GPT-4V vision tools
3. Record decision to agent_decisions table
4. Update application_documents.review_status (approved/flagged)
5. If flagged, prepare notification for applicant
"""

import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Optional
import yaml
from crewai import Crew, Process, Agent, Task

# Import tools
from one_for_all.tools import (
    document_flag_tool,
    document_approve_tool,
    get_application_documents,
    send_whatsapp_message,
    sendgrid_otp_sender,
)
from one_for_all.tools.vision_tools import (
    vision_analyze_document,
    vision_extract_document_text,
    vision_compare_documents,
)
from one_for_all.tools.supabase_client import supabase

logger = logging.getLogger(__name__)


class DocumentReviewerCrew:
    """
    CrewAI Crew for automated document review using GPT-4V.

    This crew handles the complete document review workflow:
    - Fetches documents from agent sessions
    - Analyzes each document for quality, completeness, and authenticity
    - Records decisions (approved/flagged) to the database
    - Sends notifications for flagged documents

    Usage:
        crew = DocumentReviewerCrew(session_id="uuid-session-id")
        result = crew.run()
    """

    def __init__(
        self,
        session_id: str,
        institution_id: Optional[str] = None,
        dry_run: bool = False
    ):
        """
        Initialize the Document Reviewer Crew.

        Args:
            session_id: UUID of the agent_session to process
            institution_id: Optional institution ID for context
            dry_run: If True, don't make database changes (for testing)
        """
        self.session_id = session_id
        self.institution_id = institution_id
        self.dry_run = dry_run

        # Load YAML config
        base_path = Path(__file__).resolve().parent.parent
        agents_path = base_path / "config" / "agents.yaml"

        with open(agents_path, "r") as f:
            self.agent_configs = yaml.safe_load(f)

        # Tool registry for document review
        self.tool_registry = {
            # Vision tools (GPT-4V)
            "vision_analyze_document": vision_analyze_document,
            "vision_extract_document_text": vision_extract_document_text,
            "vision_compare_documents": vision_compare_documents,
            # Document review tools
            "document_flag_tool": document_flag_tool,
            "document_approve_tool": document_approve_tool,
            "get_application_documents": get_application_documents,
            # Notification tools
            "send_whatsapp_message": send_whatsapp_message,
            "sendgrid_otp_sender": sendgrid_otp_sender,
        }

        # Initialize agent
        self.agent = self._create_document_reviewer_agent()

    def _resolve_tools(self, tool_names: list) -> list:
        """Resolve tool names to actual tool instances."""
        resolved = []
        for name in tool_names:
            if name in self.tool_registry:
                resolved.append(self.tool_registry[name])
            else:
                logger.warning(f"Tool '{name}' not found in registry")
        return resolved

    def _create_document_reviewer_agent(self) -> Agent:
        """Create the document reviewer agent from YAML config."""
        cfg = self.agent_configs.get("document_reviewer_agent", {})

        # Get tools from config and add vision tools
        tool_names = cfg.get("tools", [])
        # Ensure vision tools are included
        if "vision_analyze_document" not in tool_names:
            tool_names.insert(0, "vision_analyze_document")

        resolved_tools = self._resolve_tools(tool_names)

        return Agent(
            role=cfg.get("role", "Document Review Specialist"),
            goal=cfg.get("goal", "Review documents for quality and completeness"),
            backstory=cfg.get("backstory", "Expert document reviewer"),
            llm=cfg.get("llm", "deepseek/deepseek-chat"),
            memory=cfg.get("memory", False),
            tools=resolved_tools,
            verbose=True,
        )

    async def _fetch_session(self) -> Optional[dict]:
        """Fetch the agent session from database."""
        try:
            result = await supabase.table("agent_sessions").select(
                "id, agent_type, status, target_type, target_ids, "
                "input_context, institution_id, initiated_by"
            ).eq("id", self.session_id).single().execute()

            return result.data
        except Exception as e:
            logger.error(f"Failed to fetch session: {e}")
            return None

    async def _update_session_status(
        self,
        status: str,
        processed_items: int = 0,
        total_items: int = 0,
        output_summary: Optional[dict] = None
    ):
        """Update the agent session status."""
        if self.dry_run:
            logger.info(f"[DRY RUN] Would update session {self.session_id} to {status}")
            return

        try:
            update_data = {
                "status": status,
                "processed_items": processed_items,
                "total_items": total_items,
            }

            if status == "running":
                update_data["started_at"] = datetime.now().isoformat()
            elif status in ["completed", "failed"]:
                update_data["completed_at"] = datetime.now().isoformat()

            if output_summary:
                update_data["output_summary"] = output_summary

            await supabase.table("agent_sessions").update(
                update_data
            ).eq("id", self.session_id).execute()

        except Exception as e:
            logger.error(f"Failed to update session status: {e}")

    async def _record_decision(
        self,
        document_id: str,
        decision_type: str,
        reasoning: str,
        confidence: float,
        metadata: Optional[dict] = None
    ) -> Optional[str]:
        """
        Record an agent decision to the database.

        Args:
            document_id: UUID of the document being reviewed
            decision_type: 'document_approved' or 'document_flagged'
            reasoning: Explanation for the decision
            confidence: Confidence score (0-1)
            metadata: Additional metadata (analysis results, etc.)

        Returns:
            UUID of the created decision record
        """
        if self.dry_run:
            logger.info(f"[DRY RUN] Would record decision: {decision_type} for {document_id}")
            return None

        try:
            decision_data = {
                "session_id": self.session_id,
                "target_type": "document",
                "target_id": document_id,
                "decision_type": decision_type,
                "reasoning": reasoning,
                "confidence_score": confidence,
                "metadata": metadata or {},
            }

            result = await supabase.table("agent_decisions").insert(
                decision_data
            ).select("id").single().execute()

            return result.data.get("id") if result.data else None

        except Exception as e:
            logger.error(f"Failed to record decision: {e}")
            return None

    async def _fetch_documents(self, document_ids: list[str]) -> list[dict]:
        """Fetch document details from database."""
        try:
            result = await supabase.table("application_documents").select(
                "id, application_id, document_type, file_name, file_url, "
                "review_status, flag_reason, uploaded_at"
            ).in_("id", document_ids).execute()

            return result.data or []
        except Exception as e:
            logger.error(f"Failed to fetch documents: {e}")
            return []

    async def _get_applicant_info(self, application_id: str) -> Optional[dict]:
        """Fetch applicant information for notifications."""
        try:
            result = await supabase.table("applications").select(
                "id, applicant_id, applicants(full_name, email, mobile_number, whatsapp_number)"
            ).eq("id", application_id).single().execute()

            return result.data
        except Exception as e:
            logger.error(f"Failed to fetch applicant info: {e}")
            return None

    def _create_review_task(self, documents: list[dict]) -> Task:
        """Create the document review task."""
        doc_summary = "\n".join([
            f"- Document ID: {doc['id']}, Type: {doc['document_type']}, URL: {doc['file_url']}"
            for doc in documents
        ])

        description = f"""Review the following documents for quality, completeness, and authenticity.

DOCUMENTS TO REVIEW:
{doc_summary}

INSTRUCTIONS:
1. For EACH document, use vision_analyze_document tool to analyze the document image
2. Based on the analysis results:
   - If overall_assessment is "approved" or clarity_score >= 7 and no critical issues:
     Use document_approve_tool to approve the document
   - If overall_assessment is "flagged" or there are issues:
     Use document_flag_tool with a SPECIFIC, ACTIONABLE reason

3. Record all findings in your final answer

IMPORTANT:
- Analyze EVERY document in the list
- Be specific in flag reasons (e.g., "ID document image is blurry - please upload a clearer photo")
- Do not flag documents for minor issues if key information is readable

Your final answer MUST be a JSON object with:
{{
    "reviewed_count": <number>,
    "approved": ["<list of approved document IDs>"],
    "flagged": [
        {{"document_id": "<id>", "document_type": "<type>", "reason": "<specific reason>"}}
    ],
    "summary": "<brief summary of review>"
}}"""

        return Task(
            description=description,
            expected_output="JSON with reviewed_count, approved list, flagged list, and summary",
            agent=self.agent,
        )

    def _create_notification_task(self, flagged_documents: list[dict], applicant_info: dict) -> Task:
        """Create the notification task for flagged documents."""
        flagged_summary = "\n".join([
            f"- {doc['document_type']}: {doc['reason']}"
            for doc in flagged_documents
        ])

        applicant_name = applicant_info.get("applicants", {}).get("full_name", "Applicant")
        contact_email = applicant_info.get("applicants", {}).get("email", "")
        contact_whatsapp = applicant_info.get("applicants", {}).get("whatsapp_number", "")

        description = f"""Send notifications to the applicant about flagged documents.

APPLICANT DETAILS:
- Name: {applicant_name}
- Email: {contact_email}
- WhatsApp: {contact_whatsapp}

FLAGGED DOCUMENTS:
{flagged_summary}

INSTRUCTIONS:
1. If WhatsApp number is available, use send_whatsapp_message to send a polite notification
2. If email is available, compose a notification (sendgrid_otp_sender can be used for email)
3. Be polite and helpful in tone
4. Clearly explain what needs to be corrected
5. Provide instructions on how to resubmit

Your final answer MUST confirm:
- Number of notifications sent
- Contact methods used
- Brief summary of each notification"""

        return Task(
            description=description,
            expected_output="Confirmation of notifications sent",
            agent=self.agent,
        )

    async def _run_async(self) -> dict:
        """Async implementation of the crew run."""
        result = {
            "success": False,
            "session_id": self.session_id,
            "reviewed_count": 0,
            "approved": [],
            "flagged": [],
            "notifications_sent": 0,
            "errors": [],
        }

        # Fetch session
        session = await self._fetch_session()
        if not session:
            result["errors"].append("Session not found")
            return result

        if session.get("agent_type") != "document_reviewer":
            result["errors"].append(f"Invalid agent type: {session.get('agent_type')}")
            return result

        # Get document IDs to process
        document_ids = session.get("target_ids", [])
        if not document_ids:
            result["errors"].append("No documents to review")
            await self._update_session_status("completed", 0, 0, result)
            return result

        # Update session to running
        await self._update_session_status("running", 0, len(document_ids))

        # Fetch document details
        documents = await self._fetch_documents(document_ids)
        if not documents:
            result["errors"].append("Failed to fetch document details")
            await self._update_session_status("failed", 0, len(document_ids), result)
            return result

        try:
            # Create and run the review task
            review_task = self._create_review_task(documents)

            crew = Crew(
                agents=[self.agent],
                tasks=[review_task],
                process=Process.sequential,
                verbose=True,
            )

            # Execute the crew
            crew_result = crew.kickoff()

            # Parse the result
            try:
                if hasattr(crew_result, "raw"):
                    output = crew_result.raw
                else:
                    output = str(crew_result)

                # Try to extract JSON from the output
                if "```json" in output:
                    json_str = output.split("```json")[1].split("```")[0].strip()
                elif "```" in output:
                    json_str = output.split("```")[1].split("```")[0].strip()
                else:
                    # Try to find JSON object in the output
                    import re
                    json_match = re.search(r'\{[^{}]*"reviewed_count"[^{}]*\}', output, re.DOTALL)
                    if json_match:
                        json_str = json_match.group()
                    else:
                        json_str = output

                review_result = json.loads(json_str)

                result["reviewed_count"] = review_result.get("reviewed_count", 0)
                result["approved"] = review_result.get("approved", [])
                result["flagged"] = review_result.get("flagged", [])

            except json.JSONDecodeError:
                logger.warning(f"Could not parse crew output as JSON: {output}")
                result["errors"].append("Could not parse review results")

            # Record decisions for each document
            for doc_id in result["approved"]:
                await self._record_decision(
                    document_id=doc_id,
                    decision_type="document_approved",
                    reasoning="Document passed automated quality and authenticity checks",
                    confidence=0.85,
                    metadata={"review_type": "automated", "crew_session": self.session_id}
                )

            for flagged in result["flagged"]:
                await self._record_decision(
                    document_id=flagged.get("document_id"),
                    decision_type="document_flagged",
                    reasoning=flagged.get("reason", "Document requires resubmission"),
                    confidence=0.80,
                    metadata={
                        "review_type": "automated",
                        "document_type": flagged.get("document_type"),
                        "crew_session": self.session_id
                    }
                )

            # Send notifications if there are flagged documents
            if result["flagged"] and not self.dry_run:
                # Get applicant info from the first document
                if documents:
                    app_id = documents[0].get("application_id")
                    if app_id:
                        applicant_info = await self._get_applicant_info(app_id)
                        if applicant_info:
                            notification_task = self._create_notification_task(
                                result["flagged"],
                                applicant_info
                            )

                            notification_crew = Crew(
                                agents=[self.agent],
                                tasks=[notification_task],
                                process=Process.sequential,
                                verbose=True,
                            )

                            try:
                                notification_result = notification_crew.kickoff()
                                result["notifications_sent"] = len(result["flagged"])
                            except Exception as e:
                                logger.error(f"Failed to send notifications: {e}")
                                result["errors"].append(f"Notification error: {str(e)}")

            result["success"] = True
            await self._update_session_status(
                "completed",
                result["reviewed_count"],
                len(document_ids),
                result
            )

        except Exception as e:
            logger.error(f"Crew execution failed: {e}")
            result["errors"].append(str(e))
            await self._update_session_status(
                "failed",
                result["reviewed_count"],
                len(document_ids),
                result
            )

        return result

    def run(self) -> dict:
        """
        Execute the document review workflow.

        Returns:
            Dict with review results including:
            - success: True/False
            - session_id: The session ID
            - reviewed_count: Number of documents reviewed
            - approved: List of approved document IDs
            - flagged: List of flagged documents with reasons
            - notifications_sent: Number of notifications sent
            - errors: List of any errors encountered
        """
        return asyncio.run(self._run_async())

    def crew(self) -> Crew:
        """
        Return a Crew object for manual execution.

        This method allows the crew to be used directly with CrewAI's
        standard execution patterns if needed.

        Note: For full workflow with database updates, use run() instead.
        """
        # Create a generic review task for the crew
        task = Task(
            description="""Review documents for quality, completeness, and authenticity.
            Use vision_analyze_document for each document.
            Use document_approve_tool or document_flag_tool based on analysis.
            Provide a JSON summary of results.""",
            expected_output="JSON with reviewed_count, approved, flagged lists",
            agent=self.agent,
        )

        return Crew(
            agents=[self.agent],
            tasks=[task],
            process=Process.sequential,
            verbose=True,
        )
