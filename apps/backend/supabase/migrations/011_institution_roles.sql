-- Migration: 011_institution_roles
-- Description: Create institution_roles table for flexible role management per institution
-- Created: 2026-01-09

-- ============================================================================
-- INSTITUTION_ROLES TABLE
-- ============================================================================
-- Stores custom roles defined per institution with granular permissions
CREATE TABLE IF NOT EXISTS public.institution_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Institution relationship
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,

    -- Role identification
    name TEXT NOT NULL,
    slug TEXT NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    description TEXT,

    -- Permissions (JSONB array of permission strings)
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Role flags
    is_system BOOLEAN NOT NULL DEFAULT false,
    is_default BOOLEAN NOT NULL DEFAULT false,

    -- Display customization
    color TEXT DEFAULT '#6B7280',

    -- Audit fields
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE(institution_id, slug)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_institution_roles_institution_id
    ON public.institution_roles(institution_id);

CREATE INDEX IF NOT EXISTS idx_institution_roles_institution_slug
    ON public.institution_roles(institution_id, slug);

CREATE INDEX IF NOT EXISTS idx_institution_roles_institution_system
    ON public.institution_roles(institution_id, is_system);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
DROP TRIGGER IF EXISTS update_institution_roles_updated_at ON public.institution_roles;
CREATE TRIGGER update_institution_roles_updated_at
    BEFORE UPDATE ON public.institution_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.institution_roles ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- VIEW POLICY: Members of institution can view roles
-- ----------------------------------------------------------------------------
CREATE POLICY "Members can view institution roles"
    ON public.institution_roles
    FOR SELECT
    USING (
        institution_id IN (
            SELECT im.institution_id
            FROM public.institution_members im
            WHERE im.user_id = public.get_current_user_id()
        )
    );

-- ----------------------------------------------------------------------------
-- INSERT POLICY: Admins can create roles
-- ----------------------------------------------------------------------------
CREATE POLICY "Admins can create institution roles"
    ON public.institution_roles
    FOR INSERT
    WITH CHECK (
        institution_id IN (
            SELECT im.institution_id
            FROM public.institution_members im
            WHERE im.user_id = public.get_current_user_id()
            AND im.role = 'admin'
        )
    );

-- ----------------------------------------------------------------------------
-- UPDATE POLICY: Admins can update roles
-- ----------------------------------------------------------------------------
CREATE POLICY "Admins can update institution roles"
    ON public.institution_roles
    FOR UPDATE
    USING (
        institution_id IN (
            SELECT im.institution_id
            FROM public.institution_members im
            WHERE im.user_id = public.get_current_user_id()
            AND im.role = 'admin'
        )
    );

-- ----------------------------------------------------------------------------
-- DELETE POLICY: Admins can delete non-system roles
-- ----------------------------------------------------------------------------
CREATE POLICY "Admins can delete non-system institution roles"
    ON public.institution_roles
    FOR DELETE
    USING (
        is_system = false
        AND institution_id IN (
            SELECT im.institution_id
            FROM public.institution_members im
            WHERE im.user_id = public.get_current_user_id()
            AND im.role = 'admin'
        )
    );

-- ----------------------------------------------------------------------------
-- SERVICE ROLE POLICY: Full access for backend operations
-- ----------------------------------------------------------------------------
CREATE POLICY "Service role full access to institution_roles"
    ON public.institution_roles
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- TRIGGER FUNCTION: Seed default admin role on institution creation
-- ============================================================================
CREATE OR REPLACE FUNCTION public.seed_default_admin_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert the default admin role with all permissions
    INSERT INTO public.institution_roles (
        institution_id,
        name,
        slug,
        description,
        permissions,
        is_system,
        is_default,
        color,
        created_by
    )
    VALUES (
        NEW.id,
        'Administrator',
        'admin',
        'Full access to all institution features and settings',
        '["view_dashboard", "view_applications", "edit_courses", "process_applications", "export_data", "manage_team", "manage_applications", "view_reports", "manage_settings", "admin_access"]'::jsonb,
        true,
        true,
        '#DC2626',
        NEW.created_by
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to seed admin role after institution creation
DROP TRIGGER IF EXISTS seed_admin_role_on_institution ON public.institutions;
CREATE TRIGGER seed_admin_role_on_institution
    AFTER INSERT ON public.institutions
    FOR EACH ROW
    EXECUTE FUNCTION public.seed_default_admin_role();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE public.institution_roles IS 'Custom roles with granular permissions per institution';
COMMENT ON COLUMN public.institution_roles.slug IS 'URL-friendly role identifier, unique per institution';
COMMENT ON COLUMN public.institution_roles.permissions IS 'JSONB array of permission strings granted to this role';
COMMENT ON COLUMN public.institution_roles.is_system IS 'System roles cannot be deleted by institution admins';
COMMENT ON COLUMN public.institution_roles.is_default IS 'Default role assigned to new members if no role specified';
COMMENT ON COLUMN public.institution_roles.color IS 'Hex color code for UI display of role badges';
COMMENT ON FUNCTION public.seed_default_admin_role IS 'Automatically creates admin role when new institution is created';
