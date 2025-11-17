create table if not exists nsfas_applications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references user_accounts(id) on delete cascade,

    -- Reused data (from university application)
    personal_info jsonb not null,
    academic_info jsonb not null,

    -- NSFAS-specific
    guardian_info jsonb,
    household_info jsonb,
    income_info jsonb,
    bank_details jsonb,
    living_situation text,

    status text default 'submitted',
    status_history jsonb default '[]'::jsonb,

    submission_payload jsonb,

    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

create index if not exists idx_nsfas_user on nsfas_applications (user_id);
