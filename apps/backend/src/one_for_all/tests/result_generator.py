"""
Result Generator Module

Generates markdown experiment result reports from CrewAI execution results.
Follows the exp_NNN.md template format.

Usage:
    from one_for_all.tests.result_generator import ResultGenerator

    generator = ResultGenerator()
    report = generator.generate_report(
        profile_id="profile_001",
        crew_result=crew_output,
        execution_metrics=metrics,
        start_time=start,
        end_time=end
    )
    generator.save_report(report, "exp_001")
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field


@dataclass
class AgentMetrics:
    """Performance metrics for a single agent."""
    agent_name: str
    conversation_turns: int = 0
    duration_seconds: float = 0.0
    success: bool = False
    issues: List[str] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)
    # Custom metrics per agent type
    custom_metrics: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TrajectoryStep:
    """A single step in the agent trajectory."""
    agent: str
    action: str
    expected: str = ""
    actual: str = ""
    deviation: Optional[str] = None
    severity: str = "None"  # None, Low, Medium, High


@dataclass
class ExperimentResult:
    """Complete experiment result data."""
    experiment_id: str
    profile_id: str
    date: datetime
    status: str  # Not Started, In Progress, Completed, Failed

    # Prospect Summary
    prospect_name: str = ""
    education_level: str = ""
    aps_score: Optional[int] = None
    first_choice_course: str = ""
    second_choice_course: str = ""
    nsfas_eligible: bool = False
    target_institutions: List[str] = field(default_factory=list)

    # Agent Metrics
    agent_metrics: Dict[str, AgentMetrics] = field(default_factory=dict)

    # Trajectory
    expected_trajectory: List[TrajectoryStep] = field(default_factory=list)
    actual_trajectory: List[TrajectoryStep] = field(default_factory=list)
    deviations: List[TrajectoryStep] = field(default_factory=list)

    # Observations
    what_worked: List[str] = field(default_factory=list)
    improvements_needed: List[str] = field(default_factory=list)
    unexpected_behaviors: List[str] = field(default_factory=list)

    # Recommendations
    agent_improvements: List[str] = field(default_factory=list)
    prompt_adjustments: List[str] = field(default_factory=list)
    tool_enhancements: List[str] = field(default_factory=list)

    # Aggregate Metrics
    total_conversation_turns: int = 0
    total_time_minutes: float = 0.0
    agents_passed: int = 0
    total_agents: int = 5

    # Raw data
    crew_output: Any = None
    error_logs: List[str] = field(default_factory=list)

    # Phoenix Trace URL
    phoenix_url: Optional[str] = None
    phoenix_project: Optional[str] = None


class ResultGenerator:
    """
    Generates markdown experiment result reports.

    Follows the exp_NNN.md template format established in
    .docs/application_agents_testing/exp_results/
    """

    PROJECT_ROOT = Path(__file__).resolve().parents[5]
    RESULTS_DIR = PROJECT_ROOT / ".docs" / "application_agents_testing" / "exp_results"
    PROFILES_DIR = PROJECT_ROOT / ".docs" / "application_agents_testing" / "prospect_profiles"

    # Agent metrics templates
    AGENT_METRICS_TEMPLATE = {
        "identity_auth_agent": {
            "OTP Delivery Time": ("< 30s", "-"),
            "Student Number Generated": ("Valid format", "-"),
            "Identity Verification": ("Success", "-"),
            "Conversation Turns": ("< 3", "-"),
        },
        "application_intake_agent": {
            "Required Fields Captured": ("100%", "-"),
            "First Choice Recorded": ("Yes", "-"),
            "Second Choice Recorded": ("Yes", "-"),
            "Document Handling": ("Graceful", "-"),
            "Conversation Turns": ("< 5", "-"),
        },
        "rag_specialist_agent": {
            "APS Comparison Accuracy": ("> 95%", "-"),
            "Course Eligibility Check": ("Correct", "-"),
            "Alternative Suggestions": ("Relevant", "-"),
            "Response Time": ("< 5s", "-"),
            "Conversation Turns": ("< 4", "-"),
        },
        "submission_agent": {
            "Payload Validity": ("100%", "-"),
            "Multi-Institution Handling": ("Correct", "-"),
            "Submission Confirmation": ("Received", "-"),
            "Error Recovery": ("Successful", "-"),
            "Conversation Turns": ("< 3", "-"),
        },
        "nsfas_agent": {
            "Data Reuse Rate": ("> 80%", "-"),
            "New Fields Collected": ("Minimal", "-"),
            "Eligibility Assessment": ("Correct", "-"),
            "Application Submitted": ("Yes", "-"),
            "Conversation Turns": ("< 4", "-"),
        },
    }

    def __init__(self, results_dir: Optional[Path] = None):
        """
        Initialize the result generator.

        Args:
            results_dir: Optional custom results directory path
        """
        self.results_dir = results_dir or self.RESULTS_DIR

    def generate_result(
        self,
        profile_id: str,
        crew_output: Any,
        execution_metrics: Dict[str, Any],
        start_time: datetime,
        end_time: datetime,
        phoenix_url: Optional[str] = None,
        phoenix_project: Optional[str] = None,
    ) -> ExperimentResult:
        """
        Generate an ExperimentResult from crew execution data.

        Args:
            profile_id: The prospect profile ID (e.g., "profile_001")
            crew_output: Raw output from crew.kickoff()
            execution_metrics: Dictionary of execution metrics
            start_time: Experiment start time
            end_time: Experiment end time
            phoenix_url: URL to Phoenix UI
            phoenix_project: Phoenix project name

        Returns:
            ExperimentResult dataclass with all data populated
        """
        # Derive experiment ID from profile ID
        num = profile_id.split("_")[1]
        experiment_id = f"exp-{num}"

        # Calculate duration
        duration = end_time - start_time
        total_minutes = duration.total_seconds() / 60

        # Determine status based on crew output
        status = self._determine_status(crew_output, execution_metrics)

        # Extract agent metrics
        agent_metrics = self._extract_agent_metrics(execution_metrics)

        # Count passed agents
        agents_passed = sum(
            1 for m in agent_metrics.values() if m.success
        )

        # Calculate total conversation turns
        total_turns = sum(
            m.conversation_turns for m in agent_metrics.values()
        )

        return ExperimentResult(
            experiment_id=experiment_id,
            profile_id=profile_id,
            date=start_time,
            status=status,
            agent_metrics=agent_metrics,
            total_conversation_turns=total_turns,
            total_time_minutes=round(total_minutes, 2),
            agents_passed=agents_passed,
            crew_output=crew_output,
            phoenix_url=phoenix_url,
            phoenix_project=phoenix_project,
        )

    def _determine_status(
        self,
        crew_output: Any,
        metrics: Dict[str, Any]
    ) -> str:
        """Determine experiment status from results."""
        if metrics.get("error"):
            return "Failed"
        if crew_output is None:
            return "Not Started"
        if metrics.get("in_progress"):
            return "In Progress"
        return "Completed"

    def _extract_agent_metrics(
        self,
        metrics: Dict[str, Any]
    ) -> Dict[str, AgentMetrics]:
        """Extract per-agent metrics from execution metrics."""
        agent_metrics = {}

        for agent_name in self.AGENT_METRICS_TEMPLATE.keys():
            agent_data = metrics.get("agents", {}).get(agent_name, {})

            agent_metrics[agent_name] = AgentMetrics(
                agent_name=agent_name,
                conversation_turns=agent_data.get("turns", 0),
                duration_seconds=agent_data.get("duration", 0.0),
                success=agent_data.get("success", False),
                issues=agent_data.get("issues", []),
                notes=agent_data.get("notes", []),
                custom_metrics=agent_data.get("metrics", {}),
            )

        return agent_metrics

    def generate_report(self, result: ExperimentResult) -> str:
        """
        Generate a markdown report from an ExperimentResult.

        Args:
            result: ExperimentResult dataclass

        Returns:
            Formatted markdown string
        """
        lines = []

        # Header
        lines.append(f"# Experiment {result.experiment_id.replace('-', ' ').title()}: "
                     f"Application Test")
        lines.append("")

        # Metadata
        lines.append("## Metadata")
        lines.append("")
        lines.append("| Field | Value |")
        lines.append("|-------|-------|")
        lines.append(f"| **Experiment ID** | {result.experiment_id} |")
        lines.append(f"| **Date** | {result.date.strftime('%Y-%m-%d %H:%M:%S')} |")
        lines.append(f"| **Status** | {result.status} |")
        lines.append(f"| **Prospect Profile** | [{result.profile_id}.md]"
                     f"(../prospect_profiles/{self._get_profile_subdir(result.profile_id)}"
                     f"/{result.profile_id}.md) |")
        if result.target_institutions:
            lines.append(f"| **Target Institution(s)** | "
                         f"{', '.join(result.target_institutions)} |")
        if result.phoenix_url:
            lines.append(f"| **Phoenix Traces** | [{result.phoenix_project}]"
                         f"({result.phoenix_url}) |")
        lines.append("")
        lines.append("---")
        lines.append("")

        # Prospect Summary
        lines.append("## Prospect Summary")
        lines.append("")
        lines.append("| Attribute | Value |")
        lines.append("|-----------|-------|")
        lines.append(f"| Name | {result.prospect_name or 'TBD'} |")
        lines.append(f"| Education Level | {result.education_level or 'Matric'} |")
        lines.append(f"| APS Score | {result.aps_score or 'TBD'} |")
        lines.append(f"| First Choice Course | {result.first_choice_course or 'TBD'} |")
        lines.append(f"| Second Choice Course | {result.second_choice_course or 'TBD'} |")
        lines.append(f"| NSFAS Eligible | {'Yes' if result.nsfas_eligible else 'No'} |")
        lines.append("")
        lines.append("---")
        lines.append("")

        # Agent Performance Metrics
        lines.append("## Agent Performance Metrics")
        lines.append("")

        for idx, (agent_name, template) in enumerate(
            self.AGENT_METRICS_TEMPLATE.items(), 1
        ):
            lines.append(f"### {idx}. {agent_name}")
            lines.append("")
            lines.append("| Metric | Target | Actual | Pass/Fail |")
            lines.append("|--------|--------|--------|-----------|")

            agent_data = result.agent_metrics.get(agent_name)
            custom = agent_data.custom_metrics if agent_data else {}

            for metric_name, (target, default) in template.items():
                actual = custom.get(metric_name, default)
                pass_fail = self._evaluate_metric(metric_name, target, actual)
                lines.append(f"| {metric_name} | {target} | {actual} | {pass_fail} |")

            lines.append("")

            # Issues
            issues = agent_data.issues if agent_data else []
            lines.append("**Issues Encountered:**")
            if issues:
                for issue in issues:
                    lines.append(f"- {issue}")
            else:
                lines.append("- None")
            lines.append("")

            # Notes
            notes = agent_data.notes if agent_data else []
            lines.append("**Notes:**")
            if notes:
                for note in notes:
                    lines.append(f"- {note}")
            else:
                lines.append("-")
            lines.append("")
            lines.append("---")
            lines.append("")

        # Trajectory Analysis
        lines.append("## Trajectory Analysis")
        lines.append("")
        lines.append("### Expected Behavior")
        lines.append("")
        lines.append("```")
        lines.append("1. identity_auth_agent: Verify identity -> Generate OTP -> "
                     "Confirm -> Generate student number")
        lines.append("2. application_intake_agent: Collect personal info -> "
                     "Capture course choices -> Handle documents")
        lines.append("3. rag_specialist_agent: Calculate APS -> Check eligibility -> "
                     "Suggest alternatives if needed")
        lines.append("4. submission_agent: Assemble payload -> "
                     "Submit to institution(s) -> Confirm")
        lines.append("5. nsfas_agent: Check eligibility -> Reuse data -> "
                     "Collect additional info -> Submit")
        lines.append("```")
        lines.append("")
        lines.append("### Actual Behavior")
        lines.append("")
        lines.append("```")
        for step in result.actual_trajectory:
            lines.append(f"{step.agent}: {step.actual or '[Document actual flow]'}")
        if not result.actual_trajectory:
            lines.append("1. identity_auth_agent: [Document actual flow]")
            lines.append("2. application_intake_agent: [Document actual flow]")
            lines.append("3. rag_specialist_agent: [Document actual flow]")
            lines.append("4. submission_agent: [Document actual flow]")
            lines.append("5. nsfas_agent: [Document actual flow]")
        lines.append("```")
        lines.append("")
        lines.append("### Deviations")
        lines.append("")
        lines.append("| Step | Expected | Actual | Severity |")
        lines.append("|------|----------|--------|----------|")
        if result.deviations:
            for dev in result.deviations:
                lines.append(f"| {dev.agent} | {dev.expected} | {dev.actual} | "
                             f"{dev.severity} |")
        else:
            lines.append("| - | - | - | - |")
        lines.append("")
        lines.append("---")
        lines.append("")

        # Observations
        lines.append("## Observations")
        lines.append("")
        lines.append("### What Worked Well")
        for item in result.what_worked or ["-"]:
            lines.append(f"- {item}")
        lines.append("")
        lines.append("### What Needs Improvement")
        for item in result.improvements_needed or ["-"]:
            lines.append(f"- {item}")
        lines.append("")
        lines.append("### Unexpected Behaviors")
        for item in result.unexpected_behaviors or ["-"]:
            lines.append(f"- {item}")
        lines.append("")
        lines.append("---")
        lines.append("")

        # Recommendations
        lines.append("## Recommendations")
        lines.append("")
        lines.append("### Agent Improvements")
        for item in result.agent_improvements or ["-"]:
            lines.append(f"- {item}")
        lines.append("")
        lines.append("### Prompt Adjustments")
        for item in result.prompt_adjustments or ["-"]:
            lines.append(f"- {item}")
        lines.append("")
        lines.append("### Tool Enhancements")
        for item in result.tool_enhancements or ["-"]:
            lines.append(f"- {item}")
        lines.append("")
        lines.append("---")
        lines.append("")

        # Aggregate Metrics
        lines.append("## Aggregate Metrics")
        lines.append("")
        lines.append("| Metric | Value |")
        lines.append("|--------|-------|")
        lines.append(f"| **Total Conversation Turns** | {result.total_conversation_turns} |")
        lines.append(f"| **Total Time (minutes)** | {result.total_time_minutes} |")
        lines.append(f"| **Agents Passed** | {result.agents_passed} / "
                     f"{result.total_agents} |")
        lines.append(f"| **Overall Status** | "
                     f"{'Pass' if result.status == 'Completed' else 'Fail'} |")
        lines.append("")
        lines.append("---")
        lines.append("")

        # Attachments
        lines.append("## Attachments")
        lines.append("")
        lines.append("- [ ] Conversation transcript")
        lines.append("- [ ] Error logs (if any)")
        lines.append("- [ ] Screenshots (if relevant)")
        if result.phoenix_url:
            lines.append(f"- [x] [Phoenix Traces]({result.phoenix_url})")
        lines.append("")

        # Crew Output (if available)
        if result.crew_output:
            lines.append("---")
            lines.append("")
            lines.append("## Raw Crew Output")
            lines.append("")
            lines.append("```json")
            try:
                lines.append(json.dumps(result.crew_output, indent=2, default=str))
            except (TypeError, ValueError):
                lines.append(str(result.crew_output))
            lines.append("```")
            lines.append("")

        # Error Logs
        if result.error_logs:
            lines.append("---")
            lines.append("")
            lines.append("## Error Logs")
            lines.append("")
            lines.append("```")
            for log in result.error_logs:
                lines.append(log)
            lines.append("```")
            lines.append("")

        return "\n".join(lines)

    def _get_profile_subdir(self, profile_id: str) -> str:
        """Determine profile subdirectory (undergrad or postgrad)."""
        num = int(profile_id.split("_")[1])
        return "undergrad" if num <= 10 else "postgrad"

    def _evaluate_metric(
        self,
        metric_name: str,
        target: str,
        actual: Any
    ) -> str:
        """Evaluate if a metric passes or fails."""
        if actual == "-" or actual is None:
            return "-"

        # Simple string comparisons
        if target == actual:
            return "Pass"

        # Percentage comparisons
        if "%" in target:
            try:
                target_pct = float(target.replace(">", "").replace("%", "").strip())
                actual_pct = float(str(actual).replace("%", "").strip())
                if ">" in target and actual_pct > target_pct:
                    return "Pass"
                if actual_pct >= target_pct:
                    return "Pass"
            except ValueError:
                pass

        # Time comparisons (< Xs or < Ns)
        if "<" in target and ("s" in target or "seconds" in target.lower()):
            try:
                target_time = float(
                    target.replace("<", "").replace("s", "").strip()
                )
                actual_time = float(
                    str(actual).replace("s", "").strip()
                )
                if actual_time < target_time:
                    return "Pass"
            except ValueError:
                pass

        # Boolean/success checks
        if target.lower() in ("yes", "success", "correct", "valid format"):
            if str(actual).lower() in ("yes", "true", "success", "correct"):
                return "Pass"

        return "Fail"

    def save_report(
        self,
        result: ExperimentResult,
        experiment_id: Optional[str] = None
    ) -> Path:
        """
        Save a generated report to the results directory.

        Args:
            result: ExperimentResult to save
            experiment_id: Optional override for experiment ID

        Returns:
            Path to the saved report file
        """
        exp_id = experiment_id or result.experiment_id

        # Ensure directory exists
        self.results_dir.mkdir(parents=True, exist_ok=True)

        # Generate filename
        filename = f"{exp_id.replace('-', '_')}.md"
        filepath = self.results_dir / filename

        # Generate and save report
        report = self.generate_report(result)
        filepath.write_text(report, encoding="utf-8")

        return filepath


def generate_experiment_report(
    profile_id: str,
    crew_output: Any,
    metrics: Dict[str, Any],
    start_time: datetime,
    end_time: datetime,
    phoenix_url: Optional[str] = None,
    phoenix_project: Optional[str] = None,
    save: bool = True,
) -> tuple[ExperimentResult, Optional[Path]]:
    """
    Convenience function to generate and optionally save an experiment report.

    Args:
        profile_id: The prospect profile ID
        crew_output: Raw crew output
        metrics: Execution metrics
        start_time: Start time
        end_time: End time
        phoenix_url: Phoenix UI URL
        phoenix_project: Phoenix project name
        save: Whether to save the report to disk

    Returns:
        Tuple of (ExperimentResult, saved_path or None)
    """
    generator = ResultGenerator()

    result = generator.generate_result(
        profile_id=profile_id,
        crew_output=crew_output,
        execution_metrics=metrics,
        start_time=start_time,
        end_time=end_time,
        phoenix_url=phoenix_url,
        phoenix_project=phoenix_project,
    )

    saved_path = None
    if save:
        saved_path = generator.save_report(result)

    return result, saved_path


if __name__ == "__main__":
    # Test the generator with mock data
    from datetime import datetime, timedelta

    start = datetime.now()
    end = start + timedelta(minutes=5)

    mock_metrics = {
        "agents": {
            "identity_auth_agent": {
                "turns": 2,
                "duration": 15.5,
                "success": True,
                "metrics": {
                    "OTP Delivery Time": "12s",
                    "Student Number Generated": "UP2024000001",
                    "Identity Verification": "Success",
                    "Conversation Turns": "2",
                }
            }
        }
    }

    result = ExperimentResult(
        experiment_id="exp-001",
        profile_id="profile_001",
        date=start,
        status="Completed",
        prospect_name="Thabo Molefe",
        education_level="Matric",
        aps_score=36,
        first_choice_course="BEng (Computer Engineering)",
        second_choice_course="BSc (Computer Science)",
        nsfas_eligible=True,
        target_institutions=["University of Pretoria"],
        total_time_minutes=5.0,
        agents_passed=1,
        phoenix_url="http://localhost:6006",
        phoenix_project="prospect-profile_001",
    )

    generator = ResultGenerator()
    report = generator.generate_report(result)

    print("Generated Report Preview:")
    print("=" * 60)
    print(report[:2000])
    print("...")
