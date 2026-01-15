-- Migration: 015_migrate_application_choices
-- Description: Migrate existing applications with course_id to application_choices table
-- Created: 2026-01-13

-- ============================================================================
-- DATA MIGRATION: Existing applications to application_choices
-- ============================================================================
-- Migrate any existing applications that have a course_id set
-- These become the first (priority 1) choice for that application

DO $$
DECLARE
    app_record RECORD;
    course_record RECORD;
    migrated_count INTEGER := 0;
    skipped_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting migration of existing applications to application_choices...';

    -- Loop through all applications that have a course_id set
    FOR app_record IN
        SELECT
            a.id AS application_id,
            a.course_id,
            a.institution_id AS app_institution_id,
            a.status AS app_status
        FROM public.applications a
        WHERE a.course_id IS NOT NULL
    LOOP
        -- Get course details including institution, faculty, campus
        SELECT
            c.id AS course_id,
            c.institution_id,
            c.faculty_id,
            COALESCE(c.campus_id, NULL) AS campus_id
        INTO course_record
        FROM public.courses c
        WHERE c.id = app_record.course_id;

        -- Skip if course not found (orphan reference)
        IF course_record IS NULL THEN
            RAISE WARNING 'Course % not found for application %, skipping',
                app_record.course_id, app_record.application_id;
            skipped_count := skipped_count + 1;
            CONTINUE;
        END IF;

        -- Check if choice already exists (idempotent migration)
        IF EXISTS (
            SELECT 1 FROM public.application_choices
            WHERE application_id = app_record.application_id
            AND course_id = app_record.course_id
        ) THEN
            RAISE NOTICE 'Choice already exists for application %, skipping',
                app_record.application_id;
            skipped_count := skipped_count + 1;
            CONTINUE;
        END IF;

        -- Insert the application choice as priority 1
        INSERT INTO public.application_choices (
            application_id,
            priority,
            course_id,
            institution_id,
            faculty_id,
            campus_id,
            status,
            created_at
        )
        VALUES (
            app_record.application_id,
            1,  -- First choice (primary)
            course_record.course_id,
            course_record.institution_id,
            course_record.faculty_id,
            course_record.campus_id,
            -- Map application status to choice status
            CASE app_record.app_status
                WHEN 'submitted' THEN 'pending'
                WHEN 'pending' THEN 'pending'
                WHEN 'under_review' THEN 'under_review'
                WHEN 'accepted' THEN 'accepted'
                WHEN 'rejected' THEN 'rejected'
                WHEN 'waitlisted' THEN 'waitlisted'
                WHEN 'withdrawn' THEN 'withdrawn'
                ELSE 'pending'
            END,
            NOW()
        );

        migrated_count := migrated_count + 1;
    END LOOP;

    RAISE NOTICE 'Migration complete: % applications migrated, % skipped',
        migrated_count, skipped_count;
END $$;

-- ============================================================================
-- VERIFICATION QUERY (for manual checking)
-- ============================================================================
-- Run this to verify migration results:
/*
SELECT
    'Applications with course_id' AS metric,
    COUNT(*) AS count
FROM public.applications
WHERE course_id IS NOT NULL

UNION ALL

SELECT
    'Application choices created' AS metric,
    COUNT(*) AS count
FROM public.application_choices

UNION ALL

SELECT
    'Applications without choices' AS metric,
    COUNT(*) AS count
FROM public.applications a
WHERE a.course_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.application_choices ac
    WHERE ac.application_id = a.id
);
*/

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON SCHEMA public IS 'Migration 015: Migrated existing applications with course_id to application_choices table as priority 1 choices';
