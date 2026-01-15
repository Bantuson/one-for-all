"""
One For All - Specialized CrewAI Crews

This module contains specialized crew implementations for different workflows:
- DocumentReviewerCrew: AI-powered document verification using GPT-4V
- APSRankingCrew: Applicant ranking based on APS scores
- ReviewerAssistantCrew: AI assistant for human reviewers
- AnalyticsCrew: Analytics and reporting agent
"""

from .document_reviewer_crew import DocumentReviewerCrew
from .aps_ranking_crew import APSRankingCrew

__all__ = [
    "DocumentReviewerCrew",
    "APSRankingCrew",
]
