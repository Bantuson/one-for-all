#!/usr/bin/env python3
"""
Phoenix Telemetry Test Module

Simple tests to verify Phoenix observability is properly configured.

Usage:
    python -m one_for_all.tests.test_phoenix
"""

import sys
import time
from pathlib import Path
from datetime import datetime


def check_dependencies() -> dict:
    """Check if all Phoenix dependencies are installed."""
    results = {}

    # Core Phoenix
    try:
        import phoenix
        results["phoenix"] = {"installed": True, "version": getattr(phoenix, "__version__", "unknown")}
    except ImportError:
        results["phoenix"] = {"installed": False}

    # Phoenix OTEL
    try:
        from phoenix.otel import register
        results["phoenix.otel"] = {"installed": True}
    except ImportError:
        results["phoenix.otel"] = {"installed": False}

    # CrewAI instrumentation
    try:
        from openinference.instrumentation.crewai import CrewAIInstrumentor
        results["openinference.crewai"] = {"installed": True}
    except ImportError:
        results["openinference.crewai"] = {"installed": False}

    # LiteLLM instrumentation
    try:
        from openinference.instrumentation.litellm import LiteLLMInstrumentor
        results["openinference.litellm"] = {"installed": True}
    except ImportError:
        results["openinference.litellm"] = {"installed": False}

    # OpenTelemetry
    try:
        from opentelemetry import trace
        results["opentelemetry"] = {"installed": True}
    except ImportError:
        results["opentelemetry"] = {"installed": False}

    return results


def test_phoenix_initialization() -> bool:
    """Test that Phoenix can be initialized and create spans."""
    print("\nTesting Phoenix initialization...")

    try:
        import phoenix as px
        from phoenix.otel import register
        from opentelemetry import trace

        # Start Phoenix
        print("  - Starting Phoenix server...")
        session = px.launch_app()

        # Register tracer
        print("  - Registering tracer provider...")
        tracer_provider = register(
            project_name="test-phoenix-init",
            auto_instrument=True,
        )

        # Create test span
        print("  - Creating test span...")
        tracer = trace.get_tracer(__name__)

        with tracer.start_as_current_span("test_initialization") as span:
            span.set_attribute("test.module", "test_phoenix")
            span.set_attribute("test.timestamp", datetime.now().isoformat())
            time.sleep(0.1)

        print("  [PASS] Phoenix initialization successful")
        print(f"  Phoenix UI: http://localhost:6006")
        return True

    except Exception as e:
        print(f"  [FAIL] Phoenix initialization failed: {e}")
        return False


def test_observability_module() -> bool:
    """Test the observability.py module."""
    print("\nTesting observability module...")

    try:
        from one_for_all.observability import (
            setup_observability,
            get_phoenix_url,
            get_tracer,
            trace_span,
            shutdown_observability,
        )

        # Test setup
        print("  - Calling setup_observability()...")
        tracer = setup_observability(project_name="test-observability-module")

        if tracer:
            print("  - Tracer initialized successfully")
        else:
            print("  - Tracer returned None (may already be initialized)")

        # Test get_phoenix_url
        url = get_phoenix_url()
        print(f"  - Phoenix URL: {url}")

        # Test trace_span context manager
        print("  - Testing trace_span()...")
        with trace_span("test_span", {"attr1": "value1"}):
            time.sleep(0.05)

        print("  [PASS] Observability module working")
        return True

    except Exception as e:
        print(f"  [FAIL] Observability module error: {e}")
        return False


def test_crewai_instrumentation() -> bool:
    """Test CrewAI instrumentation."""
    print("\nTesting CrewAI instrumentation...")

    try:
        from openinference.instrumentation.crewai import CrewAIInstrumentor

        # Check if already instrumented
        print("  - Checking CrewAI instrumentor...")
        instrumentor = CrewAIInstrumentor()

        # Instrument (may be no-op if already done)
        try:
            instrumentor.instrument()
            print("  - CrewAI instrumented successfully")
        except Exception as e:
            print(f"  - CrewAI instrumentation note: {e}")

        print("  [PASS] CrewAI instrumentation available")
        return True

    except ImportError as e:
        print(f"  [SKIP] CrewAI instrumentation not available: {e}")
        return False
    except Exception as e:
        print(f"  [FAIL] CrewAI instrumentation error: {e}")
        return False


def test_litellm_instrumentation() -> bool:
    """Test LiteLLM instrumentation."""
    print("\nTesting LiteLLM instrumentation...")

    try:
        from openinference.instrumentation.litellm import LiteLLMInstrumentor

        print("  - Checking LiteLLM instrumentor...")
        instrumentor = LiteLLMInstrumentor()

        try:
            instrumentor.instrument()
            print("  - LiteLLM instrumented successfully")
        except Exception as e:
            print(f"  - LiteLLM instrumentation note: {e}")

        print("  [PASS] LiteLLM instrumentation available")
        return True

    except ImportError as e:
        print(f"  [SKIP] LiteLLM instrumentation not available: {e}")
        return False
    except Exception as e:
        print(f"  [FAIL] LiteLLM instrumentation error: {e}")
        return False


def main():
    """Run all Phoenix tests."""
    print("=" * 60)
    print("Phoenix Telemetry Test Suite")
    print("=" * 60)

    # Check dependencies first
    print("\nChecking dependencies:")
    deps = check_dependencies()
    all_installed = True

    for name, info in deps.items():
        status = "OK" if info.get("installed") else "MISSING"
        version = info.get("version", "")
        print(f"  [{status}] {name} {version}")
        if not info.get("installed"):
            all_installed = False

    if not all_installed:
        print("\n[WARNING] Some dependencies are missing.")
        print("Install with: pip install arize-phoenix "
              "openinference-instrumentation-crewai "
              "openinference-instrumentation-litellm")

    # Run tests
    results = []

    results.append(("Phoenix Initialization", test_phoenix_initialization()))
    results.append(("Observability Module", test_observability_module()))
    results.append(("CrewAI Instrumentation", test_crewai_instrumentation()))
    results.append(("LiteLLM Instrumentation", test_litellm_instrumentation()))

    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)

    passed = 0
    for name, result in results:
        status = "PASS" if result else "FAIL"
        print(f"  [{status}] {name}")
        if result:
            passed += 1

    total = len(results)
    print(f"\nResults: {passed}/{total} tests passed")

    if passed == total:
        print("\nAll Phoenix tests passed!")
        print("Phoenix UI should be available at: http://localhost:6006")
        return 0
    else:
        print("\nSome tests failed. Check the output above for details.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
