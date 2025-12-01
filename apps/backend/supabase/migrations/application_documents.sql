create table if not exists application_documents (
    id uuid primary key default gen_random_uuid(),
    application_id uuid not null references applications(id) on delete cascade,

    file_url text not null,
    document_type text not null,  -- e.g., 'ID', 'NSC Certificate', 'Proof of Residence', etc.

    uploaded_at timestamp with time zone default now()
);

create index if not exists idx_appdocs_appid on application_documents (application_id);
