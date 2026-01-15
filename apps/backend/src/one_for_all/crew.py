import logging
import yaml
from pathlib import Path
from crewai import Crew, Process, Agent, Task

# Import test configuration
from one_for_all.config.test_config import TEST_MODE, log_test_mode_warning

# Import all tools from the tools module
from one_for_all.tools import (
    # OTP & Messaging Tools
    sendgrid_otp_sender,
    sms_otp_sender,
    send_whatsapp_message,
    send_whatsapp_otp,
    # OTP Verification Tools
    verify_otp,
    check_otp_status,
    resend_otp_check,
    # Student Number Tools
    generate_student_number,
    # Document Review Tools
    document_flag_tool,
    document_approve_tool,
    get_application_documents,
    # Vision Tools (GPT-4V)
    vision_analyze_document,
    vision_extract_document_text,
    vision_compare_documents,
    # Deprecated Supabase Tools (still used in agents.yaml)
    supabase_user_store,
    supabase_user_lookup,
    supabase_session_lookup,
    supabase_session_create,
    supabase_session_extend,
    supabase_application_store,
    supabase_rag_store,
    supabase_rag_query,
    supabase_nsfas_store,
    supabase_nsfas_documents_store,
    # External Submission Tools
    website_search_tool,
    application_submission_tool,
    application_status_tool,
    nsfas_application_submission_tool,
    nsfas_status_tool,
)

# Import mock tools if in test mode
if TEST_MODE:
    from one_for_all.tools.mocks import (
        mock_otp_sender,
        mock_sms_sender,
        mock_whatsapp_sender,
        mock_submission_tool,
        mock_nsfas_submission_tool,
        mock_status_tool,
        mock_nsfas_status_tool,
    )

logger = logging.getLogger(__name__)

# Tool registry mapping tool names (strings) to actual tool instances
# In test mode, mock tools replace real external API tools
if TEST_MODE:
    TOOL_REGISTRY = {
        # OTP & Messaging Tools (MOCKED)
        "sendgrid_otp_sender": mock_otp_sender,
        "sms_otp_sender": mock_sms_sender,
        "send_whatsapp_message": mock_whatsapp_sender,
        "send_whatsapp_otp": mock_whatsapp_sender,
        # OTP Verification Tools (REAL - uses database)
        "verify_otp": verify_otp,
        "check_otp_status": check_otp_status,
        "resend_otp_check": resend_otp_check,
        # Student Number Tools (REAL - uses database)
        "generate_student_number": generate_student_number,
        # Document Review Tools (REAL - uses database)
        "document_flag_tool": document_flag_tool,
        "document_approve_tool": document_approve_tool,
        "get_application_documents": get_application_documents,
        # Vision Tools (GPT-4V) - REAL for document analysis
        "vision_analyze_document": vision_analyze_document,
        "vision_extract_document_text": vision_extract_document_text,
        "vision_compare_documents": vision_compare_documents,
        # Supabase Tools (REAL - uses database)
        "supabase_user_store": supabase_user_store,
        "supabase_user_lookup": supabase_user_lookup,
        "supabase_session_lookup": supabase_session_lookup,
        "supabase_session_create": supabase_session_create,
        "supabase_session_extend": supabase_session_extend,
        "supabase_application_store": supabase_application_store,
        "supabase_rag_store": supabase_rag_store,
        "supabase_rag_query": supabase_rag_query,
        "supabase_nsfas_store": supabase_nsfas_store,
        "supabase_nsfas_documents_store": supabase_nsfas_documents_store,
        # External Submission & Search Tools (MOCKED)
        "website_search_tool": website_search_tool,  # Keep real for RAG
        "application_submission_tool": mock_submission_tool,
        "application_status_tool": mock_status_tool,
        "nsfas_application_submission_tool": mock_nsfas_submission_tool,
        "nsfas_status_tool": mock_nsfas_status_tool,
    }
    log_test_mode_warning()
