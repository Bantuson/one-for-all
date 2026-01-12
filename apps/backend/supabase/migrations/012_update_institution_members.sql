-- Migration: 012_update_institution_members
-- Description: Update institution_members table to support custom roles via role_id
-- Created: 2025-01-09
-- Depends on: 011_institution_roles.sql (institution_roles table must exist)

-- ============================================================================
-- ADD ROLE_ID COLUMN
-- ============================================================================
-- Add foreign key reference to institution_roles table for custom role support
-- Nullable for migration compatibility - existing members will be linked in data migration below
ALTER TABLE public.institution_members
  ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.institution_roles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.institution_members.role_id IS 'Reference to custom role in institution_roles table. Takes precedence over legacy role column when present.';

-- Create index for efficient role lookups and joins
CREATE INDEX IF NOT EXISTS idx_institution_members_role_id
  ON public.institution_members(role_id)
  WHERE role_id IS NOT NULL;

-- ============================================================================
-- RELAX ROLE COLUMN CONSTRAINT
-- ============================================================================
-- The original constraint restricted role to: 'admin', 'reviewer', 'member', 'applicant'
-- We need to allow custom role names while ensuring the column is not empty

-- First, drop the existing check constraint on the role column
-- PostgreSQL generates constraint names as: {table}_{column}_check
ALTER TABLE public.institution_members
  DROP CONSTRAINT IF EXISTS institution_members_role_check;

-- Add a looser constraint that just ensures role is not empty when present
-- The role column is still NOT NULL from the original schema, so we just check for non-empty
ALTER TABLE public.institution_members
  ADD CONSTRAINT institution_members_role_not_empty
  CHECK (role IS NULL OR length(trim(role)) > 0);

COMMENT ON COLUMN public.institution_members.role IS 'Legacy role text field. Use role_id for custom roles. Kept for backward compatibility.';

-- ============================================================================
-- ADD EMAIL_SENT_AT COLUMN FOR INVITATION TRACKING
-- ============================================================================
-- Track when invitation emails were sent
ALTER TABLE public.institution_members
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.institution_members.email_sent_at IS 'Timestamp when invitation email was sent to the user';

-- Create index for tracking unsent invitations
CREATE INDEX IF NOT EXISTS idx_institution_members_email_sent_at
  ON public.institution_members(email_sent_at)
  WHERE email_sent_at IS NULL AND invitation_status = 'pending';

-- ============================================================================
-- DATA MIGRATION: SEED DEFAULT ROLES AND LINK EXISTING MEMBERS
-- ============================================================================
-- This section creates default roles for all existing institutions and
-- links existing members to their corresponding roles based on role text

-- Create a DO block for the data migration
DO $$
DECLARE
  inst RECORD;
  admin_role_id UUID;
  reviewer_role_id UUID;
  member_role_id UUID;
  applicant_role_id UUID;
