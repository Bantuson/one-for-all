"""
Analytics Query Router

Routes natural language queries to pre-defined SQL templates using
keyword matching and regex pattern analysis. Provides confidence scoring
to determine when to use templates vs. falling back to LLM generation.

Performance Target: Route 90%+ of queries to templates with <500ms latency.
"""

import re
import logging
from dataclasses import dataclass
from typing import Optional

from .analytics_templates import (
    AnalyticsTemplate,
    ALL_TEMPLATES,
    TEMPLATES_BY_ID,
    ChartType,
)

logger = logging.getLogger(__name__)

# Minimum confidence threshold for template matching (0.0 - 1.0)
DEFAULT_CONFIDENCE_THRESHOLD = 0.4


@dataclass
class RoutingResult:
    """
    Result of query routing analysis.

    Attributes:
        matched: Whether a template was matched with sufficient confidence
        template: The matched template (if any)
        confidence: Confidence score (0.0 - 1.0)
        match_reasons: List of reasons why this template was matched
        fallback_to_llm: Whether to fall back to LLM generation
    """
    matched: bool
    template: Optional[AnalyticsTemplate]
    confidence: float
    match_reasons: list[str]
    fallback_to_llm: bool

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "matched": self.matched,
            "template_id": self.template.id if self.template else None,
            "template_name": self.template.name if self.template else None,
            "confidence": round(self.confidence, 3),
            "match_reasons": self.match_reasons,
            "fallback_to_llm": self.fallback_to_llm,
            "chart_type": self.template.chart_type.value if self.template else None,
        }


def _normalize_query(query: str) -> str:
    """
    Normalize a query for matching.

    - Convert to lowercase
    - Remove extra whitespace
    - Remove punctuation except hyphens
    """
    query = query.lower().strip()
    query = re.sub(r'[^\w\s-]', ' ', query)
    query = re.sub(r'\s+', ' ', query)
    return query


def _calculate_keyword_score(query: str, template: AnalyticsTemplate) -> tuple[float, list[str]]:
    """
    Calculate keyword match score for a template.

    Returns:
        Tuple of (score, matched_keywords)
    """
    normalized_query = _normalize_query(query)
    query_words = set(normalized_query.split())

    matched_keywords = []
    total_keyword_weight = 0
    matched_weight = 0

    for keyword in template.keywords:
        keyword_lower = keyword.lower()
        keyword_words = set(keyword_lower.split())

        # Weight multi-word keywords higher
        weight = len(keyword_words)
        total_keyword_weight += weight

        # Check for exact phrase match
        if keyword_lower in normalized_query:
            matched_keywords.append(f"phrase:{keyword}")
            matched_weight += weight * 1.5  # Bonus for exact phrase
        # Check for word overlap
        elif keyword_words & query_words:
            overlap = len(keyword_words & query_words) / len(keyword_words)
            if overlap >= 0.5:  # At least half the words match
                matched_keywords.append(f"words:{keyword}")
                matched_weight += weight * overlap

    if total_keyword_weight == 0:
        return 0.0, []

    score = matched_weight / total_keyword_weight
    return min(score, 1.0), matched_keywords


def _calculate_pattern_score(query: str, template: AnalyticsTemplate) -> tuple[float, list[str]]:
    """
    Calculate regex pattern match score for a template.

    Returns:
        Tuple of (score, matched_patterns)
    """
    if not template.patterns:
        return 0.0, []

    normalized_query = _normalize_query(query)
    matched_patterns = []

    for pattern in template.patterns:
        try:
            if re.search(pattern, normalized_query, re.IGNORECASE):
                matched_patterns.append(f"pattern:{pattern[:30]}")
        except re.error:
            logger.warning(f"Invalid regex pattern in template {template.id}: {pattern}")

    if not matched_patterns:
        return 0.0, []

    # Pattern matches are weighted higher than keywords
    score = len(matched_patterns) / len(template.patterns)
    return min(score * 1.2, 1.0), matched_patterns


def _calculate_confidence(
    keyword_score: float,
    pattern_score: float,
    matched_keywords: list[str],
    matched_patterns: list[str],
) -> float:
    """
    Calculate overall confidence score.

    Combines keyword and pattern scores with appropriate weighting.
    Pattern matches are given higher weight as they're more specific.
    """
    # Base confidence from keyword matches
    if keyword_score == 0 and pattern_score == 0:
        return 0.0

    # Weight pattern matches more heavily (they're more specific)
    if pattern_score > 0:
        confidence = (keyword_score * 0.4) + (pattern_score * 0.6)
    else:
        confidence = keyword_score

    # Boost confidence if we have both keyword and pattern matches
    if matched_keywords and matched_patterns:
        confidence = min(confidence * 1.2, 1.0)

    # Boost for multiple keyword matches
    if len(matched_keywords) >= 3:
        confidence = min(confidence * 1.1, 1.0)

    return confidence


