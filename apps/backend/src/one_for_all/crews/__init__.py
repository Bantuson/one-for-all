"""
One For All - Specialized Crews

This module contains specialized CrewAI crews for specific workflows.
Each crew is a self-contained unit with its own agents and tasks.
"""

from .analytics_crew import AnalyticsCrew

__all__ = [
    "AnalyticsCrew",
]
