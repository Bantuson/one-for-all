-- Migration: 001_auth_setup
-- Description: Set up authentication tables and RLS policies for Clerk integration
-- Created: 2025-12-03

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Stores user profiles synced from Clerk
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON public.users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON public.users
    FOR SELECT
    USING (clerk_user_id = auth.jwt() ->> 'sub');

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.users
    FOR UPDATE
    USING (clerk_user_id = auth.jwt() ->> 'sub')
    WITH CHECK (clerk_user_id = auth.jwt() ->> 'sub');

-- Policy: Allow service role full access (for Clerk webhook)
CREATE POLICY "Service role has full access to users"
    ON public.users
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- CLERK WEBHOOK HANDLER
-- ============================================================================
-- Function to sync Clerk user on first login or webhook call
CREATE OR REPLACE FUNCTION public.sync_clerk_user(
    p_clerk_user_id TEXT,
    p_email TEXT,
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Insert or update user
    INSERT INTO public.users (
        clerk_user_id,
        email,
        first_name,
        last_name,
        avatar_url,
        phone
    )
    VALUES (
        p_clerk_user_id,
        p_email,
        p_first_name,
        p_last_name,
        p_avatar_url,
        p_phone
    )
    ON CONFLICT (clerk_user_id)
    DO UPDATE SET
        email = EXCLUDED.email,
        first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
        last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
        phone = COALESCE(EXCLUDED.phone, public.users.phone),
        updated_at = NOW()
    RETURNING id INTO v_user_id;

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated and service role
GRANT EXECUTE ON FUNCTION public.sync_clerk_user TO authenticated, service_role;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get current user ID from Clerk JWT
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT id
        FROM public.users
        WHERE clerk_user_id = auth.jwt() ->> 'sub'
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_current_user_id TO authenticated;

-- Get current user's clerk ID from JWT
CREATE OR REPLACE FUNCTION public.get_current_clerk_user_id()
RETURNS TEXT AS $$
BEGIN
    RETURN auth.jwt() ->> 'sub';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_current_clerk_user_id TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE public.users IS 'User profiles synced from Clerk authentication';
COMMENT ON COLUMN public.users.clerk_user_id IS 'Clerk user ID from JWT sub claim';
COMMENT ON COLUMN public.users.onboarding_completed IS 'Whether user has completed onboarding flow';
COMMENT ON FUNCTION public.sync_clerk_user IS 'Sync user data from Clerk webhook or API call';
COMMENT ON FUNCTION public.get_current_user_id IS 'Get Supabase user ID from Clerk JWT';
