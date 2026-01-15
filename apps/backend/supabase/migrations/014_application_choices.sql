-- Migration: 014_application_choices
-- Description: Create normalized application_choices table for multi-course applications
-- Created: 2026-01-13

-- ============================================================================
-- APPLICATION_CHOICES TABLE
-- ============================================================================
-- Stores course choices per application with priority and individual status tracking
CREATE TABLE IF NOT EXISTS public.application_choices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Application relationship
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,

    -- Priority (1st choice, 2nd choice, etc.)
    priority INTEGER NOT NULL CHECK (priority IN (1, 2)),

    -- Course and institution references
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    faculty_id UUID REFERENCES public.faculties(id) ON DELETE SET NULL,
    campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,

    -- Choice-specific status (independent of application status)
    status TEXT DEFAULT 'pending'
        CHECK (status IN (
            'pending',
            'under_review',
            'conditionally_accepted',
            'accepted',
            'rejected',
            'waitlisted',
            'withdrawn'
        )),
    status_reason TEXT,

    -- Reviewer tracking
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE(application_id, priority),
    UNIQUE(application_id, course_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Primary lookup patterns
CREATE INDEX IF NOT EXISTS idx_application_choices_application_id
    ON public.application_choices(application_id);

CREATE INDEX IF NOT EXISTS idx_application_choices_course_id
    ON public.application_choices(course_id);

CREATE INDEX IF NOT EXISTS idx_application_choices_institution_id
    ON public.application_choices(institution_id);

CREATE INDEX IF NOT EXISTS idx_application_choices_status
    ON public.application_choices(status);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_application_choices_institution_status
    ON public.application_choices(institution_id, status);

CREATE INDEX IF NOT EXISTS idx_application_choices_course_status
    ON public.application_choices(course_id, status);

-- Reviewer lookup
CREATE INDEX IF NOT EXISTS idx_application_choices_reviewed_by
    ON public.application_choices(reviewed_by)
    WHERE reviewed_by IS NOT NULL;

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
DROP TRIGGER IF EXISTS update_application_choices_updated_at ON public.application_choices;
CREATE TRIGGER update_application_choices_updated_at
    BEFORE UPDATE ON public.application_choices
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.application_choices ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- VIEW POLICY: Institution members can view their applications
-- ----------------------------------------------------------------------------
CREATE POLICY "Institution members can view application choices"
    ON public.application_choices
    FOR SELECT
    USING (
        institution_id IN (
            SELECT im.institution_id
            FROM public.institution_members im
            WHERE im.user_id = public.get_current_user_id()
        )
    );

-- ----------------------------------------------------------------------------
-- INSERT POLICY: Service role and applicants can insert
-- ----------------------------------------------------------------------------
CREATE POLICY "Service role can insert application choices"
    ON public.application_choices
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- ----------------------------------------------------------------------------
-- UPDATE POLICY: Institution admins/reviewers can update
-- ----------------------------------------------------------------------------
CREATE POLICY "Institution staff can update application choices"
    ON public.application_choices
    FOR UPDATE
    USING (
        institution_id IN (
            SELECT im.institution_id
            FROM public.institution_members im
            WHERE im.user_id = public.get_current_user_id()
            AND im.role IN ('admin', 'reviewer')
        )
    );

-- ----------------------------------------------------------------------------
-- DELETE POLICY: Only service role can delete
-- ----------------------------------------------------------------------------
CREATE POLICY "Service role can delete application choices"
    ON public.application_choices
    FOR DELETE
    USING (auth.role() = 'service_role');

-- ----------------------------------------------------------------------------
-- SERVICE ROLE POLICY: Full access for backend operations
-- ----------------------------------------------------------------------------
CREATE POLICY "Service role full access to application_choices"
    ON public.application_choices
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- HELPER FUNCTION: Get application choices summary
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_application_choices_summary(p_application_id UUID)
RETURNS TABLE (
    choice_id UUID,
    priority INTEGER,
    course_name TEXT,
    course_code TEXT,
    institution_name TEXT,
    faculty_name TEXT,
    campus_name TEXT,
    status TEXT,
    status_reason TEXT,
    reviewed_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ac.id AS choice_id,
        ac.priority,
        c.name AS course_name,
        c.code AS course_code,
        i.name AS institution_name,
        f.name AS faculty_name,
        cam.name AS campus_name,
        ac.status,
        ac.status_reason,
        ac.reviewed_at
    FROM public.application_choices ac
    JOIN public.courses c ON c.id = ac.course_id
    JOIN public.institutions i ON i.id = ac.institution_id
    LEFT JOIN public.faculties f ON f.id = ac.faculty_id
    LEFT JOIN public.campuses cam ON cam.id = ac.campus_id
    WHERE ac.application_id = p_application_id
    ORDER BY ac.priority;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT SELECT, INSERT, UPDATE ON public.application_choices TO authenticated;
GRANT ALL ON public.application_choices TO service_role;
GRANT EXECUTE ON FUNCTION public.get_application_choices_summary TO authenticated, service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.application_choices IS 'Normalized course choices per application with individual status tracking';
COMMENT ON COLUMN public.application_choices.priority IS 'Choice priority: 1 = first choice, 2 = second choice';
COMMENT ON COLUMN public.application_choices.status IS 'Individual choice status, independent of overall application status';
COMMENT ON COLUMN public.application_choices.status_reason IS 'Optional reason for status (e.g., rejection reason, conditional requirements)';
COMMENT ON COLUMN public.application_choices.reviewed_by IS 'User who last reviewed this choice';
COMMENT ON COLUMN public.application_choices.reviewed_at IS 'Timestamp when choice was last reviewed';
COMMENT ON FUNCTION public.get_application_choices_summary IS 'Get detailed choice information with course and institution names';
