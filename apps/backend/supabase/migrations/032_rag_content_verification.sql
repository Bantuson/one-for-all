-- Migration: 032_rag_content_verification
-- Description: Add content verification columns to rag_embeddings for security audit trail
-- Created: 2026-01-21
-- Security Feature: RAG Content Verification (H2)
--
-- This migration adds columns to support:
-- 1. Content integrity verification via SHA-256 hashing
-- 2. Source URL tracking and validation
-- 3. Approval workflow for RAG content
-- 4. Audit trail for who approved/rejected content

-- =============================================================================
-- ADD VERIFICATION COLUMNS TO RAG_EMBEDDINGS
-- =============================================================================

-- Content hash for integrity verification
ALTER TABLE public.rag_embeddings
    ADD COLUMN IF NOT EXISTS content_hash TEXT;

COMMENT ON COLUMN public.rag_embeddings.content_hash IS 'SHA-256 hash of chunk content for integrity verification';

-- Source URL tracking
ALTER TABLE public.rag_embeddings
    ADD COLUMN IF NOT EXISTS source_url TEXT;

COMMENT ON COLUMN public.rag_embeddings.source_url IS 'Original URL the content was scraped from';

-- Extracted domain for allowlist validation
ALTER TABLE public.rag_embeddings
    ADD COLUMN IF NOT EXISTS source_domain TEXT;

COMMENT ON COLUMN public.rag_embeddings.source_domain IS 'Extracted domain from source_url for SSRF allowlist validation';

-- Source verification timestamp
ALTER TABLE public.rag_embeddings
    ADD COLUMN IF NOT EXISTS source_verified_at TIMESTAMPTZ;

COMMENT ON COLUMN public.rag_embeddings.source_verified_at IS 'Timestamp when source URL was verified against SSRF allowlist';

-- Verification method used
ALTER TABLE public.rag_embeddings
    ADD COLUMN IF NOT EXISTS source_verification_method TEXT;

COMMENT ON COLUMN public.rag_embeddings.source_verification_method IS 'Method used for verification: ssrf_allowlist, manual_review, trusted_source';

-- Verification status workflow
ALTER TABLE public.rag_embeddings
    ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';

COMMENT ON COLUMN public.rag_embeddings.verification_status IS 'Content verification status: pending, source_verified, approved, rejected';

-- Approval tracking
ALTER TABLE public.rag_embeddings
    ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN public.rag_embeddings.approved_by IS 'User ID who approved this RAG content';

ALTER TABLE public.rag_embeddings
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

COMMENT ON COLUMN public.rag_embeddings.approved_at IS 'Timestamp when content was approved';

-- Rejection tracking
ALTER TABLE public.rag_embeddings
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

COMMENT ON COLUMN public.rag_embeddings.rejection_reason IS 'Reason for rejection (required when status is rejected)';

-- =============================================================================
-- CONSTRAINTS
-- =============================================================================

-- Ensure rejection_reason is provided when status is 'rejected'
-- Using a named constraint for easier migration management
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_rag_embeddings_rejection_reason_required'
    ) THEN
        ALTER TABLE public.rag_embeddings
        ADD CONSTRAINT ck_rag_embeddings_rejection_reason_required
        CHECK (
            verification_status != 'rejected'
            OR rejection_reason IS NOT NULL
        );
    END IF;
END $$;

-- Ensure verification_status is one of the allowed values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_rag_embeddings_verification_status_valid'
    ) THEN
        ALTER TABLE public.rag_embeddings
        ADD CONSTRAINT ck_rag_embeddings_verification_status_valid
        CHECK (
            verification_status IN ('pending', 'source_verified', 'approved', 'rejected')
        );
    END IF;
END $$;

-- Ensure approved_by is set when status is 'approved'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_rag_embeddings_approval_tracking'
    ) THEN
        ALTER TABLE public.rag_embeddings
        ADD CONSTRAINT ck_rag_embeddings_approval_tracking
        CHECK (
            verification_status != 'approved'
            OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)
        );
    END IF;
END $$;

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Index for filtering by verification status (common query pattern)
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_verification_status
    ON public.rag_embeddings (verification_status);

COMMENT ON INDEX idx_rag_embeddings_verification_status IS 'Filter RAG content by verification status for approval workflow';

-- Index for filtering by source domain (SSRF allowlist checks)
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_source_domain
    ON public.rag_embeddings (source_domain);

COMMENT ON INDEX idx_rag_embeddings_source_domain IS 'Filter RAG content by domain for bulk verification operations';

-- Composite index for pending content from specific domains
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_pending_by_domain
    ON public.rag_embeddings (source_domain, verification_status)
    WHERE verification_status = 'pending';

COMMENT ON INDEX idx_rag_embeddings_pending_by_domain IS 'Efficiently query pending content per domain for review queue';

-- Index for content hash lookups (integrity checks)
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_content_hash
    ON public.rag_embeddings (content_hash)
    WHERE content_hash IS NOT NULL;

COMMENT ON INDEX idx_rag_embeddings_content_hash IS 'Lookup embeddings by content hash for integrity verification';

-- =============================================================================
-- AUDIT TRIGGER (Optional - for comprehensive audit trail)
-- =============================================================================

-- Function to log verification status changes
CREATE OR REPLACE FUNCTION log_rag_verification_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only log when verification_status changes
    IF OLD.verification_status IS DISTINCT FROM NEW.verification_status THEN
        -- Log to application logs (can be extended to write to audit table)
        RAISE LOG 'RAG verification status change: id=%, old_status=%, new_status=%, user=%',
            NEW.id,
            OLD.verification_status,
            NEW.verification_status,
            COALESCE(NEW.approved_by::text, 'system');
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger for status change logging
DROP TRIGGER IF EXISTS trg_rag_verification_audit ON public.rag_embeddings;
CREATE TRIGGER trg_rag_verification_audit
    AFTER UPDATE ON public.rag_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION log_rag_verification_change();

-- =============================================================================
-- RLS POLICIES (if not already enabled)
-- =============================================================================

-- Ensure RLS is enabled
ALTER TABLE public.rag_embeddings ENABLE ROW LEVEL SECURITY;

-- Service role bypass for backend operations
DROP POLICY IF EXISTS "Service role full access on rag_embeddings" ON public.rag_embeddings;
CREATE POLICY "Service role full access on rag_embeddings"
    ON public.rag_embeddings
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Admins can view and modify verification status
DROP POLICY IF EXISTS "Admins can manage rag verification" ON public.rag_embeddings;
CREATE POLICY "Admins can manage rag verification"
    ON public.rag_embeddings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.institution_members im
            WHERE im.user_id = auth.uid()
            AND im.role IN ('admin', 'super_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.institution_members im
            WHERE im.user_id = auth.uid()
            AND im.role IN ('admin', 'super_admin')
        )
    );

-- Regular users can only read approved content
DROP POLICY IF EXISTS "Users can read approved rag content" ON public.rag_embeddings;
CREATE POLICY "Users can read approved rag content"
    ON public.rag_embeddings
    FOR SELECT
    USING (
        verification_status = 'approved'
        OR verification_status = 'source_verified'
    );
