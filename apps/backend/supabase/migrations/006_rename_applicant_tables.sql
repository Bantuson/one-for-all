-- Migration: 006_rename_applicant_tables
-- Description: Rename user_accounts/user_sessions to applicant_accounts/applicant_sessions
-- Purpose: Clarify that these tables are for WhatsApp/Twilio applicants (OTP auth), not dashboard users
-- Created: 2024-12-24

-- ============================================================================
-- STEP 1: RENAME TABLES
-- ============================================================================

-- Rename user_accounts to applicant_accounts
ALTER TABLE IF EXISTS public.user_accounts RENAME TO applicant_accounts;

-- Rename user_sessions to applicant_sessions
ALTER TABLE IF EXISTS public.user_sessions RENAME TO applicant_sessions;

-- ============================================================================
-- STEP 2: RENAME FOREIGN KEY COLUMNS
-- ============================================================================

-- Rename user_id to applicant_id in applicant_sessions
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'applicant_sessions' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.applicant_sessions RENAME COLUMN user_id TO applicant_id;
    END IF;
END $$;

-- Rename user_id to applicant_id in applications (if not already institution-scoped)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'applications' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.applications RENAME COLUMN user_id TO applicant_id;
    END IF;
END $$;

-- Rename user_id to applicant_id in nsfas_applications
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'nsfas_applications' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.nsfas_applications RENAME COLUMN user_id TO applicant_id;
    END IF;
END $$;

-- ============================================================================
-- STEP 3: RENAME INDEXES (for clarity in query plans)
-- ============================================================================

-- Rename indexes on applicant_accounts
DO $$
BEGIN
    -- Try to rename, ignore if doesn't exist
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_accounts_email') THEN
        ALTER INDEX idx_user_accounts_email RENAME TO idx_applicant_accounts_email;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_accounts_cellphone') THEN
        ALTER INDEX idx_user_accounts_cellphone RENAME TO idx_applicant_accounts_cellphone;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_accounts_username') THEN
        ALTER INDEX idx_user_accounts_username RENAME TO idx_applicant_accounts_username;
    END IF;
END $$;

-- Rename indexes on applicant_sessions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_sessions_user') THEN
        ALTER INDEX idx_user_sessions_user RENAME TO idx_applicant_sessions_applicant;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_sessions_expiry') THEN
        ALTER INDEX idx_user_sessions_expiry RENAME TO idx_applicant_sessions_expiry;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_sessions_token') THEN
        ALTER INDEX idx_user_sessions_token RENAME TO idx_applicant_sessions_token;
    END IF;
END $$;

-- Rename indexes on applications
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_applications_user') THEN
        ALTER INDEX idx_applications_user RENAME TO idx_applications_applicant;
    END IF;
END $$;

-- Rename indexes on nsfas_applications
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_nsfas_user') THEN
        ALTER INDEX idx_nsfas_user RENAME TO idx_nsfas_applicant;
    END IF;
END $$;

-- ============================================================================
-- STEP 4: ADD TABLE COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.applicant_accounts IS
    'WhatsApp/Twilio applicant profiles for CrewAI backend (OTP auth). '
    'These are prospective students applying via AI agents, NOT dashboard users.';

COMMENT ON TABLE public.applicant_sessions IS
    '24-hour TTL sessions for applicant OTP authentication. '
    'Used by CrewAI agents to maintain applicant state during application flow.';

-- ============================================================================
-- STEP 5: CREATE NEW INDEXES IF MISSING
-- ============================================================================

-- Ensure we have indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_applicant_accounts_email ON public.applicant_accounts(email);
CREATE INDEX IF NOT EXISTS idx_applicant_accounts_cellphone ON public.applicant_accounts(cellphone);
CREATE INDEX IF NOT EXISTS idx_applicant_sessions_token ON public.applicant_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_applicant_sessions_expires ON public.applicant_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_applicant_sessions_applicant ON public.applicant_sessions(applicant_id);

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (run manually if needed)
-- ============================================================================
/*
-- To rollback this migration:

ALTER TABLE public.applicant_accounts RENAME TO user_accounts;
ALTER TABLE public.applicant_sessions RENAME TO user_sessions;

ALTER TABLE public.applicant_sessions RENAME COLUMN applicant_id TO user_id;
ALTER TABLE public.applications RENAME COLUMN applicant_id TO user_id;
ALTER TABLE public.nsfas_applications RENAME COLUMN applicant_id TO user_id;

-- Rename indexes back (optional)
ALTER INDEX idx_applicant_accounts_email RENAME TO idx_user_accounts_email;
ALTER INDEX idx_applicant_accounts_cellphone RENAME TO idx_user_accounts_cellphone;
ALTER INDEX idx_applicant_sessions_applicant RENAME TO idx_user_sessions_user;
*/
