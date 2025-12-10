-- Migration: 002_institutions_schema
-- Description: Create multi-tenant institution hierarchy tables with RLS
-- Created: 2025-12-03

-- ============================================================================
-- INSTITUTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.institutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Basic Information
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    type TEXT NOT NULL CHECK (type IN ('university', 'college', 'nsfas', 'bursary_provider')),

    -- Contact Information
    contact_email TEXT NOT NULL CHECK (contact_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
    contact_phone TEXT,
    website TEXT,
    address JSONB DEFAULT '{
        "street": "",
        "city": "",
        "province": "",
        "postal_code": "",
        "country": "South Africa"
    }'::jsonb,

    -- Branding
    logo_url TEXT,
    primary_color TEXT DEFAULT '#000000',
    secondary_color TEXT DEFAULT '#FFFFFF',

    -- Settings
    settings JSONB DEFAULT '{
        "allow_public_applications": true,
        "require_documents": true,
        "auto_acknowledge": true,
        "evaluation_criteria_enabled": false
    }'::jsonb,

    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),

    -- Metadata
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_institutions_slug ON public.institutions(slug);
CREATE INDEX IF NOT EXISTS idx_institutions_type ON public.institutions(type);
CREATE INDEX IF NOT EXISTS idx_institutions_status ON public.institutions(status);
CREATE INDEX IF NOT EXISTS idx_institutions_created_by ON public.institutions(created_by);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_institutions_updated_at ON public.institutions;
CREATE TRIGGER update_institutions_updated_at
    BEFORE UPDATE ON public.institutions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- CAMPUSES TABLE (Optional Hierarchy Level)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.campuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    code TEXT,
    location TEXT,
    address JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(institution_id, code)
);

CREATE INDEX IF NOT EXISTS idx_campuses_institution_id ON public.campuses(institution_id);
CREATE INDEX IF NOT EXISTS idx_campuses_code ON public.campuses(institution_id, code);

DROP TRIGGER IF EXISTS update_campuses_updated_at ON public.campuses;
CREATE TRIGGER update_campuses_updated_at
    BEFORE UPDATE ON public.campuses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- FACULTIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.faculties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,

    name TEXT NOT NULL,
    code TEXT,
    description TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(institution_id, code)
);

CREATE INDEX IF NOT EXISTS idx_faculties_institution_id ON public.faculties(institution_id);
CREATE INDEX IF NOT EXISTS idx_faculties_campus_id ON public.faculties(campus_id);
CREATE INDEX IF NOT EXISTS idx_faculties_code ON public.faculties(institution_id, code);

DROP TRIGGER IF EXISTS update_faculties_updated_at ON public.faculties;
CREATE TRIGGER update_faculties_updated_at
    BEFORE UPDATE ON public.faculties
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- COURSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES public.faculties(id) ON DELETE CASCADE,
    campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,

    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    duration_years INTEGER DEFAULT 4,

    -- Admission Requirements
    requirements JSONB DEFAULT '{
        "minimum_aps": 25,
        "required_subjects": [],
        "minimum_subject_levels": {},
        "additional_requirements": []
    }'::jsonb,

    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(institution_id, code)
);

CREATE INDEX IF NOT EXISTS idx_courses_institution_id ON public.courses(institution_id);
CREATE INDEX IF NOT EXISTS idx_courses_faculty_id ON public.courses(faculty_id);
CREATE INDEX IF NOT EXISTS idx_courses_code ON public.courses(institution_id, code);
CREATE INDEX IF NOT EXISTS idx_courses_status ON public.courses(status);

