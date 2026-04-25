-- ============================================================
-- Paper search RPC (004): vector similarity for /paper-search anchor lookup
-- ============================================================
-- Used by .claude/skills/paper-search to find the embedding-nearest
-- paper(s) for a user's query. Returns enough fields for the skill to
-- run BFS over knowledge-index.json without a second round-trip.

CREATE OR REPLACE FUNCTION search_papers_vector(
  query_embedding vector(1536),
  match_count int DEFAULT 5
)
RETURNS TABLE (
  slug text,
  title_ko text,
  title_en text,
  domain text,
  taxonomy_primary text,
  key_concepts text[],
  similarity real
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.slug,
    p.title_ko,
    p.title_en,
    p.domain,
    p.taxonomy_primary,
    p.key_concepts,
    (1 - (p.embedding <=> query_embedding))::real AS similarity
  FROM papers p
  WHERE p.embedding IS NOT NULL
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
$$;

COMMENT ON FUNCTION search_papers_vector(vector, int) IS
  'Returns top-K papers by cosine similarity to query embedding. Used as the anchor step of /paper-search GraphRAG-lite flow before BFS over knowledge-index.json edges.';

-- Hybrid RPC: vector + FTS via Reciprocal Rank Fusion (RRF).
-- Keeps weights tunable from the caller without touching the function.
CREATE OR REPLACE FUNCTION search_papers_hybrid(
  query_text text,
  query_embedding vector(1536),
  query_lang text DEFAULT 'ko',
  match_count int DEFAULT 10,
  rrf_k int DEFAULT 60
)
RETURNS TABLE (
  slug text,
  title_ko text,
  title_en text,
  domain text,
  taxonomy_primary text,
  key_concepts text[],
  vector_rank int,
  fts_rank int,
  rrf_score real
)
LANGUAGE sql STABLE
AS $$
  WITH vec AS (
    SELECT p.slug, row_number() OVER (ORDER BY p.embedding <=> query_embedding) AS rnk
    FROM papers p
    WHERE p.embedding IS NOT NULL
    ORDER BY p.embedding <=> query_embedding
    LIMIT match_count * 4
  ),
  fts AS (
    SELECT p.slug,
      row_number() OVER (
        ORDER BY CASE WHEN query_lang = 'ko'
          THEN ts_rank_cd(p.fts_ko, plainto_tsquery('simple', query_text))
          ELSE ts_rank_cd(p.fts_en, plainto_tsquery('english', query_text))
        END DESC
      ) AS rnk
    FROM papers p
    WHERE CASE WHEN query_lang = 'ko'
        THEN p.fts_ko @@ plainto_tsquery('simple', query_text)
        ELSE p.fts_en @@ plainto_tsquery('english', query_text)
      END
    LIMIT match_count * 4
  ),
  combined AS (
    SELECT
      coalesce(v.slug, f.slug) AS slug,
      v.rnk AS vector_rank,
      f.rnk AS fts_rank,
      (
        coalesce(1.0 / (rrf_k + v.rnk), 0) +
        coalesce(1.0 / (rrf_k + f.rnk), 0)
      )::real AS rrf_score
    FROM vec v
    FULL OUTER JOIN fts f ON v.slug = f.slug
  )
  SELECT
    p.slug,
    p.title_ko,
    p.title_en,
    p.domain,
    p.taxonomy_primary,
    p.key_concepts,
    c.vector_rank::int,
    c.fts_rank::int,
    c.rrf_score
  FROM combined c
  JOIN papers p ON p.slug = c.slug
  ORDER BY c.rrf_score DESC
  LIMIT match_count;
$$;

COMMENT ON FUNCTION search_papers_hybrid(text, vector, text, int, int) IS
  'Hybrid search via Reciprocal Rank Fusion of pgvector cosine + tsvector FTS. Used by /paper-search when query is ambiguous between semantic intent and exact terminology.';
