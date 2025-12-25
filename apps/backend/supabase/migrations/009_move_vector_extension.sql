-- Migration: 009_move_vector_extension
-- Description: Move pgvector extension from public schema to extensions schema
-- Purpose: Address Supabase Advisor security warning about extensions in public schema
-- Prerequisite: rag_embeddings table is EMPTY (no data loss expected)
-- Created: 2025-12-24

-- ============================================================================
-- STEP 1: CREATE EXTENSIONS SCHEMA
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS extensions;

GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- ============================================================================
-- STEP 2: DROP DEPENDENT OBJECTS (in reverse dependency order)
-- ============================================================================

-- Drop the match_rag_embeddings function (depends on vector type)
DROP FUNCTION IF EXISTS public.match_rag_embeddings(vector(1536), float, integer, uuid);

-- Drop the vector index (depends on vector operators)
DROP INDEX IF EXISTS public.idx_rag_embeddings_vector;

-- Drop the rag_embeddings table (depends on vector type)
DROP TABLE IF EXISTS public.rag_embeddings;

-- ============================================================================
-- STEP 3: DROP AND RECREATE EXTENSION IN NEW SCHEMA
-- ============================================================================

DROP EXTENSION IF EXISTS vector;

CREATE EXTENSION vector WITH SCHEMA extensions;

-- ============================================================================
-- STEP 4: UPDATE SEARCH PATH FOR VECTOR TYPES
-- ============================================================================

ALTER DATABASE postgres SET search_path TO public, extensions;

SET search_path TO public, extensions;

-- ============================================================================
-- STEP 5: RECREATE DEPENDENT OBJECTS
-- ============================================================================

-- Recreate rag_embeddings table
CREATE TABLE IF NOT EXISTS public.rag_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    embedding vector(1536) NOT NULL,
    metadata JSONB,
    source TEXT,
    chunk TEXT,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recreate vector index
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_vector
    ON public.rag_embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Recreate supporting indexes
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_source
    ON public.rag_embeddings(source);
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_institution_id
    ON public.rag_embeddings(institution_id);

-- Recreate match_rag_embeddings function
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
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT
        re.id,
        re.source,
        re.chunk,
        re.content,
        re.metadata,
        1 - (re.embedding <=> query_embedding) AS similarity
    FROM public.rag_embeddings re
    WHERE (filter_institution_id IS NULL OR re.institution_id = filter_institution_id)
    AND 1 - (re.embedding <=> query_embedding) > match_threshold
    ORDER BY re.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================================================
-- STEP 6: RE-ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.rag_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to rag_embeddings" ON public.rag_embeddings
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- STEP 7: GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rag_embeddings TO service_role;
GRANT EXECUTE ON FUNCTION public.match_rag_embeddings(vector(1536), float, integer, uuid) TO authenticated, service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON SCHEMA extensions IS 'Schema for PostgreSQL extensions (security best practice)';
COMMENT ON TABLE public.rag_embeddings IS 'Vector embeddings for RAG-based course search';
COMMENT ON FUNCTION public.match_rag_embeddings IS 'Find similar embeddings using cosine similarity';
