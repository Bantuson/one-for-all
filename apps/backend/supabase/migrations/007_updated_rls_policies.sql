-- Migration: 007_updated_rls_policies
-- Description: Secure RLS policies for all tables
-- Purpose: Protect data with proper access controls
-- Created: 2025-12-24

-- ============================================================================
-- PART 1: DROP EXISTING INSECURE POLICIES
-- ============================================================================

-- Drop legacy policies that reference old table/column names or have security issues
DROP POLICY IF EXISTS "Users own their accounts" ON public.applicant_accounts;
DROP POLICY IF EXISTS "Users own their sessions" ON public.applicant_sessions;
DROP POLICY IF EXISTS "Users own their applications" ON public.applications;
DROP POLICY IF EXISTS "Users own their documents" ON public.application_documents;
DROP POLICY IF EXISTS "Users own their NSFAS applications" ON public.nsfas_applications;
DROP POLICY IF EXISTS "Users own their NSFAS documents" ON public.nsfas_documents;

-- CRITICAL: Drop insecure public RAG access
DROP POLICY IF EXISTS "Allow read-only access to rag embeddings" ON public.rag_embeddings;

-- Drop any existing service role policies to recreate them
DROP POLICY IF EXISTS "Service role full access to applicant_accounts" ON public.applicant_accounts;
DROP POLICY IF EXISTS "Service role full access to applicant_sessions" ON public.applicant_sessions;
DROP POLICY IF EXISTS "Service role full access to applications" ON public.applications;
DROP POLICY IF EXISTS "Service role full access to application_documents" ON public.application_documents;
DROP POLICY IF EXISTS "Service role full access to nsfas_applications" ON public.nsfas_applications;
DROP POLICY IF EXISTS "Service role full access to nsfas_documents" ON public.nsfas_documents;
DROP POLICY IF EXISTS "Service role full access to rag_embeddings" ON public.rag_embeddings;

-- ============================================================================
-- PART 2: ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.applicant_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applicant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nsfas_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nsfas_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_embeddings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 3: APPLICANT ACCOUNTS POLICIES
-- Service role only - applicants are managed via API wrappers
-- ============================================================================

CREATE POLICY "Service role full access to applicant_accounts"
    ON public.applicant_accounts
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- PART 4: APPLICANT SESSIONS POLICIES
-- Service role only - sessions managed via API wrappers
-- ============================================================================

CREATE POLICY "Service role full access to applicant_sessions"
    ON public.applicant_sessions
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- PART 5: APPLICATIONS POLICIES
-- Institution staff can view/manage their institution's applications
-- Service role for CrewAI backend
-- ============================================================================

-- Service role bypass for backend API
CREATE POLICY "Service role full access to applications"
    ON public.applications
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Institution admins and reviewers can view their institution's applications
CREATE POLICY "Institution staff can view applications"
    ON public.applications
    FOR SELECT
    USING (
        institution_id IS NOT NULL
        AND institution_id IN (
            SELECT im.institution_id
            FROM public.institution_members im
            WHERE im.user_id = public.get_current_user_id()
            AND im.role IN ('admin', 'reviewer')
        )
    );

-- Institution admins can update application status
CREATE POLICY "Institution admins can update applications"
    ON public.applications
    FOR UPDATE
    USING (
        institution_id IS NOT NULL
        AND institution_id IN (
            SELECT im.institution_id
            FROM public.institution_members im
            WHERE im.user_id = public.get_current_user_id()
            AND im.role = 'admin'
        )
    )
    WITH CHECK (
        institution_id IS NOT NULL
        AND institution_id IN (
            SELECT im.institution_id
            FROM public.institution_members im
            WHERE im.user_id = public.get_current_user_id()
            AND im.role = 'admin'
        )
    );

-- ============================================================================
-- PART 6: APPLICATION DOCUMENTS POLICIES
-- Same access pattern as applications
-- ============================================================================

-- Service role bypass for backend API
CREATE POLICY "Service role full access to application_documents"
    ON public.application_documents
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Institution staff can view documents for their institution's applications
CREATE POLICY "Institution staff can view application documents"
    ON public.application_documents
    FOR SELECT
    USING (
        application_id IN (
            SELECT a.id
            FROM public.applications a
            WHERE a.institution_id IS NOT NULL
            AND a.institution_id IN (
                SELECT im.institution_id
                FROM public.institution_members im
                WHERE im.user_id = public.get_current_user_id()
                AND im.role IN ('admin', 'reviewer')
            )
        )
    );

-- ============================================================================
-- PART 7: NSFAS APPLICATIONS POLICIES
-- Service role only - contains sensitive financial information
-- ============================================================================

CREATE POLICY "Service role full access to nsfas_applications"
    ON public.nsfas_applications
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- PART 8: NSFAS DOCUMENTS POLICIES
-- Service role only - sensitive financial documents
-- ============================================================================

CREATE POLICY "Service role full access to nsfas_documents"
    ON public.nsfas_documents
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- PART 9: RAG EMBEDDINGS POLICIES
-- Service role only - accessed by agents via API wrappers
-- ============================================================================

CREATE POLICY "Service role full access to rag_embeddings"
    ON public.rag_embeddings
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- PART 10: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "Service role full access to applicant_accounts" ON public.applicant_accounts IS
    'Backend API uses service role. No direct user access to applicant accounts.';

COMMENT ON POLICY "Service role full access to applicant_sessions" ON public.applicant_sessions IS
    'Backend API uses service role. Sessions managed via validated API endpoints.';

COMMENT ON POLICY "Service role full access to applications" ON public.applications IS
    'Backend API uses service role for CrewAI agent operations.';

COMMENT ON POLICY "Institution staff can view applications" ON public.applications IS
    'Dashboard users can view applications for institutions they are admin/reviewer of.';

COMMENT ON POLICY "Service role full access to rag_embeddings" ON public.rag_embeddings IS
    'RAG embeddings are server-side only. No public or authenticated user access.';

-- ============================================================================
-- PART 11: VERIFY POLICIES
-- ============================================================================

-- Run this query to verify all policies are in place:
/*
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
*/

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (run manually if needed)
-- ============================================================================
/*
-- To rollback and restore old (insecure) policies:

-- Drop new policies
DROP POLICY IF EXISTS "Service role full access to applicant_accounts" ON public.applicant_accounts;
DROP POLICY IF EXISTS "Service role full access to applicant_sessions" ON public.applicant_sessions;
DROP POLICY IF EXISTS "Service role full access to applications" ON public.applications;
DROP POLICY IF EXISTS "Institution staff can view applications" ON public.applications;
DROP POLICY IF EXISTS "Institution admins can update applications" ON public.applications;
DROP POLICY IF EXISTS "Service role full access to application_documents" ON public.application_documents;
DROP POLICY IF EXISTS "Institution staff can view application documents" ON public.application_documents;
DROP POLICY IF EXISTS "Service role full access to nsfas_applications" ON public.nsfas_applications;
DROP POLICY IF EXISTS "Service role full access to nsfas_documents" ON public.nsfas_documents;
DROP POLICY IF EXISTS "Service role full access to rag_embeddings" ON public.rag_embeddings;

-- Then run the original policies.sql migration to restore old policies
*/
