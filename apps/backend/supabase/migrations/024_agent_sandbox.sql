-- Migration: 024_agent_sandbox
-- Description: Agent sandbox infrastructure for AI-powered admissions processing
-- Created: 2026-01-15

-- ============================================================================
-- AGENT SESSIONS TABLE
-- ============================================================================
-- Tracks agent execution sessions for document review, APS ranking, etc.

CREATE TABLE IF NOT EXISTS public.agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,

    -- Agent configuration
    agent_type TEXT NOT NULL CHECK (agent_type IN (
        'document_reviewer',
        'aps_ranking',
        'reviewer_assistant',
        'analytics',
        'notification_sender'
    )),

    -- Session state
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Waiting to start
        'running',      -- Currently executing
        'completed',    -- Finished successfully
        'failed',       -- Execution failed
        'cancelled'     -- User cancelled
    )),

    -- Execution context
    input_context JSONB DEFAULT '{}',           -- Agent input parameters
    output_result JSONB DEFAULT '{}',           -- Agent output/results
    error_message TEXT,                         -- Error details if failed

    -- Scope (what the agent is operating on)
    target_type TEXT CHECK (target_type IN ('application', 'course', 'batch', 'institution')),
    target_ids UUID[] DEFAULT '{}',             -- Array of target entity IDs

    -- Progress tracking
    total_items INTEGER DEFAULT 0,              -- Total items to process
    processed_items INTEGER DEFAULT 0,          -- Items processed so far

    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Audit trail
    initiated_by UUID NOT NULL,                 -- User who triggered the agent
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AGENT DECISIONS TABLE
-- ============================================================================
-- Audit trail for decisions made by agents (for transparency and review)

