-- Migration: 031_session_token_hardening
-- Description: Add session security columns for IP tracking, user-agent fingerprinting, and token rotation
-- Purpose: Implement H4 security hardening - detect session hijacking and enable secure token rotation
-- Created: 2026-01-21

-- ============================================================================
-- STEP 1: ADD SECURITY COLUMNS TO applicant_sessions
-- ============================================================================

-- Current request IP address (for hijacking detection)
ALTER TABLE public.applicant_sessions
    ADD COLUMN IF NOT EXISTS ip_address INET;

-- Browser/client identifier (for fingerprint validation)
ALTER TABLE public.applicant_sessions
    ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- IP address at session creation (baseline for comparison)
ALTER TABLE public.applicant_sessions
    ADD COLUMN IF NOT EXISTS created_ip_address INET;

-- Token version for rotation tracking (increments on each rotation)
ALTER TABLE public.applicant_sessions
    ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 1;

-- Refresh token for secure token rotation (stores previous token)
ALTER TABLE public.applicant_sessions
    ADD COLUMN IF NOT EXISTS refresh_token TEXT UNIQUE;

-- Last activity timestamp for session reaping
ALTER TABLE public.applicant_sessions
    ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- STEP 2: ADD SECURITY COLUMNS TO user_sessions (if table exists)
-- ============================================================================

DO $$
BEGIN
    -- Check if user_sessions table exists (may have been renamed to applicant_sessions)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_sessions'
    ) THEN
        -- Current request IP address
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'user_sessions' AND column_name = 'ip_address'
        ) THEN
            ALTER TABLE public.user_sessions ADD COLUMN ip_address INET;
        END IF;

        -- Browser/client identifier
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'user_sessions' AND column_name = 'user_agent'
        ) THEN
            ALTER TABLE public.user_sessions ADD COLUMN user_agent TEXT;
        END IF;

        -- IP address at creation
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'user_sessions' AND column_name = 'created_ip_address'
        ) THEN
            ALTER TABLE public.user_sessions ADD COLUMN created_ip_address INET;
        END IF;

        -- Token version
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'user_sessions' AND column_name = 'token_version'
        ) THEN
            ALTER TABLE public.user_sessions ADD COLUMN token_version INTEGER DEFAULT 1;
        END IF;

        -- Refresh token
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'user_sessions' AND column_name = 'refresh_token'
        ) THEN
            ALTER TABLE public.user_sessions ADD COLUMN refresh_token TEXT UNIQUE;
        END IF;

        -- Last activity timestamp
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'user_sessions' AND column_name = 'last_activity_at'
        ) THEN
            ALTER TABLE public.user_sessions ADD COLUMN last_activity_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STEP 3: CREATE INDEXES FOR EFFICIENT QUERIES
-- ============================================================================

-- Index for session reaping queries (find stale sessions)
CREATE INDEX IF NOT EXISTS idx_applicant_sessions_last_activity
    ON public.applicant_sessions(last_activity_at);

-- Index for refresh token lookups during rotation
CREATE INDEX IF NOT EXISTS idx_applicant_sessions_refresh_token
    ON public.applicant_sessions(refresh_token)
    WHERE refresh_token IS NOT NULL;

-- Index for IP-based session queries (security monitoring)
CREATE INDEX IF NOT EXISTS idx_applicant_sessions_ip_address
    ON public.applicant_sessions(ip_address)
    WHERE ip_address IS NOT NULL;

-- Same indexes for user_sessions if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_sessions'
    ) THEN
        -- Last activity index
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_sessions_last_activity') THEN
            CREATE INDEX idx_user_sessions_last_activity
                ON public.user_sessions(last_activity_at);
        END IF;

        -- Refresh token index
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_sessions_refresh_token') THEN
            CREATE INDEX idx_user_sessions_refresh_token
                ON public.user_sessions(refresh_token)
                WHERE refresh_token IS NOT NULL;
        END IF;

        -- IP address index
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_sessions_ip_address') THEN
            CREATE INDEX idx_user_sessions_ip_address
                ON public.user_sessions(ip_address)
                WHERE ip_address IS NOT NULL;
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STEP 4: CREATE TRIGGER FOR AUTO-UPDATING last_activity_at
-- ============================================================================

