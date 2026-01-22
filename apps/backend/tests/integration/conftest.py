"""Integration test fixtures for CrewAI workflow testing."""
import pytest
from typing import Any


@pytest.fixture
def tool_call_tracker():
    """Track tool calls during test execution."""
    class ToolCallTracker:
        def __init__(self):
            self.calls: list[dict[str, Any]] = []

        def record(self, tool_name: str, args: dict, result: str):
            """Record a tool call with its arguments and result."""
            self.calls.append({"tool": tool_name, "args": args, "result": result})

        def get_sequence(self) -> list[str]:
            """Get the sequence of tool names called."""
            return [c["tool"] for c in self.calls]

        def called(self, tool_name: str) -> bool:
            """Check if a specific tool was called."""
            return tool_name in self.get_sequence()

        def called_before(self, first: str, second: str) -> bool:
            """Check if first tool was called before second tool."""
            seq = self.get_sequence()
            if first not in seq or second not in seq:
                return False
            return seq.index(first) < seq.index(second)

        def call_count(self, tool_name: str) -> int:
            """Count how many times a tool was called."""
            return self.get_sequence().count(tool_name)

        def get_call_args(self, tool_name: str, call_index: int = 0) -> dict | None:
            """Get arguments for a specific tool call."""
            matching_calls = [c for c in self.calls if c["tool"] == tool_name]
            if call_index < len(matching_calls):
                return matching_calls[call_index]["args"]
            return None

    return ToolCallTracker()


# Note: undergraduate_profile, postgraduate_profile_honours, and other profile
# fixtures are defined in the root tests/conftest.py and inherited here.
# Do not duplicate them to avoid fixture conflicts.