DROP TRIGGER IF EXISTS update_courses_updated_at ON public.courses;
CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON public.courses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- INSTITUTION_MEMBERS TABLE (User-Institution Relationship)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.institution_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    role TEXT NOT NULL CHECK (role IN ('admin', 'reviewer', 'member', 'applicant')),
    permissions JSONB DEFAULT '[]'::jsonb,

    -- Invitation tracking
    invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    invitation_accepted_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(institution_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_institution_members_institution_id ON public.institution_members(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_members_user_id ON public.institution_members(user_id);
CREATE INDEX IF NOT EXISTS idx_institution_members_role ON public.institution_members(role);

DROP TRIGGER IF EXISTS update_institution_members_updated_at ON public.institution_members;
CREATE TRIGGER update_institution_members_updated_at
    BEFORE UPDATE ON public.institution_members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_members ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- INSTITUTIONS POLICIES
-- ----------------------------------------------------------------------------

-- Users can view institutions they're members of
CREATE POLICY "View own institutions"
    ON public.institutions
    FOR SELECT
    USING (
        id IN (
            SELECT institution_id
            FROM public.institution_members
            WHERE user_id = public.get_current_user_id()
        )
    );

-- Admins can update their institutions
CREATE POLICY "Admins can update institutions"
    ON public.institutions
    FOR UPDATE
    USING (
        id IN (
            SELECT institution_id
            FROM public.institution_members
            WHERE user_id = public.get_current_user_id()
            AND role = 'admin'
        )
    );

-- Users can insert institutions (will be auto-assigned as admin)
CREATE POLICY "Users can create institutions"
    ON public.institutions
    FOR INSERT
    WITH CHECK (true);

-- Service role has full access
CREATE POLICY "Service role full access to institutions"
    ON public.institutions
    FOR ALL
    USING (auth.role() = 'service_role');

-- ----------------------------------------------------------------------------
-- CAMPUSES POLICIES
-- ----------------------------------------------------------------------------

CREATE POLICY "View campuses of own institutions"
    ON public.campuses
    FOR SELECT
    USING (
        institution_id IN (
            SELECT institution_id
            FROM public.institution_members
            WHERE user_id = public.get_current_user_id()
        )
    );

CREATE POLICY "Admins can manage campuses"
    ON public.campuses
    FOR ALL
    USING (
        institution_id IN (
            SELECT institution_id
            FROM public.institution_members
            WHERE user_id = public.get_current_user_id()
            AND role = 'admin'
        )
    );

-- ----------------------------------------------------------------------------
-- FACULTIES POLICIES
-- ----------------------------------------------------------------------------

CREATE POLICY "View faculties of own institutions"
    ON public.faculties
    FOR SELECT
    USING (
        institution_id IN (
            SELECT institution_id
            FROM public.institution_members
            WHERE user_id = public.get_current_user_id()
        )
    );

CREATE POLICY "Admins can manage faculties"
    ON public.faculties
    FOR ALL
    USING (
        institution_id IN (
            SELECT institution_id
            FROM public.institution_members
            WHERE user_id = public.get_current_user_id()
            AND role = 'admin'
        )
    );

-- ----------------------------------------------------------------------------
-- COURSES POLICIES
-- ----------------------------------------------------------------------------

CREATE POLICY "View courses of own institutions"
    ON public.courses
    FOR SELECT
    USING (
        institution_id IN (
            SELECT institution_id
            FROM public.institution_members
            WHERE user_id = public.get_current_user_id()
        )
    );

CREATE POLICY "Admins and reviewers can manage courses"
    ON public.courses
    FOR ALL
    USING (
        institution_id IN (
            SELECT institution_id
            FROM public.institution_members
            WHERE user_id = public.get_current_user_id()
            AND role IN ('admin', 'reviewer')
        )
    );

-- ----------------------------------------------------------------------------
-- INSTITUTION_MEMBERS POLICIES
-- ----------------------------------------------------------------------------

CREATE POLICY "View own memberships"
    ON public.institution_members
    FOR SELECT
    USING (
        user_id = public.get_current_user_id()
        OR institution_id IN (
            SELECT institution_id
            FROM public.institution_members
            WHERE user_id = public.get_current_user_id()
            AND role IN ('admin', 'reviewer')
        )
    );

CREATE POLICY "Admins can manage members"
    ON public.institution_members
    FOR ALL
    USING (
        institution_id IN (
            SELECT institution_id
            FROM public.institution_members
            WHERE user_id = public.get_current_user_id()
            AND role = 'admin'
        )
    );

CREATE POLICY "Users can insert own membership"
    ON public.institution_members
    FOR INSERT
    WITH CHECK (user_id = public.get_current_user_id());

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get user's institution IDs
CREATE OR REPLACE FUNCTION public.get_user_institutions()
RETURNS TABLE(institution_id UUID, role TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT im.institution_id, im.role
    FROM public.institution_members im
    WHERE im.user_id = public.get_current_user_id();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_user_institutions TO authenticated;

-- Check if user has specific role in institution
CREATE OR REPLACE FUNCTION public.user_has_role(
    p_institution_id UUID,
    p_required_role TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.institution_members
        WHERE institution_id = p_institution_id
        AND user_id = public.get_current_user_id()
        AND role = p_required_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.user_has_role TO authenticated;

-- Automatically assign creator as admin when institution is created
CREATE OR REPLACE FUNCTION public.assign_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert membership record with admin role
    INSERT INTO public.institution_members (
        institution_id,
        user_id,
        role,
        invitation_accepted_at
    )
    VALUES (
        NEW.id,
        NEW.created_by,
        'admin',
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_assign_admin ON public.institutions;
CREATE TRIGGER auto_assign_admin
    AFTER INSERT ON public.institutions
    FOR EACH ROW
    WHEN (NEW.created_by IS NOT NULL)
    EXECUTE FUNCTION public.assign_creator_as_admin();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE public.institutions IS 'Multi-tenant institution registration and management';
COMMENT ON TABLE public.campuses IS 'Optional campus level in institution hierarchy';
COMMENT ON TABLE public.faculties IS 'Academic faculties within institutions';
COMMENT ON TABLE public.courses IS 'Course offerings with admission requirements';
COMMENT ON TABLE public.institution_members IS 'User memberships and roles per institution';
COMMENT ON FUNCTION public.get_user_institutions IS 'Get all institutions user is a member of';
COMMENT ON FUNCTION public.user_has_role IS 'Check if user has specific role in institution';
COMMENT ON FUNCTION public.assign_creator_as_admin IS 'Automatically assign institution creator as admin';
