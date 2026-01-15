-- Migration: 020_document_flagging
-- Description: Add document review/flagging columns to application_documents
-- Created: 2026-01-14

-- ============================================================================
-- ADD DOCUMENT REVIEW COLUMNS
-- ============================================================================

-- Review status tracking
ALTER TABLE public.application_documents
    ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'pending'
        CHECK (review_status IN ('pending', 'approved', 'flagged', 'rejected'));

-- Flagging information
ALTER TABLE public.application_documents
    ADD COLUMN IF NOT EXISTS flag_reason TEXT;

ALTER TABLE public.application_documents
    ADD COLUMN IF NOT EXISTS flagged_by UUID;

ALTER TABLE public.application_documents
    ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ;

-- Review completion tracking
ALTER TABLE public.application_documents
    ADD COLUMN IF NOT EXISTS reviewed_by UUID;

ALTER TABLE public.application_documents
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index on review_status for filtering pending/flagged documents
CREATE INDEX IF NOT EXISTS idx_appdocs_review_status ON public.application_documents(review_status);

-- Index on flagged documents
CREATE INDEX IF NOT EXISTS idx_appdocs_flagged ON public.application_documents(application_id, review_status)
    WHERE review_status IN ('flagged', 'rejected');

-- Index on reviewer for audit purposes
CREATE INDEX IF NOT EXISTS idx_appdocs_reviewed_by ON public.application_documents(reviewed_by)
    WHERE reviewed_by IS NOT NULL;

-- ============================================================================
-- CONSTRAINTS & VALIDATIONS
-- ============================================================================

-- Ensure flag_reason is provided when status is flagged or rejected
ALTER TABLE public.application_documents
    ADD CONSTRAINT check_flag_reason
    CHECK (
        (review_status IN ('flagged', 'rejected') AND flag_reason IS NOT NULL)
        OR review_status NOT IN ('flagged', 'rejected')
    );

-- Ensure flagged_by and flagged_at are set when flagged/rejected
ALTER TABLE public.application_documents
    ADD CONSTRAINT check_flagged_metadata
    CHECK (
        (review_status IN ('flagged', 'rejected') AND flagged_by IS NOT NULL AND flagged_at IS NOT NULL)
        OR review_status NOT IN ('flagged', 'rejected')
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-set flagged_at timestamp when document is flagged/rejected
CREATE OR REPLACE FUNCTION public.set_document_flag_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    -- If transitioning to flagged/rejected, set flagged_at
    IF NEW.review_status IN ('flagged', 'rejected')
       AND (OLD.review_status IS NULL OR OLD.review_status NOT IN ('flagged', 'rejected'))
    THEN
        NEW.flagged_at := NOW();
    END IF;

    -- If transitioning to approved/pending, clear flagged metadata
    IF NEW.review_status IN ('approved', 'pending')
       AND OLD.review_status IN ('flagged', 'rejected')
    THEN
        NEW.flag_reason := NULL;
        NEW.flagged_by := NULL;
        NEW.flagged_at := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_set_document_flag_timestamp ON public.application_documents;
CREATE TRIGGER auto_set_document_flag_timestamp
    BEFORE UPDATE ON public.application_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.set_document_flag_timestamp();

-- Auto-set reviewed_at timestamp when review status changes
CREATE OR REPLACE FUNCTION public.set_document_reviewed_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    -- If review_status changed (except from NULL to pending), update reviewed_at
    IF (OLD.review_status IS NOT NULL AND OLD.review_status != 'pending')
       AND NEW.review_status IS DISTINCT FROM OLD.review_status
    THEN
        NEW.reviewed_at := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_set_document_reviewed_timestamp ON public.application_documents;
CREATE TRIGGER auto_set_document_reviewed_timestamp
    BEFORE UPDATE ON public.application_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.set_document_reviewed_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.application_documents.review_status IS
    'Document review status: pending (not reviewed), approved (accepted), flagged (needs attention), rejected (invalid)';

COMMENT ON COLUMN public.application_documents.flag_reason IS
    'Human-readable reason why document was flagged or rejected (required for flagged/rejected status)';

COMMENT ON COLUMN public.application_documents.flagged_by IS
    'User ID of reviewer who flagged/rejected the document';

COMMENT ON COLUMN public.application_documents.flagged_at IS
    'Timestamp when document was flagged/rejected';

COMMENT ON COLUMN public.application_documents.reviewed_by IS
    'User ID of last reviewer who changed the review status';

COMMENT ON COLUMN public.application_documents.reviewed_at IS
    'Timestamp of last review status change';
