create table if not exists rag_embeddings (
    id uuid primary key default gen_random_uuid(),

    -- pgvector dimension can be 512, 768, or 1536 depending on model
    embedding vector(1536) not null,

    metadata jsonb,
    source text,                      -- e.g., "UCT", "Wits", "UP"
    chunk text,                       -- original text chunk

    created_at timestamp with time zone default now()
);

-- Vector index for ANN search
create index if not exists idx_rag_embeddings_vector
on rag_embeddings
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Optional: filter by university
create index if not exists idx_rag_embeddings_source on rag_embeddings (source);
