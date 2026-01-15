-- Migration: 012_export_applications_permission
-- Description: Add export_applications permission to admin roles and seed new default roles
-- Created: 2026-01-12

-- ============================================================================
-- ADD NEW PERMISSION TO EXISTING ADMINISTRATOR ROLES
-- ============================================================================
-- Add export_applications permission to existing admin roles
UPDATE public.institution_roles
SET permissions = permissions || '["export_applications"]'::jsonb
WHERE slug = 'admin' AND is_system = true
AND NOT permissions ? 'export_applications';

-- Also add edit_campuses and edit_faculties if missing
UPDATE public.institution_roles
SET permissions = permissions || '["edit_campuses"]'::jsonb
WHERE slug = 'admin' AND is_system = true
AND NOT permissions ? 'edit_campuses';

UPDATE public.institution_roles
SET permissions = permissions || '["edit_faculties"]'::jsonb
WHERE slug = 'admin' AND is_system = true
AND NOT permissions ? 'edit_faculties';

-- ============================================================================
-- SEED NEW DEFAULT ROLES FOR EXISTING INSTITUTIONS
-- ============================================================================
-- Applications Administrator (editable default)
INSERT INTO public.institution_roles (institution_id, name, slug, description, permissions, color, is_system, is_default)
SELECT
    i.id,
    'Applications Administrator',
    'applications-admin',
    'Process applications for intake considerations',
    '["view_dashboard", "view_applications", "process_applications", "manage_applications"]'::jsonb,
    '#22c55e',
    false,
    true
FROM public.institutions i
WHERE NOT EXISTS (
    SELECT 1 FROM public.institution_roles ir
    WHERE ir.institution_id = i.id AND ir.slug = 'applications-admin'
);

-- Academic Data Maintainer (editable default)
INSERT INTO public.institution_roles (institution_id, name, slug, description, permissions, color, is_system, is_default)
SELECT
    i.id,
    'Academic Data Maintainer',
    'academic-maintainer',
    'Manage institution academic data structure. Export application data.',
    '["view_dashboard", "view_applications", "edit_campuses", "edit_faculties", "edit_courses", "export_applications"]'::jsonb,
    '#3b82f6',
    false,
    true
FROM public.institutions i
WHERE NOT EXISTS (
    SELECT 1 FROM public.institution_roles ir
    WHERE ir.institution_id = i.id AND ir.slug = 'academic-maintainer'
);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.institution_roles IS 'Custom roles with granular permissions per institution. Includes system Administrator role plus editable default roles (Applications Administrator, Academic Data Maintainer)';
