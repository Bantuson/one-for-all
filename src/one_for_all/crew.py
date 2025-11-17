import yaml
from pathlib import Path
from crewai import Crew, Process, Agent, Task

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

    def _load_agents(self, configs: dict):
        """Create Agent objects from YAML config."""
        agents = {}
        for name, cfg in configs.items():
            agents[name] = Agent(
                role=cfg.get("role"),
                goal=cfg.get("goal"),
                backstory=cfg.get("backstory"),
                llm=cfg.get("llm", "gpt-3.5-turbo"),
                memory=cfg.get("memory", False),
                tools=cfg.get("tools", []),
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

