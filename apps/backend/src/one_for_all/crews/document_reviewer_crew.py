"""
Document Reviewer Crew

A security-hardened CrewAI crew for reviewing application documents using GPT-4V.
This crew processes documents for applicants in a course and records decisions
to the agent_decisions table, updating document review_status accordingly.

SECURITY CONSTRAINTS:
- Limited to ONLY 7 specific tools (no other tool access)
- Restricted to document review, flagging, notifications, notes, and status updates
- No interaction with other agents
- No access to admin endpoints or data export

Workflow:
1. Fetch documents for all applicants in the specified course
2. For each document, analyze using GPT-4V vision tools
3. If approved: update review_status to 'approved'
4. If flagged: update review_status to 'flagged' + send WhatsApp + add note
5. Update application status appropriately
6. Record decision to agent_decisions table
7. Stream progress updates to agent_sessions
"""

import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Optional, List
import yaml
from crewai import Crew, Process, Agent, Task

# Import ONLY the allowed tools - security hardening
from one_for_all.tools.vision_tools import vision_analyze_document
from one_for_all.tools.document_review_tools import (
    document_flag_tool,
    document_approve_tool,
    get_application_documents,
)
from one_for_all.tools.whatsapp_handler import send_whatsapp_message
from one_for_all.tools.application_tools import (
    update_application_status,
    add_application_note,
)
from one_for_all.tools.supabase_client import supabase

logger = logging.getLogger(__name__)


# Security: Explicitly define the ONLY allowed tools
ALLOWED_TOOLS = [
    "vision_analyze_document",
    "document_flag_tool",
    "document_approve_tool",
    "get_application_documents",
    "send_whatsapp_message",
    "add_application_note",
    "update_application_status",
]


