"""
One For All - Specialized CrewAI Crews

This module contains specialized crew implementations for different workflows:
- ReviewerAssistantCrew: AI assistant for human reviewers
- AnalyticsCrew: Analytics and reporting agent
"""

from .reviewer_assistant_crew import ReviewerAssistantCrew
from .analytics_crew import AnalyticsCrew

__all__ = [
    "ReviewerAssistantCrew",
    "AnalyticsCrew",
]