BEGIN
  -- Loop through all existing institutions
  FOR inst IN SELECT id, name FROM public.institutions LOOP

    -- Check if roles already exist for this institution (idempotency)
    SELECT id INTO admin_role_id
    FROM public.institution_roles
    WHERE institution_id = inst.id AND slug = 'admin';

    -- If no admin role exists, create all default roles for this institution
    IF admin_role_id IS NULL THEN
      -- Insert admin role
      INSERT INTO public.institution_roles (institution_id, name, slug, description, permissions, is_system_role, display_order)
      VALUES (
        inst.id,
        'Administrator',
        'admin',
        'Full access to all institution settings and management features',
        '["manage_institution", "manage_members", "manage_roles", "manage_applications", "manage_courses", "view_analytics", "manage_settings"]'::jsonb,
        true,
        1
      )
      RETURNING id INTO admin_role_id;

      -- Insert reviewer role
      INSERT INTO public.institution_roles (institution_id, name, slug, description, permissions, is_system_role, display_order)
      VALUES (
        inst.id,
        'Reviewer',
        'reviewer',
        'Can review and process applications, manage courses',
        '["view_applications", "review_applications", "manage_courses", "view_members"]'::jsonb,
        true,
        2
      )
      RETURNING id INTO reviewer_role_id;

      -- Insert member role
      INSERT INTO public.institution_roles (institution_id, name, slug, description, permissions, is_system_role, display_order)
      VALUES (
        inst.id,
        'Member',
        'member',
        'Basic access to institution resources and information',
        '["view_courses", "view_institution"]'::jsonb,
        true,
        3
      )
      RETURNING id INTO member_role_id;

      -- Insert applicant role
      INSERT INTO public.institution_roles (institution_id, name, slug, description, permissions, is_system_role, display_order)
      VALUES (
        inst.id,
        'Applicant',
        'applicant',
        'Can submit and track applications',
        '["submit_application", "view_own_applications", "view_courses"]'::jsonb,
        true,
        4
      )
      RETURNING id INTO applicant_role_id;

      RAISE NOTICE 'Created default roles for institution: %', inst.name;
    ELSE
      -- Roles already exist, fetch their IDs
      SELECT id INTO reviewer_role_id
      FROM public.institution_roles
      WHERE institution_id = inst.id AND slug = 'reviewer';

      SELECT id INTO member_role_id
      FROM public.institution_roles
      WHERE institution_id = inst.id AND slug = 'member';

      SELECT id INTO applicant_role_id
      FROM public.institution_roles
      WHERE institution_id = inst.id AND slug = 'applicant';

      RAISE NOTICE 'Roles already exist for institution: %', inst.name;
    END IF;

    -- Link existing members to their corresponding roles based on role text
    -- Only update members that don't already have a role_id set
    UPDATE public.institution_members
    SET role_id = CASE role
      WHEN 'admin' THEN admin_role_id
      WHEN 'reviewer' THEN reviewer_role_id
      WHEN 'member' THEN member_role_id
      WHEN 'applicant' THEN applicant_role_id
      ELSE NULL
    END
    WHERE institution_id = inst.id
      AND role_id IS NULL
      AND role IN ('admin', 'reviewer', 'member', 'applicant');

  END LOOP;

  RAISE NOTICE 'Data migration completed: default roles seeded and members linked';
END $$;

-- ============================================================================
-- UPDATE HELPER FUNCTIONS TO SUPPORT CUSTOM ROLES
-- ============================================================================

-- Update get_user_institutions to include role_id
CREATE OR REPLACE FUNCTION public.get_user_institutions()
RETURNS TABLE(institution_id UUID, role TEXT, role_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT im.institution_id, im.role, im.role_id
    FROM public.institution_members im
    WHERE im.user_id = public.get_current_user_id();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_user_institutions IS 'Get all institutions user is a member of with their role information';

-- Create function to check if user has a specific permission in an institution
CREATE OR REPLACE FUNCTION public.user_has_permission(
    p_institution_id UUID,
    p_permission TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.institution_members im
        JOIN public.institution_roles ir ON im.role_id = ir.id
        WHERE im.institution_id = p_institution_id
          AND im.user_id = public.get_current_user_id()
          AND ir.permissions ? p_permission
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.user_has_permission IS 'Check if user has a specific permission in an institution via their role';

GRANT EXECUTE ON FUNCTION public.user_has_permission TO authenticated;

-- Create function to get user permissions in an institution
CREATE OR REPLACE FUNCTION public.get_user_permissions(
    p_institution_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_permissions JSONB;
BEGIN
    SELECT COALESCE(ir.permissions, '[]'::jsonb)
    INTO v_permissions
    FROM public.institution_members im
    JOIN public.institution_roles ir ON im.role_id = ir.id
    WHERE im.institution_id = p_institution_id
      AND im.user_id = public.get_current_user_id();

    RETURN COALESCE(v_permissions, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_user_permissions IS 'Get all permissions for the current user in an institution';

GRANT EXECUTE ON FUNCTION public.get_user_permissions TO authenticated;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE public.institution_members IS 'User memberships and roles per institution. Supports both legacy text roles and custom role_id references.';
