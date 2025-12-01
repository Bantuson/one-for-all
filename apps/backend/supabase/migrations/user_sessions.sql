create table if not exists user_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references user_accounts(id) on delete cascade,
    session_token text unique not null,
    expires_at timestamp with time zone not null,
    created_at timestamp with time zone default now()
);

-- Index for fast session lookup
create index if not exists idx_user_sessions_user on user_sessions (user_id);
create index if not exists idx_user_sessions_expiry on user_sessions (expires_at);