else:
    TOOL_REGISTRY = {
        # OTP & Messaging Tools
        "sendgrid_otp_sender": sendgrid_otp_sender,
        "sms_otp_sender": sms_otp_sender,
        "send_whatsapp_message": send_whatsapp_message,
        "send_whatsapp_otp": send_whatsapp_otp,
        # OTP Verification Tools
        "verify_otp": verify_otp,
        "check_otp_status": check_otp_status,
        "resend_otp_check": resend_otp_check,
        # Student Number Tools
        "generate_student_number": generate_student_number,
        # Document Review Tools
        "document_flag_tool": document_flag_tool,
        "document_approve_tool": document_approve_tool,
        "get_application_documents": get_application_documents,
        # Vision Tools (GPT-4V)
        "vision_analyze_document": vision_analyze_document,
        "vision_extract_document_text": vision_extract_document_text,
        "vision_compare_documents": vision_compare_documents,
        # Deprecated Supabase Tools (still referenced in agents.yaml)
        "supabase_user_store": supabase_user_store,
        "supabase_user_lookup": supabase_user_lookup,
        "supabase_session_lookup": supabase_session_lookup,
        "supabase_session_create": supabase_session_create,
        "supabase_session_extend": supabase_session_extend,
        "supabase_application_store": supabase_application_store,
        "supabase_rag_store": supabase_rag_store,
        "supabase_rag_query": supabase_rag_query,
        "supabase_nsfas_store": supabase_nsfas_store,
        "supabase_nsfas_documents_store": supabase_nsfas_documents_store,
        # External Submission & Search Tools
        "website_search_tool": website_search_tool,
        "application_submission_tool": application_submission_tool,
        "application_status_tool": application_status_tool,
        "nsfas_application_submission_tool": nsfas_application_submission_tool,
        "nsfas_status_tool": nsfas_status_tool,
    }


class OneForAllCrew:
    def __init__(self):
        base_path = Path(__file__).resolve().parent

        agents_path = base_path / "config" / "agents.yaml"
        tasks_path = base_path / "config" / "tasks.yaml"

        # Load YAML config
        with open(agents_path, "r") as f:
            self.agent_configs = yaml.safe_load(f)

        with open(tasks_path, "r") as f:
            self.task_configs = yaml.safe_load(f)

        # Build agents and tasks
        self.agents = self._load_agents(self.agent_configs)
        self.tasks = self._load_tasks(self.task_configs)

    def _resolve_tools(self, tool_names: list) -> list:
        """Resolve tool names (strings) to actual tool instances.

        Args:
            tool_names: List of tool name strings from YAML config

        Returns:
            List of actual tool instances (BaseTool objects)
        """
        resolved_tools = []
        for tool_name in tool_names:
            if tool_name in TOOL_REGISTRY:
                resolved_tools.append(TOOL_REGISTRY[tool_name])
            else:
                logger.warning(
                    f"Tool '{tool_name}' not found in TOOL_REGISTRY. "
                    f"Available tools: {list(TOOL_REGISTRY.keys())}"
                )
        return resolved_tools

    def _load_agents(self, configs: dict):
        """Create Agent objects from YAML config."""
        agents = {}
        for name, cfg in configs.items():
            # Resolve tool names to actual tool instances
            tool_names = cfg.get("tools", [])
            resolved_tools = self._resolve_tools(tool_names)

            agents[name] = Agent(
                role=cfg.get("role"),
                goal=cfg.get("goal"),
                backstory=cfg.get("backstory"),
                llm=cfg.get("llm", "gpt-3.5-turbo"),
                memory=cfg.get("memory", False),
                tools=resolved_tools,
            )

            logger.debug(
                f"Loaded agent '{name}' with {len(resolved_tools)} tools: "
                f"{[t.name if hasattr(t, 'name') else str(t) for t in resolved_tools]}"
            )
        return agents

    def _load_tasks(self, configs: dict):
        """Create Task objects from YAML config."""
        tasks = {}
        for name, cfg in configs.items():
            tasks[name] = Task(
                description=cfg.get("description"),
                expected_output=cfg.get("expected_output"),
                agent=self.agents[cfg.get("agent")],
            )
        return tasks

    def crew(self):
        """
        Return the full Crew pipeline with the updated multi-university
        + NSFAS workflow. Uses sequential execution.
        """
        ordered_tasks = [
            # Authentication flow
            self.tasks.get("account_creation_task"),
            self.tasks.get("otp_verification_task"),

            # Intake flow
            self.tasks.get("collect_personal_info_task"),
            self.tasks.get("collect_academic_info_task"),
            self.tasks.get("collect_documents_task"),

            # Multi-university flow
            self.tasks.get("program_selection_task"),
            self.tasks.get("rag_research_task"),
            self.tasks.get("application_submission_task"),

            # University application status
            self.tasks.get("university_status_check_task"),

            # NSFAS optional flow
            self.tasks.get("ask_if_apply_for_nsfas_task"),
            self.tasks.get("nsfas_collection_task"),
            self.tasks.get("nsfas_submission_task"),
            self.tasks.get("nsfas_status_check_task"),
        ]

        # Filter out None (in case the user hasn't added all tasks yet)
        ordered_tasks = [t for t in ordered_tasks if t is not None]

        return Crew(
            agents=list(self.agents.values()),
            tasks=ordered_tasks,
            process=Process.sequential
        )

