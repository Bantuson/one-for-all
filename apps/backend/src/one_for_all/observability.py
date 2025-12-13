"""
Phoenix Observability Module for CrewAI Scanner

This module sets up Arize Phoenix for tracing and monitoring
the scanner agents' LLM calls, tool usage, and task execution.

Usage:
    from one_for_all.observability import setup_observability, get_tracer

    # At application startup
    tracer = setup_observability()

    # Use tracer for custom spans
    with tracer.start_as_current_span("my_operation"):
        # Your code here
        pass
"""

import os
import logging
from typing import Optional
from contextlib import contextmanager

# Configure logging
logger = logging.getLogger(__name__)

# Global tracer instance
_tracer = None
_phoenix_session = None


def setup_observability(
    project_name: str = "oneforall-scanner",
    use_cloud: bool = False,
) -> Optional[object]:
    """
    Initialize Phoenix observability with CrewAI and LiteLLM instrumentation.

    Args:
        project_name: Name for the Phoenix project
        use_cloud: If True, connect to Phoenix Cloud; otherwise use local Phoenix

    Returns:
        The OpenTelemetry tracer provider, or None if setup fails
    """
    global _tracer, _phoenix_session

    try:
        import phoenix as px
        from phoenix.otel import register
        from openinference.instrumentation.crewai import CrewAIInstrumentor
        from openinference.instrumentation.litellm import LiteLLMInstrumentor

        # Check if already initialized
        if _tracer is not None:
            logger.info("Phoenix observability already initialized")
            return _tracer

        if use_cloud:
            # Connect to Phoenix Cloud
            api_key = os.getenv("PHOENIX_API_KEY")
            endpoint = os.getenv(
                "PHOENIX_COLLECTOR_ENDPOINT",
                "https://app.phoenix.arize.com"
            )

            if not api_key:
                logger.warning(
                    "PHOENIX_API_KEY not set, falling back to local Phoenix"
                )
                use_cloud = False
            else:
                logger.info(f"Connecting to Phoenix Cloud at {endpoint}")
                tracer_provider = register(
                    project_name=project_name,
                    endpoint=endpoint,
                    headers={"api_key": api_key},
                )

        if not use_cloud:
            # Launch local Phoenix server
            logger.info("Launching local Phoenix server at http://localhost:6006")
            _phoenix_session = px.launch_app()

            # Register with OpenTelemetry
            tracer_provider = register(
                project_name=project_name,
                auto_instrument=True,
            )

        # Instrument CrewAI
        try:
            CrewAIInstrumentor().instrument()
            logger.info("CrewAI instrumentation enabled")
        except Exception as e:
            logger.warning(f"CrewAI instrumentation skipped: {e}")

        # Instrument LiteLLM (for DeepSeek calls)
        try:
            LiteLLMInstrumentor().instrument()
            logger.info("LiteLLM instrumentation enabled")
        except Exception as e:
            logger.warning(f"LiteLLM instrumentation skipped: {e}")

        _tracer = tracer_provider
        logger.info(
            f"Phoenix observability initialized for project: {project_name}"
        )

        return tracer_provider

    except ImportError as e:
        logger.warning(
            f"Phoenix packages not installed, observability disabled: {e}"
        )
        return None
    except Exception as e:
        logger.error(f"Failed to initialize Phoenix observability: {e}")
        return None


def get_tracer():
    """
    Get the current tracer instance.

    Returns the OpenTelemetry tracer if Phoenix is initialized,
    otherwise returns a no-op context manager.
    """
    global _tracer
    return _tracer


def get_phoenix_url() -> Optional[str]:
    """Get the URL for the Phoenix UI."""
    global _phoenix_session

    if _phoenix_session is not None:
        return "http://localhost:6006"

    if os.getenv("PHOENIX_API_KEY"):
        return os.getenv(
            "PHOENIX_COLLECTOR_ENDPOINT",
            "https://app.phoenix.arize.com"
        )

    return None


@contextmanager
def trace_span(name: str, attributes: Optional[dict] = None):
    """
    Create a traced span for custom operations.

    Args:
        name: Name of the span
        attributes: Optional dict of span attributes

    Example:
        with trace_span("analyze_page", {"url": page_url}):
            result = analyze(page)
    """
    if _tracer is None:
        # No-op if Phoenix not initialized
        yield
        return

    try:
        from opentelemetry import trace
        tracer = trace.get_tracer(__name__)

        with tracer.start_as_current_span(name) as span:
            if attributes:
                for key, value in attributes.items():
                    span.set_attribute(key, str(value))
            yield span
    except Exception as e:
        logger.warning(f"Failed to create trace span: {e}")
        yield


def shutdown_observability():
    """Shutdown Phoenix and cleanup resources."""
    global _tracer, _phoenix_session

    try:
        if _phoenix_session is not None:
            # Phoenix auto-closes when process exits
            logger.info("Phoenix session will close on process exit")
            _phoenix_session = None

        if _tracer is not None:
            _tracer = None
            logger.info("Phoenix observability shutdown complete")

    except Exception as e:
        logger.error(f"Error during Phoenix shutdown: {e}")


# ============================================================================
# Integration Helpers
# ============================================================================

def log_scan_start(institution_id: str, website_url: str):
    """Log the start of a scan operation."""
    with trace_span("scan_start", {
        "institution_id": institution_id,
        "website_url": website_url,
    }):
        logger.info(
            f"Starting scan for institution {institution_id} at {website_url}"
        )


def log_page_analysis(url: str, page_type: str, confidence: float):
    """Log a page analysis result."""
    with trace_span("page_analysis", {
        "url": url,
        "page_type": page_type,
        "confidence": confidence,
    }):
        logger.info(f"Analyzed page {url}: type={page_type}, confidence={confidence}")


def log_extraction_result(
    entity_type: str,
    entity_name: str,
    source_url: str,
    confidence: float,
):
    """Log an entity extraction result."""
    with trace_span("entity_extracted", {
        "entity_type": entity_type,
        "entity_name": entity_name,
        "source_url": source_url,
        "confidence": confidence,
    }):
        logger.info(
            f"Extracted {entity_type}: {entity_name} from {source_url} "
            f"(confidence: {confidence:.2f})"
        )


def log_scan_complete(
    institution_id: str,
    campuses: int,
    faculties: int,
    courses: int,
    duration_ms: int,
):
    """Log scan completion."""
    with trace_span("scan_complete", {
        "institution_id": institution_id,
        "campuses": campuses,
        "faculties": faculties,
        "courses": courses,
        "duration_ms": duration_ms,
    }):
        logger.info(
            f"Scan complete for {institution_id}: "
            f"{campuses} campuses, {faculties} faculties, {courses} courses "
            f"in {duration_ms}ms"
        )


# Auto-initialize on import if PHOENIX_AUTO_START is set
if os.getenv("PHOENIX_AUTO_START", "").lower() == "true":
    setup_observability()