CREATE TABLE IF NOT EXISTS public.agent_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.agent_sessions(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,

    -- What was decided
    decision_type TEXT NOT NULL CHECK (decision_type IN (
        'document_approved',
        'document_flagged',
        'document_rejected',
        'aps_score_calculated',
        'ranking_assigned',
        'status_recommendation',
        'notification_sent'
    )),

    -- Target entity
    target_type TEXT NOT NULL CHECK (target_type IN ('document', 'application', 'applicant')),
    target_id UUID NOT NULL,

    -- Decision details
    decision_value JSONB NOT NULL,              -- Structured decision data
    confidence_score DECIMAL(3, 2),             -- Agent confidence (0.00-1.00)
    reasoning TEXT,                             -- Agent's explanation

    -- Review status
    reviewed_by UUID,                           -- Staff member who reviewed
    reviewed_at TIMESTAMPTZ,
    review_outcome TEXT CHECK (review_outcome IN ('accepted', 'overridden', 'pending')),
    override_reason TEXT,                       -- If overridden, why

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SAVED CHARTS TABLE
-- ============================================================================
-- Archived analytics visualizations from the analytics agent

CREATE TABLE IF NOT EXISTS public.saved_charts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,

    -- Chart metadata
    title TEXT NOT NULL,
    description TEXT,
    chart_type TEXT NOT NULL CHECK (chart_type IN (
        'bar',
        'line',
        'pie',
        'donut',
        'area',
        'scatter',
        'heatmap',
        'funnel',
        'table'
    )),

    -- Chart configuration
    chart_config JSONB NOT NULL,                -- Recharts/D3 config
    data_query TEXT,                            -- SQL query that generated data
    filters JSONB DEFAULT '{}',                 -- Applied filters

    -- Display settings
    is_pinned BOOLEAN DEFAULT FALSE,            -- Pinned to dashboard
    display_order INTEGER DEFAULT 0,

    -- Source tracking
    generated_by_session UUID REFERENCES public.agent_sessions(id) ON DELETE SET NULL,

    -- Audit trail
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- agent_sessions indexes
CREATE INDEX IF NOT EXISTS idx_agent_sessions_institution ON public.agent_sessions(institution_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent_type ON public.agent_sessions(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON public.agent_sessions(status);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_initiated_by ON public.agent_sessions(initiated_by);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_created_at ON public.agent_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_target_type ON public.agent_sessions(target_type);

-- agent_decisions indexes
CREATE INDEX IF NOT EXISTS idx_agent_decisions_session ON public.agent_decisions(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_institution ON public.agent_decisions(institution_id);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_decision_type ON public.agent_decisions(decision_type);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_target ON public.agent_decisions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_review_outcome ON public.agent_decisions(review_outcome) WHERE review_outcome IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_decisions_created_at ON public.agent_decisions(created_at DESC);

-- saved_charts indexes
CREATE INDEX IF NOT EXISTS idx_saved_charts_institution ON public.saved_charts(institution_id);
CREATE INDEX IF NOT EXISTS idx_saved_charts_chart_type ON public.saved_charts(chart_type);
CREATE INDEX IF NOT EXISTS idx_saved_charts_created_by ON public.saved_charts(created_by);
CREATE INDEX IF NOT EXISTS idx_saved_charts_pinned ON public.saved_charts(is_pinned) WHERE is_pinned = TRUE;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at triggers
DROP TRIGGER IF EXISTS update_agent_sessions_updated_at ON public.agent_sessions;
CREATE TRIGGER update_agent_sessions_updated_at
    BEFORE UPDATE ON public.agent_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_saved_charts_updated_at ON public.saved_charts;
CREATE TRIGGER update_saved_charts_updated_at
    BEFORE UPDATE ON public.saved_charts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_charts ENABLE ROW LEVEL SECURITY;

-- Agent Sessions policies
CREATE POLICY "View agent sessions for own institution"
    ON public.agent_sessions
    FOR SELECT
    USING (
        institution_id IN (
            SELECT institution_id
            FROM public.institution_members
            WHERE user_id = public.get_current_user_id()
        )
    );

CREATE POLICY "Create agent sessions for own institution"
    ON public.agent_sessions
    FOR INSERT
    WITH CHECK (
        institution_id IN (
            SELECT institution_id
            FROM public.institution_members
            WHERE user_id = public.get_current_user_id()
            AND role IN ('admin', 'reviewer')
        )
        AND initiated_by = public.get_current_user_id()
    );

CREATE POLICY "Update agent sessions for own institution"
    ON public.agent_sessions
    FOR UPDATE
    USING (
        institution_id IN (
            SELECT institution_id
            FROM public.institution_members
            WHERE user_id = public.get_current_user_id()
            AND role IN ('admin', 'reviewer')
        )
    );

CREATE POLICY "Service role full access to agent_sessions"
    ON public.agent_sessions
    FOR ALL
    USING (auth.role() = 'service_role');

-- Agent Decisions policies
CREATE POLICY "View agent decisions for own institution"
    ON public.agent_decisions
    FOR SELECT
    USING (
        institution_id IN (
            SELECT institution_id
            FROM public.institution_members
            WHERE user_id = public.get_current_user_id()
        )
    );

CREATE POLICY "Create agent decisions via service role only"
    ON public.agent_decisions
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Review agent decisions in own institution"
    ON public.agent_decisions
    FOR UPDATE
    USING (
        institution_id IN (
            SELECT institution_id
            FROM public.institution_members
            WHERE user_id = public.get_current_user_id()
            AND role IN ('admin', 'reviewer')
        )
    );

CREATE POLICY "Service role full access to agent_decisions"
    ON public.agent_decisions
    FOR ALL
    USING (auth.role() = 'service_role');

-- Saved Charts policies
CREATE POLICY "View charts for own institution"
    ON public.saved_charts
    FOR SELECT
    USING (
        institution_id IN (
            SELECT institution_id
            FROM public.institution_members
            WHERE user_id = public.get_current_user_id()
        )
    );

CREATE POLICY "Create charts for own institution"
    ON public.saved_charts
    FOR INSERT
    WITH CHECK (
        institution_id IN (
            SELECT institution_id
            FROM public.institution_members
            WHERE user_id = public.get_current_user_id()
        )
        AND created_by = public.get_current_user_id()
    );

CREATE POLICY "Update own charts"
    ON public.saved_charts
    FOR UPDATE
    USING (created_by = public.get_current_user_id());

CREATE POLICY "Admins can delete charts in their institution"
    ON public.saved_charts
    FOR DELETE
    USING (
        institution_id IN (
            SELECT institution_id
            FROM public.institution_members
            WHERE user_id = public.get_current_user_id()
            AND role = 'admin'
        )
        OR created_by = public.get_current_user_id()
    );

CREATE POLICY "Service role full access to saved_charts"
    ON public.saved_charts
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.agent_sessions IS
    'Tracks AI agent execution sessions for document review, APS ranking, analytics, and other automated tasks';

COMMENT ON COLUMN public.agent_sessions.agent_type IS
    'document_reviewer: Document verification, aps_ranking: APS score calculation, reviewer_assistant: Decision support, analytics: Data analysis, notification_sender: Automated notifications';

COMMENT ON COLUMN public.agent_sessions.target_ids IS
    'Array of UUIDs for entities the agent is processing (applications, documents, etc.)';

COMMENT ON TABLE public.agent_decisions IS
    'Audit trail of decisions made by AI agents, allowing staff review and override';

COMMENT ON COLUMN public.agent_decisions.confidence_score IS
    'Agent confidence in decision from 0.00 (no confidence) to 1.00 (full confidence)';

COMMENT ON COLUMN public.agent_decisions.review_outcome IS
    'Staff review result: accepted (confirmed), overridden (changed by staff), pending (not yet reviewed)';

COMMENT ON TABLE public.saved_charts IS
    'Archived analytics visualizations generated by analytics agent or created by staff';

COMMENT ON COLUMN public.saved_charts.chart_config IS
    'Recharts/D3 configuration JSON for rendering the chart';
