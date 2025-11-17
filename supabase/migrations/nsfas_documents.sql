create table if not exists nsfas_documents (
    id uuid primary key default gen_random_uuid(),
    nsfas_application_id uuid not null references nsfas_applications(id) on delete cascade,

    file_url text not null,
    document_type text not null, -- e.g. "Consent Form", "Parent ID", "Payslip"

    uploaded_at timestamp with time zone default now()
);

create index if not exists idx_nsfasdocs_appid on nsfas_documents (nsfas_application_id);
