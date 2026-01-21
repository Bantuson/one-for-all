"""
Ranking Flag Tools for Reviewer Assistant Agent
Applies ranking recommendations and retrieves ranking summaries from materialized view
"""
import asyncio
import json
from typing import Optional
from crewai.tools import tool
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from root (multiple paths for different environments)
_env_paths = [
    Path(__file__).resolve().parents[5] / '.env.local',  # Monorepo root (local)
    Path(__file__).resolve().parents[4] / '.env.local',  # Alternative structure
    Path.cwd() / '.env.local',  # Current working directory
]

for _env_path in _env_paths:
    if _env_path.exists():
        load_dotenv(dotenv_path=_env_path)
        break

from .supabase_client import get_supabase_client
from ..utils.db_audit import audit_service_role_access


@audit_service_role_access(table="ranking_flags", operation="select")
@tool
def apply_ranking_flags(course_id: str, intake_limit: int = None, thresholds: dict = None) -> str:
    """
    Apply ranking recommendations for a course based on APS scores.
    Uses the materialized view for rankings and creates agent_decisions.

    Args:
        course_id: UUID of the course
        intake_limit: Override intake limit (uses course default if not provided)
        thresholds: Optional dict with auto_accept, conditional, waitlist percentages

    Returns:
        JSON string with ranking results and recommendations
    """
    async def async_apply():
        supabase = get_supabase_client()
        if not supabase:
            return json.dumps({"error": "Supabase client not configured"})

        # First refresh the materialized view
        try:
            await supabase.rpc('refresh_application_rankings').execute()
        except Exception as e:
            # View may not exist, continue anyway
            pass

        # Get course info for thresholds
        course_result = await supabase.table("courses")\
            .select("id, name, intake_limit, auto_accept_threshold, conditional_threshold, waitlist_threshold")\
            .eq("id", course_id)\
            .single()\
            .execute()

        if not course_result.data:
            return json.dumps({"error": "Course not found"})

        course = course_result.data

        # Determine effective thresholds
        effective_limit = intake_limit or course.get('intake_limit')
        if not effective_limit:
            return json.dumps({"error": "No intake limit specified for course"})

        effective_thresholds = thresholds or {
            'auto_accept': course.get('auto_accept_threshold', 0.80),
            'conditional': course.get('conditional_threshold', 1.00),
            'waitlist': course.get('waitlist_threshold', 1.50)
        }

        # Fetch rankings for course
        rankings_result = await supabase.table("application_rankings")\
            .select("*")\
            .eq("course_id", course_id)\
            .order("rank_position")\
            .execute()

        if not rankings_result.data:
            return json.dumps({
                "error": "No applications found for course",
                "course_id": course_id
            })

        rankings = rankings_result.data

        # Apply recommendations
        results = {
            'course_id': course_id,
            'course_name': course.get('name'),
            'intake_limit': effective_limit,
            'thresholds': effective_thresholds,
            'total_applications': len(rankings),
            'recommendations': {
                'auto_accept': [],
                'conditional': [],
                'waitlist': [],
                'rejection_flagged': [],
                'manual_review': []
            }
        }

        auto_accept_cutoff = int(effective_limit * effective_thresholds['auto_accept'])
        conditional_cutoff = int(effective_limit * effective_thresholds['conditional'])
        waitlist_cutoff = int(effective_limit * effective_thresholds['waitlist'])

        for ranking in rankings:
            position = ranking['rank_position']
            recommendation = None

            if position <= auto_accept_cutoff:
                recommendation = 'auto_accept'
            elif position <= conditional_cutoff:
                recommendation = 'conditional'
            elif position <= waitlist_cutoff:
                recommendation = 'waitlist'
            else:
                recommendation = 'rejection_flagged'

            # Create agent decision record
            decision_data = {
                'session_id': None,  # Standalone tool call
                'decision_type': 'ranking_assigned',
                'target_type': 'application',
                'target_id': ranking['application_id'],
                'decision_value': {
                    'choice_id': ranking.get('choice_id'),
                    'course_id': course_id,
                    'rank_position': position,
                    'aps_score': float(ranking['aps_score']) if ranking.get('aps_score') else 0,
                    'recommendation': recommendation,
                    'intake_limit': effective_limit
                },
                'confidence_score': 0.95 if recommendation in ['auto_accept', 'rejection_flagged'] else 0.80,
                'reasoning': f"Ranked #{position} of {len(rankings)} with APS {ranking.get('aps_score', 'N/A')}"
            }

            try:
                await supabase.table("agent_decisions")\
                    .insert(decision_data)\
                    .execute()
            except Exception as e:
                # Table may not exist, continue anyway
                pass

            results['recommendations'][recommendation].append({
                'application_id': ranking['application_id'],
                'choice_id': ranking.get('choice_id'),
                'rank_position': position,
                'aps_score': float(ranking['aps_score']) if ranking.get('aps_score') else 0
            })

        # Add summary counts
        for key in results['recommendations']:
            results[f'{key}_count'] = len(results['recommendations'][key])

        return json.dumps(results, default=str)

    return asyncio.run(async_apply())


@audit_service_role_access(table="ranking_flags", operation="select")
@tool
def get_ranking_summary(course_id: str) -> str:
    """
    Get ranking summary statistics for a course.

    Args:
        course_id: UUID of the course

    Returns:
        JSON string with ranking statistics
    """
    async def async_summary():
        supabase = get_supabase_client()
        if not supabase:
            return json.dumps({"error": "Supabase client not configured"})

        # Refresh view first
        try:
            await supabase.rpc('refresh_application_rankings').execute()
        except Exception as e:
            # View may not exist, continue anyway
            pass

        # Fetch rankings for course
        rankings_result = await supabase.table("application_rankings")\
            .select("*")\
            .eq("course_id", course_id)\
            .order("rank_position")\
            .execute()

        if not rankings_result.data:
            return json.dumps({"error": "No applications found for course"})

        rankings = rankings_result.data

        # Calculate statistics
        aps_scores = [float(r['aps_score']) for r in rankings if r.get('aps_score')]

        summary = {
            'course_id': course_id,
            'course_name': rankings[0].get('course_name') if rankings else None,
            'total_applications': len(rankings),
            'aps_statistics': {
                'highest': max(aps_scores) if aps_scores else 0,
                'lowest': min(aps_scores) if aps_scores else 0,
                'average': sum(aps_scores) / len(aps_scores) if aps_scores else 0,
                'median': sorted(aps_scores)[len(aps_scores)//2] if aps_scores else 0
            },
            'recommendation_distribution': {},
            'top_10': [
                {
                    'rank': r['rank_position'],
                    'aps_score': float(r['aps_score']) if r.get('aps_score') else 0,
                    'application_id': r['application_id']
                }
                for r in rankings[:10]
            ]
        }

        # Count recommendations
        for ranking in rankings:
            rec = ranking.get('recommendation', 'unknown')
            summary['recommendation_distribution'][rec] = summary['recommendation_distribution'].get(rec, 0) + 1

        return json.dumps(summary, default=str)

    return asyncio.run(async_summary())
