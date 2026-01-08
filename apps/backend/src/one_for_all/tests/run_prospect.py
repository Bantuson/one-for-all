#!/usr/bin/env python3
"""
Test Runner Script for CrewAI Application Agent Experiments

Runs prospect profile tests against the OneForAllCrew and generates
experiment result reports with Phoenix telemetry.

Usage:
    python -m one_for_all.tests.run_prospect --profile profile_001
    python -m one_for_all.tests.run_prospect --profile exp_001
    python -m one_for_all.tests.run_prospect --profile profile_001 --dry-run
    python -m one_for_all.tests.run_prospect --verify-phoenix

Options:
    --profile       Profile ID to test (e.g., profile_001, exp_001)
    --dry-run       Parse profile and show inputs without running crew
    --no-save       Don't save the result report
    --verbose       Enable verbose logging
    --verify-phoenix  Verify Phoenix telemetry setup and exit
"""

import argparse
import logging
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def setup_environment(use_production: bool = False):
    """
    Load environment variables from root .env.local or .env.test.

    Args:
        use_production: If True, uses production tools; if False, uses test mode
    """
    try:
        from dotenv import load_dotenv
        import os

        # Load from monorepo root (5 levels up from this file)
        project_root = Path(__file__).resolve().parents[5]

        if use_production:
            # Production mode - use .env.local and disable test mode
            env_path = project_root / ".env.local"
            os.environ["ONEFORALL_TEST_MODE"] = "false"
            logger.info("Running in PRODUCTION mode with real tools")
        else:
            # Test mode - try .env.test first, fallback to .env.local
            env_test_path = project_root / "apps" / "backend" / ".env.test"
            env_path = env_test_path if env_test_path.exists() else project_root / ".env.local"
            os.environ["ONEFORALL_TEST_MODE"] = "true"
            logger.info("Running in TEST mode with mock tools")

        if env_path.exists():
            load_dotenv(dotenv_path=env_path)
            logger.info(f"Loaded environment from {env_path}")
        else:
            logger.warning(f"Environment file not found: {env_path}")

    except ImportError:
        logger.warning("python-dotenv not installed, skipping env loading")


def setup_phoenix(project_name: str) -> tuple[Optional[Any], Optional[str]]:
    """
    Initialize Phoenix observability for the test run.

    Args:
        project_name: Phoenix project name (e.g., "prospect-profile_001")

    Returns:
        Tuple of (tracer_provider, phoenix_url)
    """
    try:
        from one_for_all.observability import (
            setup_observability,
            get_phoenix_url,
        )

        tracer = setup_observability(project_name=project_name)
        phoenix_url = get_phoenix_url()

        if tracer:
            logger.info(f"Phoenix observability initialized: {phoenix_url}")
            logger.info(f"Project name: {project_name}")
        else:
            logger.warning("Phoenix observability could not be initialized")

        return tracer, phoenix_url

    except ImportError as e:
        logger.warning(f"Phoenix packages not available: {e}")
        return None, None
    except Exception as e:
        logger.error(f"Error initializing Phoenix: {e}")
        return None, None


def verify_phoenix_setup() -> bool:
    """
    Verify Phoenix dependencies are installed and working.

    Creates a simple test span to confirm telemetry is operational.

    Returns:
        True if Phoenix is working, False otherwise
    """
    print("\n" + "=" * 60)
    print("Phoenix Telemetry Verification")
    print("=" * 60 + "\n")

    # Check dependencies
    dependencies = {
        "phoenix": "arize-phoenix",
        "openinference.instrumentation.crewai": "openinference-instrumentation-crewai",
        "openinference.instrumentation.litellm": "openinference-instrumentation-litellm",
    }

    all_installed = True

    print("Checking dependencies:")
    for module, package in dependencies.items():
        try:
            __import__(module.replace(".", "_").split("_")[0])
            print(f"  [OK] {package}")
        except ImportError:
            print(f"  [MISSING] {package}")
            all_installed = False

    if not all_installed:
        print("\nSome dependencies are missing. Install with:")
        print("  pip install arize-phoenix openinference-instrumentation-crewai "
              "openinference-instrumentation-litellm")
        return False

    # Try to initialize Phoenix
    print("\nInitializing Phoenix...")
    try:
        import phoenix as px
        from phoenix.otel import register
        from openinference.instrumentation.crewai import CrewAIInstrumentor
        from openinference.instrumentation.litellm import LiteLLMInstrumentor

        # Launch local Phoenix
        print("  Starting local Phoenix server...")
        session = px.launch_app()

        # Register tracer
        tracer_provider = register(
            project_name="phoenix-verification-test",
            auto_instrument=True,
        )

        print(f"  [OK] Phoenix server running at http://localhost:6006")

        # Create a test span
        print("\nCreating test span...")
        from opentelemetry import trace

        tracer = trace.get_tracer(__name__)
        with tracer.start_as_current_span("verification_test_span") as span:
            span.set_attribute("test.type", "verification")
            span.set_attribute("test.timestamp", datetime.now().isoformat())
            time.sleep(0.1)  # Small delay to ensure span is recorded

        print("  [OK] Test span created successfully")

        # Instrument CrewAI
        print("\nInstrumenting CrewAI...")
        try:
            CrewAIInstrumentor().instrument()
            print("  [OK] CrewAI instrumentation enabled")
        except Exception as e:
            print(f"  [WARN] CrewAI instrumentation skipped: {e}")

        # Instrument LiteLLM
        print("\nInstrumenting LiteLLM...")
        try:
            LiteLLMInstrumentor().instrument()
            print("  [OK] LiteLLM instrumentation enabled")
        except Exception as e:
            print(f"  [WARN] LiteLLM instrumentation skipped: {e}")

        print("\n" + "=" * 60)
        print("Phoenix Verification PASSED")
        print("=" * 60)
        print(f"\nPhoenix UI: http://localhost:6006")
        print("Check the 'phoenix-verification-test' project for the test span.")
        print("\nNote: Phoenix server will continue running in the background.")
        print("      It will stop when this process exits.\n")

        return True

    except Exception as e:
        print(f"\n  [ERROR] Phoenix initialization failed: {e}")
        print("\n" + "=" * 60)
        print("Phoenix Verification FAILED")
        print("=" * 60 + "\n")
        return False


