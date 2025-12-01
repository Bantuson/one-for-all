create table if not exists applications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references user_accounts(id) on delete cascade,

    university_name text not null,
    faculty text,
    qualification_type text,
    program text,
    year int,

    personal_info jsonb not null,
    academic_info jsonb not null,
    rag_summary jsonb,
    submission_payload jsonb,

    status text default 'submitted',
    status_history jsonb default '[]'::jsonb,

    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

create index if not exists idx_applications_user on applications (user_id);
create index if not exists idx_applications_university on applications (university_name);
