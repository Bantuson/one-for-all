-- Migration: Add scan_jobs table for AI Website Scanner
-- This table tracks the state and results of website scanning jobs

-- ============================================================================
-- SCAN JOBS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS scan_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key to institution
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,

    -- Scan configuration
    website_url TEXT NOT NULL,

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'connecting', 'scraping', 'analyzing', 'preview', 'saving', 'complete', 'error', 'cancelled')),

    -- Progress tracking (JSONB for flexibility)
    progress JSONB DEFAULT '{
        "stage": "Initializing",
        "percent": 0,
        "message": "Preparing scanner...",
        "pagesDiscovered": 0,
        "pagesScraped": 0,
        "itemsExtracted": 0,
        "currentUrl": null,
        "elapsedMs": 0
    }'::jsonb,

    -- Results storage
    raw_results JSONB,      -- Original extracted data before user edits
    edited_results JSONB,    -- User-edited data ready for approval

    -- Error tracking
    error_message TEXT,
    error_code TEXT,

    -- Configuration used for the scan
    config JSONB DEFAULT '{
        "maxPages": 100,
        "maxDepth": 4,
        "requestDelayMs": 1000,
        "renderJs": false
    }'::jsonb,

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),

    -- Indexes for common queries
    CONSTRAINT valid_url CHECK (website_url ~ '^https?://')
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_scan_jobs_institution_id ON scan_jobs(institution_id);
CREATE INDEX IF NOT EXISTS idx_scan_jobs_status ON scan_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scan_jobs_created_at ON scan_jobs(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE scan_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their institution's scan jobs
CREATE POLICY "Users can view their institution scan jobs"
    ON scan_jobs FOR SELECT
    USING (
        institution_id IN (
            SELECT institution_id FROM institution_members
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Admins can create scan jobs for their institutions
CREATE POLICY "Admins can create scan jobs"
    ON scan_jobs FOR INSERT
    WITH CHECK (
        institution_id IN (
            SELECT institution_id FROM institution_members
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

-- Policy: Admins can update their institution's scan jobs
CREATE POLICY "Admins can update scan jobs"
    ON scan_jobs FOR UPDATE
    USING (
        institution_id IN (
            SELECT institution_id FROM institution_members
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

-- Policy: Admins can delete their institution's scan jobs
CREATE POLICY "Admins can delete scan jobs"
    ON scan_jobs FOR DELETE
    USING (
        institution_id IN (
            SELECT institution_id FROM institution_members
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get latest scan job for an institution
CREATE OR REPLACE FUNCTION get_latest_scan_job(p_institution_id UUID)
RETURNS TABLE (
    id UUID,
    status TEXT,
    progress JSONB,
    created_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sj.id,
        sj.status,
        sj.progress,
        sj.created_at,
        sj.completed_at
    FROM scan_jobs sj
    WHERE sj.institution_id = p_institution_id
    ORDER BY sj.created_at DESC
    LIMIT 1;
END;
$$;

-- Function to update scan job progress
CREATE OR REPLACE FUNCTION update_scan_progress(
    p_job_id UUID,
    p_status TEXT DEFAULT NULL,
    p_stage TEXT DEFAULT NULL,
    p_percent INTEGER DEFAULT NULL,
    p_message TEXT DEFAULT NULL,
    p_pages_scraped INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE scan_jobs
    SET
        status = COALESCE(p_status, status),
        progress = jsonb_set(
            jsonb_set(
                jsonb_set(
                    jsonb_set(
                        progress,
                        '{stage}',
                        COALESCE(to_jsonb(p_stage), progress->'stage')
                    ),
                    '{percent}',
                    COALESCE(to_jsonb(p_percent), progress->'percent')
                ),
                '{message}',
                COALESCE(to_jsonb(p_message), progress->'message')
            ),
            '{pagesScraped}',
            COALESCE(to_jsonb(p_pages_scraped), progress->'pagesScraped')
        ),
        started_at = CASE
            WHEN p_status = 'scraping' AND started_at IS NULL
            THEN NOW()
            ELSE started_at
        END,
        completed_at = CASE
            WHEN p_status IN ('complete', 'error', 'cancelled')
            THEN NOW()
            ELSE completed_at
        END
    WHERE id = p_job_id;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE scan_jobs IS 'Stores AI website scanner job state, progress, and results';
COMMENT ON COLUMN scan_jobs.raw_results IS 'Original extracted data from scanner before user edits';
COMMENT ON COLUMN scan_jobs.edited_results IS 'User-modified data ready for approval and database insertion';
COMMENT ON COLUMN scan_jobs.progress IS 'Real-time progress tracking with stage, percent, message, and counts';
