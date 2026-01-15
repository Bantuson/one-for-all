-- Migration: 013_course_dates
-- Description: Add opening/closing dates to courses with computed status
-- Created: 2026-01-13

-- ============================================================================
-- ADD DATE COLUMNS TO COURSES TABLE
-- ============================================================================

-- Opening date - when applications start being accepted
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS opening_date DATE;

-- Closing date - last day to submit applications
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS closing_date DATE;

-- Computed status based on dates (auto-updated by trigger)
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS computed_status TEXT
CHECK (computed_status IN ('coming_soon', 'open', 'closed'));

-- ============================================================================
-- DATE VALIDATION CONSTRAINT
-- ============================================================================
-- Ensure closing_date is not before opening_date
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'courses_dates_valid'
    ) THEN
        ALTER TABLE public.courses
        ADD CONSTRAINT courses_dates_valid
        CHECK (closing_date IS NULL OR opening_date IS NULL OR closing_date >= opening_date);
    END IF;
END $$;

-- ============================================================================
-- COMPUTE COURSE STATUS FUNCTION
-- ============================================================================
-- Returns 'coming_soon', 'open', or 'closed' based on current date
CREATE OR REPLACE FUNCTION public.compute_course_status(
    p_opening_date DATE,
    p_closing_date DATE
)
RETURNS TEXT AS $$
BEGIN
    -- If both dates are NULL, return NULL (no dates set)
    IF p_opening_date IS NULL AND p_closing_date IS NULL THEN
        RETURN NULL;
    END IF;

    -- If only closing date is NULL, use opening date only
    IF p_closing_date IS NULL THEN
        IF CURRENT_DATE < p_opening_date THEN
            RETURN 'coming_soon';
        ELSE
            RETURN 'open';
        END IF;
    END IF;

    -- If only opening date is NULL, use closing date only
    IF p_opening_date IS NULL THEN
        -- Applications close at end of closing_date (23:59:59)
        IF CURRENT_DATE > p_closing_date THEN
            RETURN 'closed';
        ELSE
            RETURN 'open';
        END IF;
    END IF;

    -- Both dates are set
    IF CURRENT_DATE < p_opening_date THEN
        RETURN 'coming_soon';
    ELSIF CURRENT_DATE > p_closing_date THEN
        -- Closed after end of day on closing_date
        RETURN 'closed';
    ELSE
        RETURN 'open';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- AUTO-UPDATE COMPUTED STATUS TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_course_computed_status()
RETURNS TRIGGER AS $$
BEGIN
    NEW.computed_status := public.compute_course_status(NEW.opening_date, NEW.closing_date);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_course_status_on_date_change ON public.courses;
CREATE TRIGGER update_course_status_on_date_change
    BEFORE INSERT OR UPDATE OF opening_date, closing_date ON public.courses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_course_computed_status();

-- ============================================================================
-- BATCH UPDATE COMPUTED STATUS FUNCTION
-- ============================================================================
-- Call this periodically (e.g., daily cron) to update all course statuses
CREATE OR REPLACE FUNCTION public.refresh_all_course_statuses()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.courses
    SET computed_status = public.compute_course_status(opening_date, closing_date)
    WHERE computed_status IS DISTINCT FROM public.compute_course_status(opening_date, closing_date);

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_courses_opening_date ON public.courses(opening_date);
CREATE INDEX IF NOT EXISTS idx_courses_closing_date ON public.courses(closing_date);
CREATE INDEX IF NOT EXISTS idx_courses_computed_status ON public.courses(computed_status);

-- Composite index for filtering open courses by institution
CREATE INDEX IF NOT EXISTS idx_courses_institution_status
    ON public.courses(institution_id, computed_status);

-- ============================================================================
-- UPDATE EXISTING COURSES
-- ============================================================================
-- Set computed_status for any existing courses with dates
UPDATE public.courses
SET computed_status = public.compute_course_status(opening_date, closing_date)
WHERE opening_date IS NOT NULL OR closing_date IS NOT NULL;

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.compute_course_status TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refresh_all_course_statuses TO service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON COLUMN public.courses.opening_date IS 'Date when applications start being accepted for this course';
COMMENT ON COLUMN public.courses.closing_date IS 'Last day to submit applications (inclusive, closes at end of day)';
COMMENT ON COLUMN public.courses.computed_status IS 'Automatically computed: coming_soon, open, or closed based on current date';
COMMENT ON FUNCTION public.compute_course_status IS 'Computes course application status based on opening/closing dates';
COMMENT ON FUNCTION public.refresh_all_course_statuses IS 'Batch update all course computed_status values (run daily via cron)';
