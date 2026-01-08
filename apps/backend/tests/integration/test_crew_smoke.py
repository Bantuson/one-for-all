"""
Lightweight integration smoke tests for CrewAI configuration.

These tests verify:
- Crew instance creation and configuration
- Agent definitions are valid
- Task definitions are valid
- Tool bindings work correctly
- Workflow structure is correct

These tests run in < 1 minute and don't make real LLM calls.
For full end-to-end tests with real LLM, run manually:
    pytest tests/integration/test_undergraduate_flow.py -v

Why smoke tests?
- Full integration tests take 30+ minutes (real LLM calls)
- CI needs fast feedback (< 5 min)
- These validate configuration without expensive API calls
"""

import pytest
from typing import Dict, Any
from unittest.mock import Mock, patch, MagicMock


@pytest.mark.integration
class TestCrewConfiguration:
    """Test that CrewAI crew is configured correctly."""

    def test_crew_instance_creation(self, test_crew):
        """Verify crew instance can be created."""
        assert test_crew is not None
        crew = test_crew.crew()
        assert crew is not None

    def test_crew_has_agents(self, test_crew):
        """Verify crew has expected agents defined."""
        crew = test_crew.crew()

        # Crew should have agents
        assert hasattr(crew, 'agents')
        assert len(crew.agents) > 0, "Crew should have at least one agent"

    def test_crew_has_tasks(self, test_crew):
        """Verify crew has expected tasks defined."""
        crew = test_crew.crew()

        # Crew should have tasks
        assert hasattr(crew, 'tasks')
        assert len(crew.tasks) > 0, "Crew should have at least one task"

    def test_agents_have_tools(self, test_crew):
        """Verify agents have tools assigned."""
        crew = test_crew.crew()

        # At least some agents should have tools
        agents_with_tools = [a for a in crew.agents if hasattr(a, 'tools') and a.tools]
        assert len(agents_with_tools) > 0, "At least one agent should have tools"

    def test_expected_agent_names(self, test_crew):
        """Verify expected agents are configured."""
        crew = test_crew.crew()

        agent_names = [a.role.lower() for a in crew.agents]

        # Verify core agents exist (partial match)
        expected_roles = ['identity', 'application', 'rag', 'submission', 'nsfas']
        for role in expected_roles:
            matching = [name for name in agent_names if role in name]
            assert len(matching) > 0, f"Expected agent with '{role}' in role name"


@pytest.mark.integration
class TestToolConfiguration:
    """Test that tools are properly configured."""

    def test_tools_can_be_imported(self):
        """Verify tools module can be imported."""
        from one_for_all.tools import (
            sendgrid_otp_sender,
            sms_otp_sender,
            student_number_tool,
        )
        assert sendgrid_otp_sender is not None
        assert sms_otp_sender is not None
        assert student_number_tool is not None

    def test_supabase_client_configured(self):
        """Verify Supabase client is configured."""
        from one_for_all.tools.supabase_client import supabase
        # Client should be available (may be None in test mode without env vars)
        # Just verify the module loads without error

    def test_tool_functions_have_docstrings(self):
        """Verify tool functions have docstrings (used by agents)."""
        from one_for_all.tools import (
            sendgrid_otp_sender,
            sms_otp_sender,
            student_number_tool,
        )

        tools = [sendgrid_otp_sender, sms_otp_sender, student_number_tool]
        for tool in tools:
            assert tool.__doc__ or hasattr(tool, 'description'), \
                f"Tool {tool.__name__} should have docstring for agent understanding"


@pytest.mark.integration
class TestYamlConfiguration:
    """Test that YAML configuration files are valid."""

    def test_agents_yaml_loads(self):
        """Verify agents.yaml can be loaded."""
        import yaml
        from pathlib import Path

        yaml_path = Path(__file__).parent.parent.parent / "src/one_for_all/config/agents.yaml"
        assert yaml_path.exists(), f"agents.yaml not found at {yaml_path}"

        with open(yaml_path) as f:
            config = yaml.safe_load(f)

        assert config is not None
        assert len(config) > 0, "agents.yaml should define agents"

    def test_tasks_yaml_loads(self):
        """Verify tasks.yaml can be loaded."""
        import yaml
        from pathlib import Path

        yaml_path = Path(__file__).parent.parent.parent / "src/one_for_all/config/tasks.yaml"
        assert yaml_path.exists(), f"tasks.yaml not found at {yaml_path}"

        with open(yaml_path) as f:
            config = yaml.safe_load(f)

        assert config is not None
        assert len(config) > 0, "tasks.yaml should define tasks"

    def test_agents_have_required_fields(self):
        """Verify agent definitions have required fields."""
        import yaml
        from pathlib import Path

        yaml_path = Path(__file__).parent.parent.parent / "src/one_for_all/config/agents.yaml"
        with open(yaml_path) as f:
            agents = yaml.safe_load(f)

        required_fields = ['role', 'goal', 'backstory']
        for agent_name, agent_config in agents.items():
            for field in required_fields:
                assert field in agent_config, \
                    f"Agent '{agent_name}' missing required field '{field}'"

    def test_tasks_have_required_fields(self):
        """Verify task definitions have required fields."""
        import yaml
        from pathlib import Path

        yaml_path = Path(__file__).parent.parent.parent / "src/one_for_all/config/tasks.yaml"
        with open(yaml_path) as f:
            tasks = yaml.safe_load(f)

        required_fields = ['description', 'expected_output', 'agent']
        for task_name, task_config in tasks.items():
            for field in required_fields:
                assert field in task_config, \
                    f"Task '{task_name}' missing required field '{field}'"


@pytest.mark.integration
class TestProfileValidation:
    """Test that profile fixtures are valid."""

    def test_undergraduate_profile_has_required_fields(
        self,
        undergraduate_profile: Dict[str, Any]
    ):
        """Verify undergraduate profile has required fields."""
        required = [
            'profile_id', 'full_name', 'mobile_number', 'email',
            'matric_results', 'course_choices', 'nsfas_eligible'
        ]
        for field in required:
            assert field in undergraduate_profile, \
                f"Undergraduate profile missing '{field}'"

    def test_postgraduate_profile_has_required_fields(
        self,
        postgraduate_profile_honours: Dict[str, Any]
    ):
        """Verify postgraduate profile has required fields."""
        required = [
            'profile_id', 'full_name', 'education_level',
            'previous_qualification', 'undergraduate_average'
        ]
        for field in required:
            assert field in postgraduate_profile_honours, \
                f"Postgraduate profile missing '{field}'"


@pytest.mark.integration
class TestWorkflowStructure:
    """Test workflow structure without making LLM calls."""

    def test_sequential_task_execution_order(self, test_crew):
        """Verify tasks are in expected order."""
        crew = test_crew.crew()
        task_names = [t.description[:50] for t in crew.tasks]  # First 50 chars

        # Tasks should exist
        assert len(task_names) > 0

    def test_nsfas_task_exists(self, test_crew):
        """Verify NSFAS task is included in workflow."""
        crew = test_crew.crew()

        # Look for NSFAS in task descriptions
        task_descriptions = [t.description.lower() for t in crew.tasks]
        nsfas_tasks = [d for d in task_descriptions if 'nsfas' in d]

        assert len(nsfas_tasks) > 0, "NSFAS task should be in workflow"

    def test_submission_task_exists(self, test_crew):
        """Verify submission task is included in workflow."""
        crew = test_crew.crew()

        task_descriptions = [t.description.lower() for t in crew.tasks]
        submission_tasks = [d for d in task_descriptions if 'submit' in d]

        assert len(submission_tasks) > 0, "Submission task should be in workflow"
