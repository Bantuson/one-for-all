-- ============================================================================
-- One For All - Complete Database Schema Migration
-- Description: Unified auth + institutions + applications schema
-- Created: 2025-12-03
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";  -- pgvector for RAG embeddings

-- ============================================================================
-- SECTION 1: AUTHENTICATION & USER MANAGEMENT
-- ============================================================================

-- Users table (synced from Clerk)
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

CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON public.users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- User accounts (for CrewAI backend - original schema)
CREATE TABLE IF NOT EXISTS public.user_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    cellphone TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_accounts_email ON public.user_accounts(email);
CREATE INDEX IF NOT EXISTS idx_user_accounts_cellphone ON public.user_accounts(cellphone);

-- User sessions (24-hour TTL for CrewAI auth)
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_accounts(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON public.user_sessions(expires_at);

-- ============================================================================
-- SECTION 2: MULTI-TENANT INSTITUTION HIERARCHY
-- ============================================================================

-- Institutions table
CREATE TABLE IF NOT EXISTS public.institutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    type TEXT NOT NULL CHECK (type IN ('university', 'college', 'nsfas', 'bursary_provider')),

    -- Contact
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    website TEXT,
    address JSONB DEFAULT '{}'::jsonb,

    -- Branding
    logo_url TEXT,
    primary_color TEXT DEFAULT '#000000',

    -- Settings
    settings JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),

    -- Metadata
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_institutions_slug ON public.institutions(slug);
CREATE INDEX IF NOT EXISTS idx_institutions_type ON public.institutions(type);

-- Campuses
CREATE TABLE IF NOT EXISTS public.campuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(institution_id, code)
);

CREATE INDEX IF NOT EXISTS idx_campuses_institution_id ON public.campuses(institution_id);

-- Faculties
CREATE TABLE IF NOT EXISTS public.faculties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(institution_id, code)
);

CREATE INDEX IF NOT EXISTS idx_faculties_institution_id ON public.faculties(institution_id);

-- Courses
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES public.faculties(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    requirements JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(institution_id, code)
);

CREATE INDEX IF NOT EXISTS idx_courses_institution_id ON public.courses(institution_id);