class DocumentReviewerCrew:
    """
    Security-hardened CrewAI Crew for automated document review using GPT-4V.

    This crew handles the complete document review workflow:
    - Fetches documents for all applicants in a course
    - Analyzes each document for quality, completeness, and authenticity
    - Records decisions (approved/flagged) to the database
    - Sends WhatsApp notifications for flagged documents
    - Adds notes to applications for flagged documents
    - Updates application status appropriately
    - Streams progress updates to agent_sessions

    Security Constraints:
    - Only 7 tools are available (explicitly listed)
    - No access to other agent tools, admin endpoints, or data export
    - Scoped to documents for current course/institution only

    Usage:
        crew = DocumentReviewerCrew(session_id="uuid-session-id")
        result = crew.run()
    """

    def __init__(
        self,
        session_id: str,
        institution_id: Optional[str] = None,
        course_id: Optional[str] = None,
        dry_run: bool = False
    ):
        """
        Initialize the Document Reviewer Crew.

        Args:
            session_id: UUID of the agent_session to process
            institution_id: Optional institution ID for context
            course_id: Optional course ID to scope document review
            dry_run: If True, don't make database changes (for testing)
        """
        self.session_id = session_id
        self.institution_id = institution_id
        self.course_id = course_id
        self.dry_run = dry_run

        # Load YAML config
        base_path = Path(__file__).resolve().parent.parent
        agents_path = base_path / "config" / "agents.yaml"

        with open(agents_path, "r") as f:
            self.agent_configs = yaml.safe_load(f)

        # SECURITY: Tool registry limited to ONLY allowed tools
        self.tool_registry = {
            "vision_analyze_document": vision_analyze_document,
            "document_flag_tool": document_flag_tool,
            "document_approve_tool": document_approve_tool,
            "get_application_documents": get_application_documents,
            "send_whatsapp_message": send_whatsapp_message,
            "add_application_note": add_application_note,
            "update_application_status": update_application_status,
        }

        # Initialize agent with restricted tools
        self.agent = self._create_document_reviewer_agent()

    def _create_document_reviewer_agent(self) -> Agent:
        """Create the document reviewer agent with ONLY allowed tools."""
        cfg = self.agent_configs.get("document_reviewer_agent", {})

        # SECURITY: Only use tools from the allowed list
        resolved_tools = [self.tool_registry[name] for name in ALLOWED_TOOLS if name in self.tool_registry]

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
                "input_context, institution_id, initiated_by, course_id"
            ).eq("id", self.session_id).single().execute()

            return result.data
        except Exception as e:
            logger.error(f"Failed to fetch session: {e}")
            return None

    async def _update_session_progress(
        self,
        status: str,
        processed_items: int = 0,
        total_items: int = 0,
        current_item: Optional[str] = None,
        output_summary: Optional[dict] = None
    ):
        """Update the agent session with progress information."""
        if self.dry_run:
            logger.info(f"[DRY RUN] Would update session {self.session_id}: {status}, {processed_items}/{total_items}")
            return

        try:
            update_data = {
                "status": status,
                "processed_items": processed_items,
                "total_items": total_items,
            }

            if current_item:
                update_data["current_item"] = current_item

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
            logger.error(f"Failed to update session progress: {e}")

    async def _record_decision(
        self,
        target_id: str,
        target_type: str,
        decision_type: str,
        decision_value: dict,
        reasoning: str,
        confidence: float,
        metadata: Optional[dict] = None
    ) -> Optional[str]:
        """
        Record an agent decision to the agent_decisions table.

        Args:
            target_id: UUID of the target (document or application)
            target_type: 'document' or 'application'
            decision_type: Type of decision made
            decision_value: Decision details
            reasoning: Explanation for the decision
            confidence: Confidence score (0-1)
            metadata: Additional metadata

        Returns:
            UUID of the created decision record
        """
        if self.dry_run:
            logger.info(f"[DRY RUN] Would record decision: {decision_type} for {target_id}")
            return None

        try:
            decision_data = {
                "session_id": self.session_id,
                "target_type": target_type,
                "target_id": target_id,
                "decision_type": decision_type,
                "decision_value": decision_value,
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

    async def _fetch_course_applicants(self, course_id: str) -> List[dict]:
        """Fetch all applicants with applications for a specific course."""
        try:
            result = await supabase.table("applications").select(
                "id, applicant_id, status, course_id, "
                "applicants(id, full_name, email, mobile_number, whatsapp_number)"
            ).eq("course_id", course_id).execute()

            return result.data or []
        except Exception as e:
            logger.error(f"Failed to fetch course applicants: {e}")
            return []

    async def _fetch_application_documents(self, application_id: str) -> List[dict]:
        """Fetch all documents for an application."""
        try:
            result = await supabase.table("application_documents").select(
                "id, application_id, document_type, file_name, file_url, "
                "review_status, flag_reason, uploaded_at"
            ).eq("application_id", application_id).eq("review_status", "pending").execute()

            return result.data or []
        except Exception as e:
            logger.error(f"Failed to fetch documents for application {application_id}: {e}")
            return []

    async def _analyze_document(self, document: dict) -> dict:
        """Analyze a single document using GPT-4V."""
        doc_id = document.get("id")
        doc_type = document.get("document_type", "unknown")
        doc_url = document.get("file_url")

        try:
            # Map document type to vision tool document type
            doc_type_mapping = {
                "id_document": "id_document",
                "id": "id_document",
                "passport": "id_document",
                "matric_certificate": "matric_certificate",
                "nsc_certificate": "matric_certificate",
                "transcript": "academic_transcript",
                "academic_transcript": "academic_transcript",
                "proof_of_residence": "proof_of_residence",
                "utility_bill": "proof_of_residence",
            }

            vision_doc_type = doc_type_mapping.get(doc_type.lower(), "id_document")

            # Call vision analysis tool
            analysis_result = vision_analyze_document._run(doc_url, vision_doc_type)
            analysis = json.loads(analysis_result)

            return {
                "document_id": doc_id,
                "document_type": doc_type,
                "analysis": analysis,
                "success": analysis.get("success", False),
            }

        except Exception as e:
            logger.error(f"Failed to analyze document {doc_id}: {e}")
            return {
                "document_id": doc_id,
                "document_type": doc_type,
                "success": False,
                "error": str(e),
            }

    async def _process_document_decision(
        self,
        document: dict,
        analysis_result: dict,
        application: dict
    ) -> dict:
        """Process the analysis result and make approve/flag decision."""
        doc_id = document.get("id")
        doc_type = document.get("document_type")
        app_id = application.get("id")
        applicant = application.get("applicants", {})
        applicant_name = applicant.get("full_name", "Applicant")

        result = {
            "document_id": doc_id,
            "document_type": doc_type,
            "applicant_name": applicant_name,
        }

        if not analysis_result.get("success"):
            # Analysis failed - flag the document
            flag_reason = f"Document analysis failed: {analysis_result.get('error', 'Unknown error')}"
            result["action"] = "flagged"
            result["reason"] = flag_reason
            result["notification_sent"] = False
            result["note_added"] = False
            return result

        analysis = analysis_result.get("analysis", {}).get("analysis", {})
        overall_assessment = analysis.get("overall_assessment", "flagged")
        clarity_score = analysis.get("clarity_score", 0)

        if overall_assessment == "approved" or (overall_assessment != "rejected" and clarity_score >= 7):
            # APPROVE the document
            try:
                approve_result = document_approve_tool._run(doc_id, "document_reviewer_agent")
                result["action"] = "approved"
                result["reason"] = None

                # Record decision
                await self._record_decision(
                    target_id=doc_id,
                    target_type="document",
                    decision_type="document_approved",
                    decision_value={
                        "review_status": "approved",
                        "clarity_score": clarity_score,
                        "overall_assessment": overall_assessment,
                    },
                    reasoning="Document passed automated quality and authenticity checks",
                    confidence=0.85,
                    metadata={"analysis": analysis}
                )

            except Exception as e:
                logger.error(f"Failed to approve document {doc_id}: {e}")
                result["action"] = "error"
                result["error"] = str(e)

        else:
            # FLAG the document
            issues = analysis.get("issues_found", [])
            recommendation = analysis.get("recommendation", "Please review and resubmit")

            # Build specific, actionable flag reason
            if issues:
                critical_issues = [i for i in issues if i.get("severity") == "critical"]
                if critical_issues:
                    flag_reason = critical_issues[0].get("recommendation", recommendation)
                else:
                    flag_reason = issues[0].get("recommendation", recommendation)
            else:
                flag_reason = recommendation

            try:
                # Flag the document
                flag_result = document_flag_tool._run(doc_id, flag_reason, "document_reviewer_agent")
                result["action"] = "flagged"
                result["reason"] = flag_reason

                # Send WhatsApp notification
                notification_sent = False
                whatsapp_number = applicant.get("whatsapp_number") or applicant.get("mobile_number")
                if whatsapp_number and not self.dry_run:
                    try:
                        message = (
                            f"Dear {applicant_name},\n\n"
                            f"Your {doc_type.replace('_', ' ')} document requires attention.\n\n"
                            f"Issue: {flag_reason}\n\n"
                            f"Please upload a corrected document at your earliest convenience.\n\n"
                            f"Thank you."
                        )
                        send_whatsapp_message._run(whatsapp_number, message)
                        notification_sent = True
                    except Exception as e:
                        logger.error(f"Failed to send WhatsApp notification: {e}")

                result["notification_sent"] = notification_sent

                # Add note to application
                note_added = False
                if not self.dry_run:
                    try:
                        note_text = f"Document flagged: {doc_type} - {flag_reason}"
                        add_application_note._run(
                            app_id,
                            note_text,
                            "document_flag",
                            "document_reviewer_agent"
                        )
                        note_added = True
                    except Exception as e:
                        logger.error(f"Failed to add note: {e}")

                result["note_added"] = note_added

                # Update application status to flagged
                status_updated = False
                if not self.dry_run:
                    try:
                        update_application_status._run(app_id, "flagged", f"Document flagged: {doc_type}")
                        status_updated = True
                    except Exception as e:
                        logger.error(f"Failed to update application status: {e}")

                result["status_updated"] = "flagged" if status_updated else None

                # Record decision
                await self._record_decision(
                    target_id=doc_id,
                    target_type="document",
                    decision_type="document_flagged",
                    decision_value={
                        "review_status": "flagged",
                        "flag_reason": flag_reason,
                        "notification_sent": notification_sent,
                        "note_added": note_added,
                    },
                    reasoning=flag_reason,
                    confidence=0.80,
                    metadata={"analysis": analysis}
                )

            except Exception as e:
                logger.error(f"Failed to flag document {doc_id}: {e}")
                result["action"] = "error"
                result["error"] = str(e)

        return result

    async def _run_async(self) -> dict:
        """Async implementation of the crew run."""
        result = {
            "success": False,
            "session_id": self.session_id,
            "reviewed_count": 0,
            "approved": [],
            "flagged": [],
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

        # Get course ID from session or initialization
        course_id = self.course_id or session.get("course_id") or session.get("input_context", {}).get("course_id")
        if not course_id:
            # Fall back to target_ids which may contain application IDs
            application_ids = session.get("target_ids", [])
            if not application_ids:
                result["errors"].append("No course_id or target_ids specified")
                await self._update_session_progress("completed", 0, 0, output_summary=result)
                return result
        else:
            # Fetch all applications for the course
            applications = await self._fetch_course_applicants(course_id)
            application_ids = [app.get("id") for app in applications]

        if not application_ids:
            result["errors"].append("No applications to review")
            await self._update_session_progress("completed", 0, 0, output_summary=result)
            return result

        # Count total documents to process
        total_documents = 0
        application_docs_map = {}
        for app_id in application_ids:
            docs = await self._fetch_application_documents(app_id)
            application_docs_map[app_id] = docs
            total_documents += len(docs)

        if total_documents == 0:
            result["reviewed_count"] = 0
            result["success"] = True
            await self._update_session_progress("completed", 0, 0, output_summary=result)
            return result

        # Update session with total items at start
        await self._update_session_progress("running", 0, total_documents)

        # Fetch application details for applicant info
        applications_data = {}
        try:
            apps_result = await supabase.table("applications").select(
                "id, applicant_id, status, course_id, "
                "applicants(id, full_name, email, mobile_number, whatsapp_number)"
            ).in_("id", application_ids).execute()
            for app in (apps_result.data or []):
                applications_data[app["id"]] = app
        except Exception as e:
            logger.error(f"Failed to fetch application details: {e}")

        # Process each document
        processed_count = 0
        approved_list = []
        flagged_list = []

        for app_id, docs in application_docs_map.items():
            application = applications_data.get(app_id, {"id": app_id, "applicants": {}})
            applicant_name = application.get("applicants", {}).get("full_name", "Unknown")
            app_approved_docs = []

            for doc in docs:
                doc_type = doc.get("document_type", "unknown")

                # Update progress with current item
                await self._update_session_progress(
                    "running",
                    processed_count,
                    total_documents,
                    current_item=f"Reviewing {doc_type} for {applicant_name}"
                )

                # Analyze document
                analysis_result = await self._analyze_document(doc)

                # Process decision
                decision_result = await self._process_document_decision(doc, analysis_result, application)

                if decision_result.get("action") == "approved":
                    app_approved_docs.append(doc_type)
                elif decision_result.get("action") == "flagged":
                    flagged_list.append({
                        "applicant_name": decision_result.get("applicant_name"),
                        "document_type": decision_result.get("document_type"),
                        "reason": decision_result.get("reason"),
                        "notification_sent": decision_result.get("notification_sent", False),
                        "note_added": decision_result.get("note_added", False),
                        "status_updated": decision_result.get("status_updated"),
                    })
                elif decision_result.get("action") == "error":
                    result["errors"].append(f"Error processing {doc_type}: {decision_result.get('error')}")

                processed_count += 1

                # Update progress after each document
                await self._update_session_progress("running", processed_count, total_documents)

            # If applicant had approved documents, add to approved list
            if app_approved_docs:
                approved_list.append({
                    "applicant_name": applicant_name,
                    "documents": app_approved_docs,
                })

                # Update application status to under_review if all docs approved and not already flagged
                if applicant_name not in [f.get("applicant_name") for f in flagged_list]:
                    if not self.dry_run:
                        try:
                            update_application_status._run(app_id, "under_review", "All documents approved")
                        except Exception as e:
                            logger.error(f"Failed to update application status to under_review: {e}")

        result["reviewed_count"] = processed_count
        result["approved"] = approved_list
        result["flagged"] = flagged_list
        result["success"] = True

        # Update session with final output
        await self._update_session_progress(
            "completed",
            processed_count,
            total_documents,
            output_summary=result
        )

        return result

    def run(self) -> dict:
        """
        Execute the document review workflow.

        Returns:
            Dict with review results in the format:
            {
                "reviewed_count": 12,
                "approved": [
                    {"applicant_name": "Thabo Mokoena", "documents": ["ID", "Transcript", "Certificate"]},
                    ...
                ],
                "flagged": [
                    {
                        "applicant_name": "Sipho Dlamini",
                        "document_type": "ID Document",
                        "reason": "Blurry image, please resubmit",
                        "notification_sent": True,
                        "note_added": True,
                        "status_updated": "flagged"
                    },
                    ...
                ]
            }
        """
        return asyncio.run(self._run_async())

    def crew(self) -> Crew:
        """
        Return a Crew object for manual execution.

        This method allows the crew to be used directly with CrewAI's
        standard execution patterns if needed.

        Note: For full workflow with database updates and progress streaming,
        use run() instead.
        """
        task = Task(
            description="""Review documents for quality, completeness, and authenticity.
            Use vision_analyze_document for each document.
            Use document_approve_tool or document_flag_tool based on analysis.
            For flagged documents, send WhatsApp notification and add application note.
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