def load_profile(profile_id: str) -> Dict[str, Any]:
    """
    Load and parse a prospect profile.

    Args:
        profile_id: Profile identifier (e.g., "profile_001" or "exp_001")

    Returns:
        Dictionary of crew kickoff inputs
    """
    from one_for_all.tests.profile_parser import ProfileParser

    parser = ProfileParser()
    profile = parser.parse_profile(profile_id)
    inputs = parser.to_crew_inputs(profile)

    logger.info(f"Loaded profile: {profile.profile_id}")
    logger.info(f"Prospect: {profile.name}")
    logger.info(f"APS Score: {profile.total_aps_score}")
    logger.info(f"First Choice: {profile.first_choice}")

    return inputs


def run_crew(inputs: Dict[str, Any]) -> tuple[Any, Dict[str, Any]]:
    """
    Run the OneForAllCrew with the given inputs.

    Args:
        inputs: Crew kickoff inputs

    Returns:
        Tuple of (crew_output, execution_metrics)
    """
    from one_for_all.crew import OneForAllCrew

    logger.info("Initializing OneForAllCrew...")
    crew_builder = OneForAllCrew()
    crew = crew_builder.crew()

    metrics = {
        "agents": {},
        "error": None,
        "in_progress": False,
    }

    logger.info("Starting crew execution...")

    try:
        # Track agent execution (simplified - real tracking would use callbacks)
        start_time = time.time()

        result = crew.kickoff(inputs=inputs)

        end_time = time.time()

        # Basic metrics
        metrics["total_duration"] = end_time - start_time

        # Mark agents as successful (simplified)
        for agent_name in [
            "identity_auth_agent",
            "application_intake_agent",
            "rag_specialist_agent",
            "submission_agent",
            "nsfas_agent",
        ]:
            metrics["agents"][agent_name] = {
                "success": True,
                "turns": 0,  # Would need callbacks to track
                "duration": 0,
                "issues": [],
                "notes": [],
                "metrics": {},
            }

        return result, metrics

    except Exception as e:
        logger.error(f"Crew execution failed: {e}")
        metrics["error"] = str(e)
        return None, metrics


def generate_result_report(
    profile_id: str,
    inputs: Dict[str, Any],
    crew_output: Any,
    metrics: Dict[str, Any],
    start_time: datetime,
    end_time: datetime,
    phoenix_url: Optional[str],
    save: bool = True,
) -> Optional[Path]:
    """
    Generate and optionally save the experiment result report.

    Args:
        profile_id: Profile identifier
        inputs: Crew inputs used
        crew_output: Crew execution result
        metrics: Execution metrics
        start_time: Experiment start time
        end_time: Experiment end time
        phoenix_url: Phoenix UI URL
        save: Whether to save the report

    Returns:
        Path to saved report, or None if not saved
    """
    from one_for_all.tests.result_generator import (
        ResultGenerator,
        ExperimentResult,
    )

    generator = ResultGenerator()

    # Create result with profile data
    result = generator.generate_result(
        profile_id=profile_id,
        crew_output=crew_output,
        execution_metrics=metrics,
        start_time=start_time,
        end_time=end_time,
        phoenix_url=phoenix_url,
        phoenix_project=f"prospect-{profile_id}",
    )

    # Enrich with profile data
    result.prospect_name = inputs.get("full_name", "")
    result.aps_score = inputs.get("total_aps_score")
    result.nsfas_eligible = inputs.get("nsfas_eligible", False)

    course_choices = inputs.get("course_choices", [])
    if course_choices:
        result.first_choice_course = course_choices[0].get("programme", "")
        if len(course_choices) > 1:
            result.second_choice_course = course_choices[1].get("programme", "")

    result.target_institutions = list(set(
        c.get("institution", "") for c in course_choices if c.get("institution")
    ))

    if save:
        saved_path = generator.save_report(result)
        logger.info(f"Report saved to: {saved_path}")
        return saved_path

    # Print report to console if not saving
    report = generator.generate_report(result)
    print("\n" + "=" * 60)
    print("EXPERIMENT REPORT")
    print("=" * 60)
    print(report)

    return None