-- Institution members (user-to-institution relationship)
CREATE TABLE IF NOT EXISTS public.institution_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'reviewer', 'member', 'applicant')),
    invited_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(institution_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_institution_members_institution_id ON public.institution_members(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_members_user_id ON public.institution_members(user_id);

-- ============================================================================
-- SECTION 3: APPLICATIONS & DOCUMENTS
-- ============================================================================

-- Applications (CrewAI backend + multi-tenant support)
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_accounts(id) ON DELETE CASCADE,

    -- Multi-tenant support (NEW)
    institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,

    -- Legacy TEXT fields (kept for backward compatibility)
    university_name TEXT NOT NULL,
    faculty TEXT,
    qualification_type TEXT,
    program TEXT,
    year INT,

    -- Application data
    personal_info JSONB NOT NULL,
    academic_info JSONB NOT NULL,
    rag_summary JSONB,
    submission_payload JSONB,

    -- Status tracking
    status TEXT DEFAULT 'submitted',
    status_history JSONB DEFAULT '[]'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_user ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_university ON public.applications(university_name);
CREATE INDEX IF NOT EXISTS idx_applications_institution_id ON public.applications(institution_id);
CREATE INDEX IF NOT EXISTS idx_applications_course_id ON public.applications(course_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);

-- Application documents
CREATE TABLE IF NOT EXISTS public.application_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    document_type TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appdocs_appid ON public.application_documents(application_id);

-- NSFAS applications
CREATE TABLE IF NOT EXISTS public.nsfas_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_accounts(id) ON DELETE CASCADE,

    -- Multi-tenant support (NEW)
    institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,

    -- Reused data
    personal_info JSONB NOT NULL,
    academic_info JSONB NOT NULL,

    -- NSFAS-specific
    guardian_info JSONB,
    household_info JSONB,
    income_info JSONB,
    bank_details JSONB,
    living_situation TEXT,

    status TEXT DEFAULT 'submitted',
    status_history JSONB DEFAULT '[]'::jsonb,
    submission_payload JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nsfas_user ON public.nsfas_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_nsfas_institution_id ON public.nsfas_applications(institution_id);

-- NSFAS documents
CREATE TABLE IF NOT EXISTS public.nsfas_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nsfas_application_id UUID NOT NULL REFERENCES public.nsfas_applications(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    document_type TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nsfas_docs_appid ON public.nsfas_documents(nsfas_application_id);

-- ============================================================================
-- SECTION 4: RAG EMBEDDINGS (VECTOR SEARCH)
-- ============================================================================

-- RAG embeddings with pgvector
CREATE TABLE IF NOT EXISTS public.rag_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Multi-tenant support (NEW)
    institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,

    -- Vector embedding (1536 dimensions for OpenAI)
    embedding vector(1536) NOT NULL,

    -- Metadata
    metadata JSONB,
    source TEXT,  -- Legacy: e.g., "UCT", "Wits", "UP"
    chunk TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector index for ANN search (approximate nearest neighbor)
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_vector
    ON public.rag_embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_rag_embeddings_source ON public.rag_embeddings(source);
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_institution_id ON public.rag_embeddings(institution_id);

-- ============================================================================
-- SECTION 5: HELPER FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_institutions_updated_at BEFORE UPDATE ON public.institutions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_nsfas_updated_at BEFORE UPDATE ON public.nsfas_applications
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sync Clerk user (called from webhook)
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
    INSERT INTO public.users (
        clerk_user_id, email, first_name, last_name, avatar_url, phone
    )
    VALUES (
        p_clerk_user_id, p_email, p_first_name, p_last_name, p_avatar_url, p_phone
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

-- Get current user ID from Clerk JWT
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT id FROM public.users
        WHERE clerk_user_id = auth.jwt() ->> 'sub'
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get user's institutions
CREATE OR REPLACE FUNCTION public.get_user_institutions()
RETURNS TABLE(institution_id UUID, role TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT im.institution_id, im.role
    FROM public.institution_members im
    WHERE im.user_id = public.get_current_user_id();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Auto-assign creator as admin when institution is created
CREATE OR REPLACE FUNCTION public.assign_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.institution_members (
        institution_id, user_id, role
    )
    VALUES (NEW.id, NEW.created_by, 'admin');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_assign_admin
    AFTER INSERT ON public.institutions
    FOR EACH ROW
    WHEN (NEW.created_by IS NOT NULL)
    EXECUTE FUNCTION public.assign_creator_as_admin();

-- Vector similarity search for RAG (existing function)
CREATE OR REPLACE FUNCTION public.match_rag_embeddings(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5,
    filter_institution_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    source TEXT,
    chunk TEXT,
    metadata JSONB,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        rag_embeddings.id,
        rag_embeddings.source,
        rag_embeddings.chunk,
        rag_embeddings.metadata,
        1 - (rag_embeddings.embedding <=> query_embedding) AS similarity
    FROM public.rag_embeddings
    WHERE (filter_institution_id IS NULL OR rag_embeddings.institution_id = filter_institution_id)
    AND 1 - (rag_embeddings.embedding <=> query_embedding) > match_threshold
    ORDER BY rag_embeddings.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- SECTION 6: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nsfas_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_embeddings ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Service role full access to users" ON public.users
    FOR ALL USING (auth.role() = 'service_role');

-- Institutions policies
CREATE POLICY "View own institutions" ON public.institutions
    FOR SELECT USING (
        id IN (SELECT institution_id FROM public.institution_members WHERE user_id = public.get_current_user_id())
    );

CREATE POLICY "Admins can update institutions" ON public.institutions
    FOR UPDATE USING (
        id IN (SELECT institution_id FROM public.institution_members WHERE user_id = public.get_current_user_id() AND role = 'admin')
    );

CREATE POLICY "Users can create institutions" ON public.institutions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role full access to institutions" ON public.institutions
    FOR ALL USING (auth.role() = 'service_role');

-- Campuses/Faculties/Courses policies (similar pattern)
CREATE POLICY "View own institution campuses" ON public.campuses
    FOR SELECT USING (
        institution_id IN (SELECT institution_id FROM public.institution_members WHERE user_id = public.get_current_user_id())
    );

CREATE POLICY "View own institution faculties" ON public.faculties
    FOR SELECT USING (
        institution_id IN (SELECT institution_id FROM public.institution_members WHERE user_id = public.get_current_user_id())
    );

CREATE POLICY "View own institution courses" ON public.courses
    FOR SELECT USING (
        institution_id IN (SELECT institution_id FROM public.institution_members WHERE user_id = public.get_current_user_id())
    );

-- Institution members policies
CREATE POLICY "View own memberships" ON public.institution_members
    FOR SELECT USING (user_id = public.get_current_user_id());

CREATE POLICY "Admins can manage members" ON public.institution_members
    FOR ALL USING (
        institution_id IN (SELECT institution_id FROM public.institution_members WHERE user_id = public.get_current_user_id() AND role = 'admin')
    );

CREATE POLICY "Users can insert own membership" ON public.institution_members
    FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

-- Applications policies (user-scoped + future institution-scoped)
CREATE POLICY "Users can view own applications" ON public.applications
    FOR SELECT USING (
        user_id IN (SELECT id FROM public.user_accounts WHERE email = (SELECT email FROM public.users WHERE id = public.get_current_user_id()))
        OR institution_id IN (SELECT institution_id FROM public.institution_members WHERE user_id = public.get_current_user_id())
    );

CREATE POLICY "Service role full access to applications" ON public.applications
    FOR ALL USING (auth.role() = 'service_role');

-- NSFAS applications policies
CREATE POLICY "Users can view own nsfas applications" ON public.nsfas_applications
    FOR SELECT USING (
        user_id IN (SELECT id FROM public.user_accounts WHERE email = (SELECT email FROM public.users WHERE id = public.get_current_user_id()))
    );

CREATE POLICY "Service role full access to nsfas" ON public.nsfas_applications
    FOR ALL USING (auth.role() = 'service_role');

-- RAG embeddings policies (institution-scoped)
CREATE POLICY "Service role full access to rag" ON public.rag_embeddings
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- SECTION 7: GRANTS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.users IS 'User profiles synced from Clerk authentication';
COMMENT ON TABLE public.user_accounts IS 'Legacy user accounts for CrewAI backend';
COMMENT ON TABLE public.institutions IS 'Multi-tenant institution registration and management';
COMMENT ON TABLE public.applications IS 'University applications with multi-tenant support';
COMMENT ON TABLE public.nsfas_applications IS 'NSFAS funding applications';
COMMENT ON TABLE public.rag_embeddings IS 'Vector embeddings for RAG-based course search';
COMMENT ON FUNCTION public.match_rag_embeddings IS 'Find similar embeddings using cosine similarity';
COMMENT ON FUNCTION public.sync_clerk_user IS 'Sync user data from Clerk webhook';
