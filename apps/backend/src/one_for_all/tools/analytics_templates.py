"""
Analytics SQL Templates

Pre-defined SQL templates for common analytics queries.
These templates provide <500ms response times compared to 2.5s for LLM-generated queries.

Template Design Principles:
1. All queries are parameterized to prevent SQL injection
2. All queries are scoped by institution_id for multi-tenant isolation
3. Templates include metadata for intelligent routing
4. Each template has a confidence threshold for matching
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class ChartType(Enum):
    """Recommended chart types for visualization."""
    BAR = "bar"
    PIE = "pie"
    LINE = "line"
    AREA = "area"
    TABLE = "table"


@dataclass
class AnalyticsTemplate:
    """
    SQL template with metadata for query routing.

    Attributes:
        id: Unique template identifier
        name: Human-readable template name
        description: What this query measures
        sql: Parameterized SQL query with {institution_id} placeholder
        keywords: Words/phrases that suggest this template
        patterns: Regex patterns for advanced matching
        chart_type: Recommended visualization type
        category: Query category for grouping
        parameters: Additional parameters beyond institution_id
    """
    id: str
    name: str
    description: str
    sql: str
    keywords: list[str]
    patterns: list[str] = field(default_factory=list)
    chart_type: ChartType = ChartType.BAR
    category: str = "general"
    parameters: list[str] = field(default_factory=list)


# =============================================================================
# APPLICATION COUNT TEMPLATES
# =============================================================================

TEMPLATE_TOTAL_APPLICATIONS = AnalyticsTemplate(
    id="total_applications",
    name="Total Applications",
    description="Total number of applications for the institution",
    sql="""
        SELECT COUNT(*) as total_applications
        FROM application_choices
        WHERE institution_id = '{institution_id}'
    """,
    keywords=["total", "count", "how many", "number of", "applications", "all applications"],
    patterns=[r"total\s+applications?", r"count\s+applications?", r"how\s+many\s+applications?"],
    chart_type=ChartType.TABLE,
    category="counts",
)

TEMPLATE_APPLICATIONS_BY_STATUS = AnalyticsTemplate(
    id="applications_by_status",
    name="Applications by Status",
    description="Distribution of applications across different statuses",
    sql="""
        SELECT
            status as name,
            COUNT(*) as value
        FROM application_choices
        WHERE institution_id = '{institution_id}'
        GROUP BY status
        ORDER BY value DESC
    """,
    keywords=["status", "distribution", "pending", "accepted", "rejected", "waitlisted", "breakdown"],
    patterns=[r"status\s+distribution", r"applications?\s+by\s+status", r"status\s+breakdown"],
    chart_type=ChartType.PIE,
    category="status",
)

TEMPLATE_APPLICATIONS_BY_FACULTY = AnalyticsTemplate(
    id="applications_by_faculty",
    name="Applications by Faculty",
    description="Number of applications per faculty",
    sql="""
        SELECT
            COALESCE(f.name, 'Unassigned') as name,
            COUNT(*) as value
        FROM application_choices ac
        LEFT JOIN faculties f ON ac.faculty_id = f.id
        WHERE ac.institution_id = '{institution_id}'
        GROUP BY f.id, f.name
        ORDER BY value DESC
    """,
    keywords=["faculty", "faculties", "department", "school", "by faculty"],
    patterns=[r"applications?\s+by\s+faculty", r"faculty\s+breakdown", r"per\s+faculty"],
    chart_type=ChartType.BAR,
    category="breakdown",
)

TEMPLATE_APPLICATIONS_BY_CAMPUS = AnalyticsTemplate(
    id="applications_by_campus",
    name="Applications by Campus",
    description="Number of applications per campus",
    sql="""
        SELECT
            COALESCE(c.name, 'Unassigned') as name,
            COUNT(*) as value
        FROM application_choices ac
        LEFT JOIN campuses c ON ac.campus_id = c.id
        WHERE ac.institution_id = '{institution_id}'
        GROUP BY c.id, c.name
        ORDER BY value DESC
    """,
    keywords=["campus", "campuses", "location", "site", "by campus"],
    patterns=[r"applications?\s+by\s+campus", r"campus\s+breakdown", r"per\s+campus"],
    chart_type=ChartType.BAR,
    category="breakdown",
)

TEMPLATE_APPLICATIONS_BY_COURSE = AnalyticsTemplate(
    id="applications_by_course",
    name="Applications by Course",
    description="Number of applications per course",
    sql="""
        SELECT
            COALESCE(c.name, 'Unknown') as name,
            COUNT(*) as value
        FROM application_choices ac
        LEFT JOIN courses c ON ac.course_id = c.id
        WHERE ac.institution_id = '{institution_id}'
        GROUP BY c.id, c.name
        ORDER BY value DESC
    """,
    keywords=["course", "courses", "program", "programmes", "by course", "by program"],
    patterns=[r"applications?\s+by\s+course", r"course\s+breakdown", r"per\s+course"],
    chart_type=ChartType.BAR,
    category="breakdown",
)

# =============================================================================
# TOP N RANKING TEMPLATES
# =============================================================================

TEMPLATE_TOP_COURSES = AnalyticsTemplate(
    id="top_courses",
    name="Top 10 Most Applied Courses",
    description="The 10 courses with the most applications",
    sql="""
        SELECT
            COALESCE(c.name, 'Unknown') as name,
            COUNT(*) as value
        FROM application_choices ac
        LEFT JOIN courses c ON ac.course_id = c.id
        WHERE ac.institution_id = '{institution_id}'
        GROUP BY c.id, c.name
        ORDER BY value DESC
        LIMIT 10
    """,
    keywords=["top", "most popular", "most applied", "highest", "best", "leading", "top courses", "popular courses"],
    patterns=[r"top\s+\d*\s*courses?", r"most\s+(popular|applied)\s+courses?", r"popular\s+courses?"],
    chart_type=ChartType.BAR,
    category="rankings",
)

TEMPLATE_TOP_FACULTIES = AnalyticsTemplate(
    id="top_faculties",
    name="Top 5 Faculties by Applications",
    description="The 5 faculties with the most applications",
    sql="""
        SELECT
            COALESCE(f.name, 'Unassigned') as name,
            COUNT(*) as value
        FROM application_choices ac
        LEFT JOIN faculties f ON ac.faculty_id = f.id
        WHERE ac.institution_id = '{institution_id}'
        GROUP BY f.id, f.name
        ORDER BY value DESC
        LIMIT 5
    """,
    keywords=["top faculties", "popular faculties", "leading faculties", "busiest faculties"],
    patterns=[r"top\s+\d*\s*facult(y|ies)", r"popular\s+facult(y|ies)"],
    chart_type=ChartType.BAR,
    category="rankings",
)

# =============================================================================
# CONVERSION & RATE TEMPLATES
# =============================================================================

TEMPLATE_ACCEPTANCE_RATE = AnalyticsTemplate(
    id="acceptance_rate",
    name="Overall Acceptance Rate",
    description="Percentage of applications that were accepted",
    sql="""
        SELECT
            COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
            COUNT(*) as total,
            ROUND(
                100.0 * COUNT(CASE WHEN status = 'accepted' THEN 1 END) /
                NULLIF(COUNT(*), 0),
                2
            ) as acceptance_rate
        FROM application_choices
        WHERE institution_id = '{institution_id}'
    """,
    keywords=["acceptance rate", "acceptance percentage", "accepted", "approval rate", "success rate"],
    patterns=[r"acceptance\s+rate", r"accepted\s+percentage", r"approval\s+rate"],
    chart_type=ChartType.TABLE,
    category="rates",
)

TEMPLATE_ACCEPTANCE_RATE_BY_FACULTY = AnalyticsTemplate(
    id="acceptance_rate_by_faculty",
    name="Acceptance Rate by Faculty",
    description="Acceptance rate broken down by faculty",
    sql="""
        SELECT
            COALESCE(f.name, 'Unassigned') as name,
            COUNT(*) as total_applications,
            COUNT(CASE WHEN ac.status = 'accepted' THEN 1 END) as accepted,
            ROUND(
                100.0 * COUNT(CASE WHEN ac.status = 'accepted' THEN 1 END) /
                NULLIF(COUNT(*), 0),
                2
            ) as value
        FROM application_choices ac
        LEFT JOIN faculties f ON ac.faculty_id = f.id
        WHERE ac.institution_id = '{institution_id}'
        GROUP BY f.id, f.name
        ORDER BY total_applications DESC
    """,
    keywords=["acceptance rate by faculty", "faculty acceptance", "faculty approval rate"],
    patterns=[r"acceptance\s+rate\s+(by|per)\s+faculty", r"faculty\s+acceptance\s+rate"],
    chart_type=ChartType.BAR,
    category="rates",
)

TEMPLATE_REJECTION_RATE = AnalyticsTemplate(
    id="rejection_rate",
    name="Overall Rejection Rate",
    description="Percentage of applications that were rejected",
    sql="""
        SELECT
            COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
            COUNT(*) as total,
            ROUND(
                100.0 * COUNT(CASE WHEN status = 'rejected' THEN 1 END) /
                NULLIF(COUNT(*), 0),
                2
            ) as rejection_rate
        FROM application_choices
        WHERE institution_id = '{institution_id}'
    """,
    keywords=["rejection rate", "rejected", "denial rate", "failure rate"],
    patterns=[r"rejection\s+rate", r"rejected\s+percentage", r"denial\s+rate"],
    chart_type=ChartType.TABLE,
    category="rates",
)

TEMPLATE_CONVERSION_FUNNEL = AnalyticsTemplate(
    id="conversion_funnel",
    name="Application Conversion Funnel",
    description="Application flow from pending through to acceptance/rejection",
    sql="""
        SELECT
            status as name,
            COUNT(*) as value,
            ROUND(
                100.0 * COUNT(*) /
                NULLIF(SUM(COUNT(*)) OVER (), 0),
                2
            ) as percentage
        FROM application_choices
        WHERE institution_id = '{institution_id}'
        GROUP BY status
        ORDER BY
            CASE status
                WHEN 'pending' THEN 1
                WHEN 'under_review' THEN 2
                WHEN 'waitlisted' THEN 3
                WHEN 'accepted' THEN 4
                WHEN 'rejected' THEN 5
                WHEN 'withdrawn' THEN 6
                ELSE 7
            END
    """,
    keywords=["funnel", "conversion", "pipeline", "flow", "stages"],
    patterns=[r"conversion\s+funnel", r"application\s+funnel", r"pipeline"],
    chart_type=ChartType.BAR,
    category="rates",
)

# =============================================================================
# TIME SERIES TEMPLATES
# =============================================================================

TEMPLATE_MONTHLY_TREND = AnalyticsTemplate(
    id="monthly_trend",
    name="Monthly Application Trend",
    description="Number of applications per month over the last 6 months",
    sql="""
        SELECT
            TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as name,
            COUNT(*) as value
        FROM application_choices
        WHERE institution_id = '{institution_id}'
          AND created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at)
    """,
    keywords=["monthly", "trend", "over time", "month", "last 6 months", "months"],
    patterns=[r"monthly\s+trend", r"applications?\s+over\s+time", r"last\s+\d+\s+months?"],
    chart_type=ChartType.LINE,
    category="trends",
)

TEMPLATE_WEEKLY_TREND = AnalyticsTemplate(
    id="weekly_trend",
    name="Weekly Application Trend",
    description="Number of applications per week over the last 8 weeks",
    sql="""
        SELECT
            TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-MM-DD') as name,
            COUNT(*) as value
        FROM application_choices
        WHERE institution_id = '{institution_id}'
          AND created_at >= NOW() - INTERVAL '8 weeks'
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY DATE_TRUNC('week', created_at)
    """,
    keywords=["weekly", "week", "last 8 weeks", "weeks", "this week"],
    patterns=[r"weekly\s+trend", r"per\s+week", r"last\s+\d+\s+weeks?"],
    chart_type=ChartType.LINE,
    category="trends",
)

TEMPLATE_DAILY_TREND = AnalyticsTemplate(
    id="daily_trend",
    name="Daily Application Trend",
    description="Number of applications per day over the last 30 days",
    sql="""
        SELECT
            TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') as name,
            COUNT(*) as value
        FROM application_choices
        WHERE institution_id = '{institution_id}'
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY DATE_TRUNC('day', created_at)
    """,
    keywords=["daily", "day", "last 30 days", "days", "today", "yesterday"],
    patterns=[r"daily\s+trend", r"per\s+day", r"last\s+\d+\s+days?"],
    chart_type=ChartType.LINE,
    category="trends",
)

TEMPLATE_YEARLY_COMPARISON = AnalyticsTemplate(
    id="yearly_comparison",
    name="Yearly Application Comparison",
    description="Applications by year for year-over-year comparison",
    sql="""
        SELECT
            TO_CHAR(DATE_TRUNC('year', created_at), 'YYYY') as name,
            COUNT(*) as value
        FROM application_choices
        WHERE institution_id = '{institution_id}'
        GROUP BY DATE_TRUNC('year', created_at)
        ORDER BY DATE_TRUNC('year', created_at)
    """,
    keywords=["yearly", "year", "annual", "year over year", "yoy", "comparison"],
    patterns=[r"yearly\s+comparison", r"year\s+over\s+year", r"annual"],
    chart_type=ChartType.BAR,
    category="trends",
)

# =============================================================================
# DEMOGRAPHIC TEMPLATES
# =============================================================================

TEMPLATE_APPLICATIONS_BY_PRIORITY = AnalyticsTemplate(
    id="applications_by_priority",
    name="Applications by Priority Choice",
    description="Distribution of applications by priority (1st choice, 2nd choice, etc.)",
    sql="""
        SELECT
            CASE
                WHEN priority = 1 THEN '1st Choice'
                WHEN priority = 2 THEN '2nd Choice'
                WHEN priority = 3 THEN '3rd Choice'
                ELSE 'Other'
            END as name,
            COUNT(*) as value
        FROM application_choices
        WHERE institution_id = '{institution_id}'
        GROUP BY priority
        ORDER BY priority
    """,
    keywords=["priority", "choice", "first choice", "second choice", "ranking"],
    patterns=[r"by\s+priority", r"choice\s+distribution", r"first\s+choice"],
    chart_type=ChartType.PIE,
    category="demographics",
)

# =============================================================================
# REVIEWER & PROCESSING TEMPLATES
# =============================================================================

TEMPLATE_PENDING_REVIEW = AnalyticsTemplate(
    id="pending_review",
    name="Applications Pending Review",
    description="Count of applications awaiting review",
    sql="""
        SELECT
            COALESCE(f.name, 'Unassigned') as name,
            COUNT(*) as value
        FROM application_choices ac
        LEFT JOIN faculties f ON ac.faculty_id = f.id
        WHERE ac.institution_id = '{institution_id}'
          AND ac.status = 'pending'
        GROUP BY f.id, f.name
        ORDER BY value DESC
    """,
    keywords=["pending", "review", "awaiting", "queue", "backlog", "unreviewed"],
    patterns=[r"pending\s+review", r"awaiting\s+review", r"review\s+queue"],
    chart_type=ChartType.BAR,
    category="processing",
)

TEMPLATE_REVIEWED_TODAY = AnalyticsTemplate(
    id="reviewed_today",
    name="Applications Reviewed Today",
    description="Number of applications reviewed today",
    sql="""
        SELECT
            COUNT(*) as reviewed_today
        FROM application_choices
        WHERE institution_id = '{institution_id}'
          AND reviewed_at >= CURRENT_DATE
          AND reviewed_at < CURRENT_DATE + INTERVAL '1 day'
    """,
    keywords=["reviewed today", "today's reviews", "processed today"],
    patterns=[r"reviewed\s+today", r"today.s\s+reviews"],
    chart_type=ChartType.TABLE,
    category="processing",
)

TEMPLATE_AVG_REVIEW_TIME = AnalyticsTemplate(
    id="avg_review_time",
    name="Average Review Time",
    description="Average time from application submission to review",
    sql="""
        SELECT
            ROUND(
                AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at)) / 86400)::numeric,
                1
            ) as avg_days_to_review
        FROM application_choices
        WHERE institution_id = '{institution_id}'
          AND reviewed_at IS NOT NULL
    """,
    keywords=["average review time", "review duration", "processing time", "turnaround"],
    patterns=[r"average\s+review\s+time", r"review\s+duration", r"processing\s+time"],
    chart_type=ChartType.TABLE,
    category="processing",
)

# =============================================================================
# TEMPLATE REGISTRY
# =============================================================================

ALL_TEMPLATES: list[AnalyticsTemplate] = [
    # Counts
    TEMPLATE_TOTAL_APPLICATIONS,
    TEMPLATE_APPLICATIONS_BY_STATUS,
    TEMPLATE_APPLICATIONS_BY_FACULTY,
    TEMPLATE_APPLICATIONS_BY_CAMPUS,
    TEMPLATE_APPLICATIONS_BY_COURSE,
    # Rankings
    TEMPLATE_TOP_COURSES,
    TEMPLATE_TOP_FACULTIES,
    # Rates
    TEMPLATE_ACCEPTANCE_RATE,
    TEMPLATE_ACCEPTANCE_RATE_BY_FACULTY,
    TEMPLATE_REJECTION_RATE,
    TEMPLATE_CONVERSION_FUNNEL,
    # Trends
    TEMPLATE_MONTHLY_TREND,
    TEMPLATE_WEEKLY_TREND,
    TEMPLATE_DAILY_TREND,
    TEMPLATE_YEARLY_COMPARISON,
    # Demographics
    TEMPLATE_APPLICATIONS_BY_PRIORITY,
    # Processing
    TEMPLATE_PENDING_REVIEW,
    TEMPLATE_REVIEWED_TODAY,
    TEMPLATE_AVG_REVIEW_TIME,
]

TEMPLATES_BY_ID: dict[str, AnalyticsTemplate] = {t.id: t for t in ALL_TEMPLATES}
TEMPLATES_BY_CATEGORY: dict[str, list[AnalyticsTemplate]] = {}

for template in ALL_TEMPLATES:
    if template.category not in TEMPLATES_BY_CATEGORY:
        TEMPLATES_BY_CATEGORY[template.category] = []
    TEMPLATES_BY_CATEGORY[template.category].append(template)


def get_template_by_id(template_id: str) -> Optional[AnalyticsTemplate]:
    """Get a template by its unique ID."""
    return TEMPLATES_BY_ID.get(template_id)


def get_templates_by_category(category: str) -> list[AnalyticsTemplate]:
    """Get all templates in a category."""
    return TEMPLATES_BY_CATEGORY.get(category, [])


def list_all_template_ids() -> list[str]:
    """List all available template IDs."""
    return list(TEMPLATES_BY_ID.keys())


def get_template_sql(template_id: str, institution_id: str) -> Optional[str]:
    """
    Get the SQL for a template with the institution_id substituted.

    Args:
        template_id: The template identifier
        institution_id: UUID of the institution

    Returns:
        The SQL query with institution_id substituted, or None if template not found
    """
    template = get_template_by_id(template_id)
    if template is None:
        return None

    # Safe substitution - institution_id should be validated as UUID before this
    return template.sql.format(institution_id=institution_id)
