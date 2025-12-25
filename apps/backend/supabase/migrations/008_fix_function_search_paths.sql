-- Migration: 008_fix_function_search_paths
-- Description: Fix Supabase Advisor security warnings for function search_path
-- Purpose: Prevent search_path manipulation attacks by setting immutable search_path
-- Created: 2025-12-24

-- ============================================================================
-- EXPLANATION
-- ============================================================================
-- When a function doesn't have a fixed search_path, an attacker could potentially
-- manipulate the search_path to make the function call malicious objects instead
-- of the intended ones. Setting search_path = '' forces all object references to
-- be fully qualified (e.g., public.users instead of just users).
-- ============================================================================

-- Fix get_user_institutions
ALTER FUNCTION public.get_user_institutions()
SET search_path = '';

-- Fix sync_clerk_user (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'sync_clerk_user'
    ) THEN
        EXECUTE 'ALTER FUNCTION public.sync_clerk_user SET search_path = ''''';
    END IF;
END $$;

-- Fix assign_creator_as_admin
ALTER FUNCTION public.assign_creator_as_admin()
SET search_path = '';

-- Fix update_updated_at_column
ALTER FUNCTION public.update_updated_at_column()
SET search_path = '';

-- Fix get_current_user_id
ALTER FUNCTION public.get_current_user_id()
SET search_path = '';

-- Fix match_rag_embeddings (has 4 params with defaults)
ALTER FUNCTION public.match_rag_embeddings(vector(1536), float, integer, uuid)
SET search_path = '';

-- Fix user_has_role (also a helper function from 002_institutions_schema)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'user_has_role'
    ) THEN
        EXECUTE 'ALTER FUNCTION public.user_has_role(uuid, text) SET search_path = ''''';
    END IF;
END $$;

-- ============================================================================
-- VERIFY CHANGES
-- ============================================================================
-- Run this query to confirm all functions now have fixed search_path:
/*
SELECT
    n.nspname AS schema,
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments,
    p.proconfig AS config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
    'get_user_institutions',
    'sync_clerk_user',
    'assign_creator_as_admin',
    'update_updated_at_column',
    'get_current_user_id',
    'match_rag_embeddings',
    'user_has_role'
)
ORDER BY p.proname;
*/

-- ============================================================================
-- NOTE ON VECTOR EXTENSION
-- ============================================================================
-- The Advisor also warns about the 'vector' extension being in the public schema.
-- Moving it to a different schema (like 'extensions') requires:
-- 1. Creating the new schema
-- 2. Dropping and recreating the extension
-- 3. Updating all vector column definitions and queries
-- This is a more invasive change and should be done carefully.
-- For now, the function search_path fixes are the priority.