-- Function to automatically update last_activity_at on row update
CREATE OR REPLACE FUNCTION public.update_session_last_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.last_activity_at = NOW();
    RETURN NEW;
END;
$$;

-- Apply trigger to applicant_sessions
DROP TRIGGER IF EXISTS trigger_applicant_sessions_last_activity ON public.applicant_sessions;
CREATE TRIGGER trigger_applicant_sessions_last_activity
    BEFORE UPDATE ON public.applicant_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_session_last_activity();

-- Apply trigger to user_sessions if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_sessions'
    ) THEN
        DROP TRIGGER IF EXISTS trigger_user_sessions_last_activity ON public.user_sessions;
        CREATE TRIGGER trigger_user_sessions_last_activity
            BEFORE UPDATE ON public.user_sessions
            FOR EACH ROW
            EXECUTE FUNCTION public.update_session_last_activity();
    END IF;
END $$;

-- ============================================================================
-- STEP 5: ADD COLUMN COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN public.applicant_sessions.ip_address IS
    'Current request IP address, updated on each session access for hijacking detection';

COMMENT ON COLUMN public.applicant_sessions.user_agent IS
    'Browser/client User-Agent header for session fingerprinting';

COMMENT ON COLUMN public.applicant_sessions.created_ip_address IS
    'IP address captured at session creation, baseline for comparison';

COMMENT ON COLUMN public.applicant_sessions.token_version IS
    'Increments on each token rotation, used to invalidate old tokens';

COMMENT ON COLUMN public.applicant_sessions.refresh_token IS
    'Previous session token stored during rotation, allows one-time fallback';

COMMENT ON COLUMN public.applicant_sessions.last_activity_at IS
    'Auto-updated timestamp for session activity, used for stale session reaping';

COMMENT ON FUNCTION public.update_session_last_activity() IS
    'Trigger function to auto-update last_activity_at on session row updates';

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (run manually if needed)
-- ============================================================================
/*
-- To rollback this migration:

ALTER TABLE public.applicant_sessions DROP COLUMN IF EXISTS ip_address;
ALTER TABLE public.applicant_sessions DROP COLUMN IF EXISTS user_agent;
ALTER TABLE public.applicant_sessions DROP COLUMN IF EXISTS created_ip_address;
ALTER TABLE public.applicant_sessions DROP COLUMN IF EXISTS token_version;
ALTER TABLE public.applicant_sessions DROP COLUMN IF EXISTS refresh_token;
ALTER TABLE public.applicant_sessions DROP COLUMN IF EXISTS last_activity_at;

DROP INDEX IF EXISTS idx_applicant_sessions_last_activity;
DROP INDEX IF EXISTS idx_applicant_sessions_refresh_token;
DROP INDEX IF EXISTS idx_applicant_sessions_ip_address;

DROP TRIGGER IF EXISTS trigger_applicant_sessions_last_activity ON public.applicant_sessions;

-- For user_sessions (if exists):
ALTER TABLE public.user_sessions DROP COLUMN IF EXISTS ip_address;
ALTER TABLE public.user_sessions DROP COLUMN IF EXISTS user_agent;
ALTER TABLE public.user_sessions DROP COLUMN IF EXISTS created_ip_address;
ALTER TABLE public.user_sessions DROP COLUMN IF EXISTS token_version;
ALTER TABLE public.user_sessions DROP COLUMN IF EXISTS refresh_token;
ALTER TABLE public.user_sessions DROP COLUMN IF EXISTS last_activity_at;

DROP INDEX IF EXISTS idx_user_sessions_last_activity;
DROP INDEX IF EXISTS idx_user_sessions_refresh_token;
DROP INDEX IF EXISTS idx_user_sessions_ip_address;

DROP TRIGGER IF EXISTS trigger_user_sessions_last_activity ON public.user_sessions;

DROP FUNCTION IF EXISTS public.update_session_last_activity();
*/