def main():
    """Main entry point for the test runner."""
    parser = argparse.ArgumentParser(
        description="Run CrewAI application agent experiments",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python -m one_for_all.tests.run_prospect --profile profile_001
  python -m one_for_all.tests.run_prospect --profile exp_005 --dry-run
  python -m one_for_all.tests.run_prospect --verify-phoenix
        """
    )

    parser.add_argument(
        "--profile",
        type=str,
        help="Profile ID to test (e.g., profile_001, exp_001)"
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse profile and show inputs without running crew"
    )

    parser.add_argument(
        "--no-save",
        action="store_true",
        help="Don't save the result report to disk"
    )

    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging"
    )

    parser.add_argument(
        "--verify-phoenix",
        action="store_true",
        help="Verify Phoenix telemetry setup and exit"
    )

    parser.add_argument(
        "--production",
        action="store_true",
        help="Run with production tools (real API calls). Default is test mode with mocks."
    )

    parser.add_argument(
        "--cleanup",
        action="store_true",
        help="Clean up test data after run (deletes TEST- prefixed records)"
    )

    args = parser.parse_args()

    # Set logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Load environment (test mode by default, production if --production flag)
    setup_environment(use_production=args.production)

    # Handle Phoenix verification
    if args.verify_phoenix:
        success = verify_phoenix_setup()
        sys.exit(0 if success else 1)

    # Require profile for actual run
    if not args.profile:
        parser.error("--profile is required (or use --verify-phoenix)")

    profile_id = args.profile

    # Normalize profile ID
    if profile_id.startswith("exp_"):
        num = profile_id.split("_")[1]
        profile_id = f"profile_{num}"
        logger.info(f"Converted experiment ID to profile ID: {profile_id}")

    print("\n" + "=" * 60)
    print(f"CrewAI Application Agent Experiment")
    print(f"Profile: {profile_id}")
    print("=" * 60 + "\n")

    # Load profile
    try:
        inputs = load_profile(profile_id)
    except FileNotFoundError as e:
        logger.error(f"Profile not found: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Error loading profile: {e}")
        sys.exit(1)

    # Dry run mode - just show inputs
    if args.dry_run:
        import json

        print("\n" + "-" * 40)
        print("DRY RUN - Profile Inputs")
        print("-" * 40)
        print(json.dumps(inputs, indent=2, default=str))
        print("\nUse without --dry-run to execute the crew.\n")
        sys.exit(0)

    # Setup Phoenix observability
    phoenix_project = f"prospect-{profile_id}"
    tracer, phoenix_url = setup_phoenix(phoenix_project)

    if phoenix_url:
        print(f"\nPhoenix Traces: {phoenix_url}")
        print(f"Project: {phoenix_project}\n")

    # Run the experiment
    start_time = datetime.now()
    print(f"Starting experiment at {start_time.isoformat()}")
    print("-" * 40)

    try:
        crew_output, metrics = run_crew(inputs)

        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        print("-" * 40)
        print(f"Experiment completed in {duration:.2f} seconds")

        # Generate report
        saved_path = generate_result_report(
            profile_id=profile_id,
            inputs=inputs,
            crew_output=crew_output,
            metrics=metrics,
            start_time=start_time,
            end_time=end_time,
            phoenix_url=phoenix_url,
            save=not args.no_save,
        )

        # Print summary
        print("\n" + "=" * 60)
        print("EXPERIMENT SUMMARY")
        print("=" * 60)
        print(f"Profile: {profile_id}")
        print(f"Prospect: {inputs.get('full_name', 'Unknown')}")
        print(f"Duration: {duration:.2f} seconds")
        print(f"Status: {'Success' if crew_output else 'Failed'}")

        if phoenix_url:
            print(f"\nView traces at: {phoenix_url}")
            print(f"Project: {phoenix_project}")

        if saved_path:
            print(f"\nReport saved: {saved_path}")

        print("=" * 60 + "\n")

        # Clean up test data if requested
        if args.cleanup and not args.production:
            print("\nCleaning up test data...")
            try:
                from one_for_all.tests.cleanup import cleanup_test_data
                cleanup_result = cleanup_test_data()
                print(f"Cleanup completed: {cleanup_result}")
            except Exception as cleanup_error:
                logger.error(f"Cleanup failed: {cleanup_error}")

        # Exit with appropriate code
        sys.exit(0 if crew_output else 1)

    except KeyboardInterrupt:
        print("\n\nExperiment interrupted by user")
        sys.exit(130)
    except Exception as e:
        logger.exception(f"Experiment failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
