-- ============================================================================
-- Migration: 030_fulltext_search.sql
-- Description: Add PostgreSQL full-text search capability to rag_embeddings
--              for BM25-style keyword search with <100ms latency target
-- Created: 2026-01-20
-- ============================================================================

-- ============================================================================
-- SECTION 1: ADD TSVECTOR COLUMN FOR FULL-TEXT SEARCH
-- ============================================================================

-- Add tsvector column with auto-generation from chunk content
-- Uses 'english' dictionary for stemming and stopword removal
ALTER TABLE public.rag_embeddings
  ADD COLUMN IF NOT EXISTS content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', COALESCE(chunk, ''))) STORED;

-- ============================================================================
-- SECTION 2: CREATE GIN INDEX FOR FAST TEXT SEARCH
-- ============================================================================

-- GIN (Generalized Inverted Index) is optimal for full-text search
-- Provides fast lookups for tsvector @@ tsquery operations
CREATE INDEX IF NOT EXISTS idx_rag_content_tsv
  ON public.rag_embeddings USING GIN(content_tsv);

-- Composite index for institution-scoped full-text search
CREATE INDEX IF NOT EXISTS idx_rag_content_tsv_institution
  ON public.rag_embeddings USING GIN(content_tsv)
  WHERE institution_id IS NOT NULL;

-- ============================================================================
-- SECTION 3: CREATE KEYWORD SEARCH FUNCTION
-- ============================================================================

-- policy_keyword_search: BM25-like ranking using ts_rank_cd
-- ts_rank_cd uses cover density ranking which considers proximity of lexemes
CREATE OR REPLACE FUNCTION public.policy_keyword_search(
  search_query TEXT,
  max_results INT DEFAULT 5,
  filter_institution_id UUID DEFAULT NULL,
  filter_source TEXT DEFAULT NULL
) RETURNS TABLE(
  id UUID,
  chunk TEXT,
  source TEXT,
  metadata JSONB,
  rank FLOAT,
  headline TEXT
) AS $$
DECLARE
  ts_query tsquery;
BEGIN
  -- Convert search query to tsquery using websearch syntax
  -- websearch_to_tsquery handles phrases, OR/AND operators naturally
  ts_query := websearch_to_tsquery('english', search_query);

  -- Return empty if query produces no valid tsquery
  IF ts_query IS NULL OR ts_query = ''::tsquery THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    re.id,
    re.chunk,
    re.source,
    re.metadata,
    -- ts_rank_cd: cover density ranking (considers term proximity)
    -- Normalization: 1 = divides rank by 1 + log(doc length)
    ts_rank_cd(re.content_tsv, ts_query, 1) AS rank,
    -- Generate headline with matched terms highlighted
    ts_headline(
      'english',
      re.chunk,
      ts_query,
      'StartSel=**,StopSel=**,MaxWords=50,MinWords=20,MaxFragments=2'
    ) AS headline
  FROM public.rag_embeddings re
  WHERE re.content_tsv @@ ts_query
    AND (filter_institution_id IS NULL OR re.institution_id = filter_institution_id)
    AND (filter_source IS NULL OR re.source = filter_source)
  ORDER BY rank DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- SECTION 4: CREATE HYBRID SEARCH FUNCTION
-- ============================================================================

-- policy_hybrid_search: Combines keyword and semantic search results
-- Uses Reciprocal Rank Fusion (RRF) for result merging
CREATE OR REPLACE FUNCTION public.policy_hybrid_search(
  search_query TEXT,
  query_embedding vector(1536),
  max_results INT DEFAULT 5,
  filter_institution_id UUID DEFAULT NULL,
  keyword_weight FLOAT DEFAULT 0.5,
  semantic_weight FLOAT DEFAULT 0.5
) RETURNS TABLE(
  id UUID,
  chunk TEXT,
  source TEXT,
  metadata JSONB,
  combined_score FLOAT,
  keyword_rank FLOAT,
  semantic_similarity FLOAT
) AS $$
DECLARE
  ts_query tsquery;
  k CONSTANT INT := 60; -- RRF constant
