"""
One For All - CrewAI Crews

This module contains specialized CrewAI crews for different workflows.
Each crew orchestrates a specific set of agents and tasks.
"""

from .aps_ranking_crew import APSRankingCrew

__all__ = ["APSRankingCrew"]