def route_query(
    query: str,
    confidence_threshold: float = DEFAULT_CONFIDENCE_THRESHOLD,
) -> RoutingResult:
    """
    Route a natural language query to the best matching template.

    Args:
        query: Natural language analytics question
        confidence_threshold: Minimum confidence to accept a match (default 0.4)

    Returns:
        RoutingResult with the best matching template or fallback indication

    Example:
        result = route_query("Show acceptance rate by faculty")
        if result.matched:
            print(f"Using template: {result.template.id}")
        else:
            print("Falling back to LLM")
    """
    if not query or not query.strip():
        return RoutingResult(
            matched=False,
            template=None,
            confidence=0.0,
            match_reasons=["Empty query"],
            fallback_to_llm=True,
        )

    best_match: Optional[AnalyticsTemplate] = None
    best_confidence = 0.0
    best_reasons: list[str] = []

    for template in ALL_TEMPLATES:
        # Calculate scores
        keyword_score, matched_keywords = _calculate_keyword_score(query, template)
        pattern_score, matched_patterns = _calculate_pattern_score(query, template)

        # Calculate overall confidence
        confidence = _calculate_confidence(
            keyword_score,
            pattern_score,
            matched_keywords,
            matched_patterns,
        )

        # Track best match
        if confidence > best_confidence:
            best_confidence = confidence
            best_match = template
            best_reasons = matched_keywords + matched_patterns

    # Determine if we have a sufficient match
    if best_confidence >= confidence_threshold and best_match is not None:
        logger.info(
            f"Query routed to template '{best_match.id}' with confidence {best_confidence:.3f}"
        )
        return RoutingResult(
            matched=True,
            template=best_match,
            confidence=best_confidence,
            match_reasons=best_reasons,
            fallback_to_llm=False,
        )

    # Fall back to LLM
    logger.info(
        f"Query falling back to LLM (best confidence: {best_confidence:.3f}, "
        f"threshold: {confidence_threshold})"
    )
    return RoutingResult(
        matched=False,
        template=best_match,  # Still include best match for logging
        confidence=best_confidence,
        match_reasons=best_reasons,
        fallback_to_llm=True,
    )


def get_suggested_templates(query: str, limit: int = 3) -> list[tuple[AnalyticsTemplate, float]]:
    """
    Get a list of suggested templates for a query, sorted by confidence.

    Useful for showing users alternative interpretations of their query.

    Args:
        query: Natural language analytics question
        limit: Maximum number of suggestions to return

    Returns:
        List of (template, confidence) tuples, sorted by confidence descending
    """
    if not query or not query.strip():
        return []

    results = []

    for template in ALL_TEMPLATES:
        keyword_score, matched_keywords = _calculate_keyword_score(query, template)
        pattern_score, matched_patterns = _calculate_pattern_score(query, template)
        confidence = _calculate_confidence(
            keyword_score,
            pattern_score,
            matched_keywords,
            matched_patterns,
        )

        if confidence > 0.1:  # Only include templates with some relevance
            results.append((template, confidence))

    # Sort by confidence and limit
    results.sort(key=lambda x: x[1], reverse=True)
    return results[:limit]


def execute_template(
    template_id: str,
    institution_id: str,
) -> dict:
    """
    Execute a template by ID.

    Args:
        template_id: The template identifier
        institution_id: UUID of the institution

    Returns:
        Dictionary with:
        - success: bool
        - sql: The generated SQL (if successful)
        - template_name: The template name
        - chart_type: Recommended chart type
        - error: Error message (if failed)
    """
    template = TEMPLATES_BY_ID.get(template_id)

    if template is None:
        return {
            "success": False,
            "error": f"Template '{template_id}' not found",
        }

    # Validate institution_id is UUID-like (basic check)
    uuid_pattern = re.compile(
        r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
        re.IGNORECASE
    )
    if not uuid_pattern.match(institution_id):
        return {
            "success": False,
            "error": "Invalid institution_id format (expected UUID)",
        }

    # Generate SQL with institution_id
    sql = template.sql.format(institution_id=institution_id).strip()

    return {
        "success": True,
        "sql": sql,
        "template_id": template.id,
        "template_name": template.name,
        "description": template.description,
        "chart_type": template.chart_type.value,
        "category": template.category,
    }


def list_available_templates() -> list[dict]:
    """
    List all available templates with their metadata.

    Returns:
        List of template metadata dictionaries
    """
    return [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "category": t.category,
            "chart_type": t.chart_type.value,
            "keywords": t.keywords[:5],  # First 5 keywords for preview
        }
        for t in ALL_TEMPLATES
    ]


# =============================================================================
# ROUTING METRICS (for monitoring template hit/miss rates)
# =============================================================================

class RoutingMetrics:
    """
    Track routing metrics for monitoring template effectiveness.

    Thread-safe for concurrent access in async contexts.
    """

    def __init__(self):
        self._template_hits = 0
        self._template_misses = 0
        self._template_hit_counts: dict[str, int] = {}

    def record_hit(self, template_id: str) -> None:
        """Record a successful template match."""
        self._template_hits += 1
        self._template_hit_counts[template_id] = (
            self._template_hit_counts.get(template_id, 0) + 1
        )

    def record_miss(self) -> None:
        """Record a fallback to LLM."""
        self._template_misses += 1

    def get_hit_rate(self) -> float:
        """Get the template hit rate (0.0 - 1.0)."""
        total = self._template_hits + self._template_misses
        if total == 0:
            return 0.0
        return self._template_hits / total

    def get_stats(self) -> dict:
        """Get comprehensive routing statistics."""
        total = self._template_hits + self._template_misses
        return {
            "total_queries": total,
            "template_hits": self._template_hits,
            "template_misses": self._template_misses,
            "hit_rate": round(self.get_hit_rate() * 100, 2),
            "template_usage": dict(
                sorted(
                    self._template_hit_counts.items(),
                    key=lambda x: x[1],
                    reverse=True,
                )
            ),
        }

    def reset(self) -> None:
        """Reset all metrics."""
        self._template_hits = 0
        self._template_misses = 0
        self._template_hit_counts.clear()


# Global metrics instance
routing_metrics = RoutingMetrics()
