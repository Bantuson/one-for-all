-- Enable pgvector extension
create extension if not exists vector;

-- Create RPC function for vector similarity search
create or replace function match_rag_embeddings(
  query_embedding vector(1536),
  match_count int default 5
)
returns table (
  id uuid,
  similarity float4,
  metadata jsonb,
  source text,
  chunk text
)
language plpgsql
as $$
begin
  return query
  select
    e.id,
    1 - (e.embedding <=> query_embedding) as similarity,
    e.metadata,
    e.source,
    e.chunk
  from rag_embeddings e
  order by e.embedding <=> query_embedding  -- cosine distance
  limit match_count;
end;
$$;
