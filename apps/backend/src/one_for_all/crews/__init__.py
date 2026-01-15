"""
One For All - Specialized CrewAI Crews

This module contains specialized crew implementations for different workflows:
- DocumentReviewerCrew: AI-powered document verification using GPT-4V
- (Future) APSRankingCrew: Applicant ranking based on APS scores
- (Future) ReviewerAssistantCrew: AI assistant for human reviewers
"""

from .document_reviewer_crew import DocumentReviewerCrew

__all__ = [
    "DocumentReviewerCrew",
]