BEGIN
  ts_query := websearch_to_tsquery('english', search_query);

  RETURN QUERY
  WITH keyword_results AS (
    -- Keyword search with BM25-style ranking
    SELECT
      re.id,
      re.chunk,
      re.source,
      re.metadata,
      ts_rank_cd(re.content_tsv, ts_query, 1) AS kw_rank,
      ROW_NUMBER() OVER (ORDER BY ts_rank_cd(re.content_tsv, ts_query, 1) DESC) AS kw_position
    FROM public.rag_embeddings re
    WHERE re.content_tsv @@ ts_query
      AND (filter_institution_id IS NULL OR re.institution_id = filter_institution_id)
    LIMIT max_results * 2
  ),
  semantic_results AS (
    -- Semantic search with cosine similarity
    SELECT
      re.id,
      re.chunk,
      re.source,
      re.metadata,
      1 - (re.embedding <=> query_embedding) AS sem_similarity,
      ROW_NUMBER() OVER (ORDER BY re.embedding <=> query_embedding) AS sem_position
    FROM public.rag_embeddings re
    WHERE (filter_institution_id IS NULL OR re.institution_id = filter_institution_id)
    ORDER BY re.embedding <=> query_embedding
    LIMIT max_results * 2
  ),
  combined AS (
    -- Merge results using Reciprocal Rank Fusion
    SELECT
      COALESCE(kw.id, sem.id) AS id,
      COALESCE(kw.chunk, sem.chunk) AS chunk,
      COALESCE(kw.source, sem.source) AS source,
      COALESCE(kw.metadata, sem.metadata) AS metadata,
      COALESCE(kw.kw_rank, 0) AS keyword_rank,
      COALESCE(sem.sem_similarity, 0) AS semantic_similarity,
      -- RRF score: 1/(k + position) for each result set
      (
        keyword_weight * COALESCE(1.0 / (k + kw.kw_position), 0) +
        semantic_weight * COALESCE(1.0 / (k + sem.sem_position), 0)
      ) AS rrf_score
    FROM keyword_results kw
    FULL OUTER JOIN semantic_results sem ON kw.id = sem.id
  )
  SELECT
    c.id,
    c.chunk,
    c.source,
    c.metadata,
    c.rrf_score AS combined_score,
    c.keyword_rank,
    c.semantic_similarity
  FROM combined c
  ORDER BY c.rrf_score DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- SECTION 5: CREATE SEARCH METRICS VIEW
-- ============================================================================

-- View for monitoring full-text search coverage
CREATE OR REPLACE VIEW public.rag_search_stats AS
SELECT
  COUNT(*) AS total_embeddings,
  COUNT(*) FILTER (WHERE content_tsv IS NOT NULL) AS indexed_for_fts,
  COUNT(DISTINCT source) AS unique_sources,
  COUNT(DISTINCT institution_id) AS unique_institutions,
  AVG(array_length(tsvector_to_array(content_tsv), 1)) AS avg_terms_per_doc
FROM public.rag_embeddings;

-- ============================================================================
-- SECTION 6: GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant execute on new functions
GRANT EXECUTE ON FUNCTION public.policy_keyword_search TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.policy_hybrid_search TO authenticated, service_role;

-- Grant select on stats view
GRANT SELECT ON public.rag_search_stats TO authenticated, service_role;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN public.rag_embeddings.content_tsv IS
  'Auto-generated tsvector for full-text search using English dictionary';

COMMENT ON FUNCTION public.policy_keyword_search IS
  'BM25-style keyword search with ts_rank_cd scoring. Target latency <100ms.';

COMMENT ON FUNCTION public.policy_hybrid_search IS
  'Combines keyword (BM25) and semantic (cosine) search using Reciprocal Rank Fusion.';

COMMENT ON VIEW public.rag_search_stats IS
  'Monitoring view for full-text search coverage and indexing status.';
