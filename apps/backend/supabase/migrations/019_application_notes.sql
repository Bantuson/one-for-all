-- Migration: 019_application_notes
-- Description: Application notes table for staff annotations and flags
-- Created: 2026-01-14

-- ============================================================================
-- APPLICATION NOTES TABLE
-- ============================================================================
-- Stores staff notes/annotations on applications for review tracking

CREATE TABLE IF NOT EXISTS public.application_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,

    -- Note content
    title TEXT NOT NULL,
    body TEXT NOT NULL,

    -- Categorization
    note_type TEXT DEFAULT 'general' CHECK (note_type IN ('general', 'flag', 'review', 'followup')),
    color TEXT DEFAULT 'gray' CHECK (color IN ('gray', 'green', 'yellow', 'red', 'blue', 'purple')),

    -- Audit trail
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_appnotes_application ON public.application_notes(application_id);
CREATE INDEX IF NOT EXISTS idx_appnotes_institution ON public.application_notes(institution_id);
CREATE INDEX IF NOT EXISTS idx_appnotes_created_by ON public.application_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_appnotes_note_type ON public.application_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_appnotes_created_at ON public.application_notes(created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
-- Updated_at trigger
DROP TRIGGER IF EXISTS update_application_notes_updated_at ON public.application_notes;
CREATE TRIGGER update_application_notes_updated_at
    BEFORE UPDATE ON public.application_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.application_notes ENABLE ROW LEVEL SECURITY;

-- Institution members can view notes for applications in their institution
CREATE POLICY "View notes for own institution applications"
    ON public.application_notes
    FOR SELECT
    USING (
        institution_id IN (
            SELECT institution_id
            FROM public.institution_members
            WHERE user_id = public.get_current_user_id()
        )
    );

-- Staff can create notes for applications in their institution
CREATE POLICY "Create notes for own institution"
    ON public.application_notes
    FOR INSERT
    WITH CHECK (
        institution_id IN (
            SELECT institution_id
            FROM public.institution_members
            WHERE user_id = public.get_current_user_id()
            AND role IN ('admin', 'reviewer')
        )
        AND created_by = public.get_current_user_id()
    );

-- Staff can update their own notes
CREATE POLICY "Update own notes"
    ON public.application_notes
    FOR UPDATE
    USING (created_by = public.get_current_user_id());

-- Admins can delete notes in their institution
CREATE POLICY "Admins can delete notes"
    ON public.application_notes
    FOR DELETE
    USING (
        institution_id IN (
            SELECT institution_id
            FROM public.institution_members
            WHERE user_id = public.get_current_user_id()
            AND role = 'admin'
        )
    );

-- Service role has full access
CREATE POLICY "Service role full access to notes"
    ON public.application_notes
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.application_notes IS
    'Staff notes and annotations on applications for review tracking and collaboration';

COMMENT ON COLUMN public.application_notes.note_type IS
    'general: regular note, flag: issue requiring attention, review: review comment, followup: action required';

COMMENT ON COLUMN public.application_notes.color IS
    'Visual indicator for note priority/type: gray (default), green (positive), yellow (warning), red (critical), blue (info), purple (special)';
