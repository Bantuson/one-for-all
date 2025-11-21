-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Institutions (Tenants)
create table institutions (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    slug text not null unique,
    logo_url text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 2. Campuses
create table campuses (
    id uuid primary key default uuid_generate_v4(),
    institution_id uuid not null references institutions(id) on delete cascade,
    name text not null,
    location text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 3. Faculties
create table faculties (
    id uuid primary key default uuid_generate_v4(),
    institution_id uuid not null references institutions(id) on delete cascade,
    campus_id uuid not null references campuses(id) on delete cascade,
    name text not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 4. Courses
create table courses (
    id uuid primary key default uuid_generate_v4(),
    institution_id uuid not null references institutions(id) on delete cascade,
    faculty_id uuid not null references faculties(id) on delete cascade,
    name text not null,
    code text not null,
    requirements jsonb default '{}'::jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 5. Evaluation Criteria
create table evaluation_criteria (
    id uuid primary key default uuid_generate_v4(),
    institution_id uuid not null references institutions(id) on delete cascade,
    course_id uuid not null references courses(id) on delete cascade,
    criteria jsonb not null,
    weighting jsonb default '{}'::jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 6. Applications
create table applications (
    id uuid primary key default uuid_generate_v4(),
    institution_id uuid not null references institutions(id) on delete cascade,
    course_id uuid not null references courses(id) on delete cascade,
    applicant_id uuid not null, -- References auth.users(id) ideally, but keeping loose for now or strict if users exist
    status text not null default 'pending', -- pending, review, accepted, rejected
    personal_info jsonb default '{}'::jsonb,
    academic_info jsonb default '{}'::jsonb,
    rag_summary jsonb,
    ai_score numeric,
    ai_decision text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 7. Application Documents
create table application_documents (
    id uuid primary key default uuid_generate_v4(),
    institution_id uuid not null references institutions(id) on delete cascade,
    application_id uuid not null references applications(id) on delete cascade,
    document_type text not null,
    file_url text not null,
    uploaded_at timestamptz default now()
);

-- ENABLE RLS
alter table institutions enable row level security;
alter table campuses enable row level security;
alter table faculties enable row level security;
alter table courses enable row level security;
alter table evaluation_criteria enable row level security;
alter table applications enable row level security;
alter table application_documents enable row level security;

-- RLS POLICIES
-- Helper function to get current institution_id from JWT
create or replace function current_institution_id() returns uuid as $$
begin
  return (auth.jwt() ->> 'institution_id')::uuid;
end;
$$ language plpgsql stable;

-- Generic Tenant Isolation Policy
-- We apply this to all tables that have institution_id

-- Institutions: Users can view their own institution
create policy "View own institution" on institutions
    for select using (id = current_institution_id());

-- Campuses
create policy "View own campuses" on campuses
    for select using (institution_id = current_institution_id());

-- Faculties
create policy "View own faculties" on faculties
    for select using (institution_id = current_institution_id());

-- Courses
create policy "View own courses" on courses
    for select using (institution_id = current_institution_id());

-- Evaluation Criteria
create policy "View own criteria" on evaluation_criteria
    for select using (institution_id = current_institution_id());

-- Applications
-- Applicants can see their own applications
create policy "View own applications" on applications
    for select using (
        institution_id = current_institution_id() 
        OR 
        applicant_id = auth.uid()
    );

-- Staff (with institution_id) can view all applications for their institution
-- Note: The above OR clause covers the institution check if the staff has the claim.
-- But we might want to be explicit about insert/update.

create policy "Create applications" on applications
    for insert with check (
        -- Allow if it matches the token's institution (staff) OR if it's the user applying (might not have institution_id in JWT yet if they are just a public user? 
        -- User said "Each JWT issued to a user/agent includes their institution_id." 
        -- So we assume even applicants are scoped to an institution context when they log in? 
        -- Or maybe applicants are global users. 
        -- For now, let's assume strict tenant isolation as requested: "Each JWT... includes their institution_id"
        institution_id = current_institution_id()
    );

-- Application Documents
create policy "View own documents" on application_documents
    for select using (institution_id = current_institution_id());

create policy "Upload documents" on application_documents
    for insert with check (institution_id = current_institution_id());

