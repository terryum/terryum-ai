-- ============================================================
-- Search: pgvector embeddings (003) + FTS (004)
-- pgvector is kept for future semantic search; FTS is the active search method
-- ============================================================

-- pgvector extension + embedding column (retained for future use)
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE papers ADD COLUMN IF NOT EXISTS embedding vector(1536);
CREATE INDEX IF NOT EXISTS papers_embedding_idx
  ON papers USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 128);

-- Full-text search columns (trigger-maintained)
ALTER TABLE papers ADD COLUMN IF NOT EXISTS fts_ko tsvector;
ALTER TABLE papers ADD COLUMN IF NOT EXISTS fts_en tsvector;
CREATE INDEX IF NOT EXISTS papers_fts_ko_idx ON papers USING gin(fts_ko);
CREATE INDEX IF NOT EXISTS papers_fts_en_idx ON papers USING gin(fts_en);

-- Trigger to auto-update FTS on insert/update
CREATE OR REPLACE FUNCTION papers_fts_update() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  one_liner text;
BEGIN
  one_liner := coalesce(NEW.meta_json->'ai_summary'->>'one_liner', '');
  NEW.fts_ko :=
    setweight(to_tsvector('simple', coalesce(NEW.title_ko, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.key_concepts, ' '), '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.domain, '')), 'C') ||
    setweight(to_tsvector('simple', one_liner), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.source_author, '')), 'D');
  NEW.fts_en :=
    setweight(to_tsvector('english', coalesce(NEW.title_en, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.key_concepts, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.domain, '')), 'C') ||
    setweight(to_tsvector('english', one_liner), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.source_author, '')), 'D');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER papers_fts_trigger
  BEFORE INSERT OR UPDATE ON papers
  FOR EACH ROW EXECUTE FUNCTION papers_fts_update();

-- RPC: full-text search with language routing
CREATE OR REPLACE FUNCTION search_posts_fts(
  search_query text,
  search_lang text DEFAULT 'ko',
  match_count int DEFAULT 20
)
RETURNS TABLE (
  slug text, title_ko text, title_en text,
  domain text, taxonomy_primary text, rank real
)
LANGUAGE sql STABLE
AS $$
  SELECT p.slug, p.title_ko, p.title_en, p.domain, p.taxonomy_primary,
    CASE WHEN search_lang = 'ko'
      THEN ts_rank_cd(p.fts_ko, plainto_tsquery('simple', search_query))
      ELSE ts_rank_cd(p.fts_en, plainto_tsquery('english', search_query))
    END AS rank
  FROM papers p
  WHERE CASE WHEN search_lang = 'ko'
      THEN p.fts_ko @@ plainto_tsquery('simple', search_query)
      ELSE p.fts_en @@ plainto_tsquery('english', search_query)
    END
  ORDER BY rank DESC
  LIMIT match_count;
$$;
