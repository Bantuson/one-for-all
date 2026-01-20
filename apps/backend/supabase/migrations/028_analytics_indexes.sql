-- ============================================================================
-- Migration: 028_analytics_indexes.sql
-- Purpose: Add indexes to optimize analytics query performance
--
-- This migration supports Phase 1 of the Analytics Agent optimization,
-- which introduces SQL templates for common queries. These indexes ensure
-- the template queries execute efficiently.
--
-- Target Performance: P95 query latency < 500ms
-- ============================================================================

-- =============================================================================
-- INDEX 1: Applications by Institution and Status
-- Supports: status distribution queries, pending review counts
-- Templates: applications_by_status, pending_review, conversion_funnel
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_app_choices_inst_status
    ON application_choices(institution_id, status);

COMMENT ON INDEX idx_app_choices_inst_status IS
    'Analytics: Optimizes status-based queries filtered by institution';

-- =============================================================================
-- INDEX 2: Applications by Institution, Faculty, and Created Date
-- Supports: faculty breakdown queries, time-series by faculty
-- Templates: applications_by_faculty, acceptance_rate_by_faculty
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_app_choices_inst_faculty_created
    ON application_choices(institution_id, faculty_id, created_at);

COMMENT ON INDEX idx_app_choices_inst_faculty_created IS
    'Analytics: Optimizes faculty-based queries with time filtering';

-- =============================================================================
-- INDEX 3: Applications by Institution and Created Date
-- Supports: time-series queries (monthly, weekly, daily trends)
-- Templates: monthly_trend, weekly_trend, daily_trend, yearly_comparison
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_app_choices_inst_created
    ON application_choices(institution_id, created_at DESC);

COMMENT ON INDEX idx_app_choices_inst_created IS
    'Analytics: Optimizes time-series queries filtered by institution';

-- =============================================================================
-- INDEX 4: Applications by Institution and Course
-- Supports: course breakdown, top courses queries
-- Templates: applications_by_course, top_courses
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_app_choices_inst_course
    ON application_choices(institution_id, course_id);

COMMENT ON INDEX idx_app_choices_inst_course IS
    'Analytics: Optimizes course-based queries filtered by institution';

-- =============================================================================
-- INDEX 5: Applications by Institution and Campus
-- Supports: campus breakdown queries
-- Templates: applications_by_campus
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_app_choices_inst_campus
    ON application_choices(institution_id, campus_id);

COMMENT ON INDEX idx_app_choices_inst_campus IS
    'Analytics: Optimizes campus-based queries filtered by institution';

-- =============================================================================
-- INDEX 6: Applications by Institution and Reviewed Date
-- Supports: review processing queries, turnaround time calculations
-- Templates: reviewed_today, avg_review_time
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_app_choices_inst_reviewed
    ON application_choices(institution_id, reviewed_at)
    WHERE reviewed_at IS NOT NULL;

COMMENT ON INDEX idx_app_choices_inst_reviewed IS
    'Analytics: Optimizes review-based queries (partial index for non-null reviewed_at)';

-- =============================================================================
-- INDEX 7: Applications by Institution and Priority
-- Supports: priority choice distribution queries
-- Templates: applications_by_priority
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_app_choices_inst_priority
    ON application_choices(institution_id, priority);

COMMENT ON INDEX idx_app_choices_inst_priority IS
    'Analytics: Optimizes priority-based queries filtered by institution';

-- =============================================================================
-- Verify index creation
-- =============================================================================
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE indexname LIKE 'idx_app_choices_inst_%';

    RAISE NOTICE 'Analytics indexes created: % indexes found', index_count;
END $$;
