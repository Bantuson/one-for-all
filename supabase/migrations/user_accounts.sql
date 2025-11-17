create table if not exists user_accounts (
    id uuid primary key default gen_random_uuid(),
    username text unique not null,
    email text unique not null,
    cellphone text unique not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Indexes
create index if not exists idx_user_accounts_username on user_accounts (username);
create index if not exists idx_user_accounts_email on user_accounts (email);
create index if not exists idx_user_accounts_cellphone on user_accounts (cellphone);
