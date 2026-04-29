-- ============================================================
-- KG semantic search: paper_embeddings (008)
-- Separate from papers.embedding (003) — that one feeds homepage FTS hybrid;
-- this one is owned by terry-papers KG and tracks builder/model versions so
-- the whole table can be re-embedded on a single trigger (model deprecate,
-- builder schema change). Dataset is ≤500 per cluster by policy.
-- ============================================================

CREATE TABLE IF NOT EXISTS paper_embeddings (
  slug              text         PRIMARY KEY REFERENCES papers(slug) ON DELETE CASCADE,
  cluster           text         NOT NULL DEFAULT 'main',
  content_hash      text         NOT NULL,
  embedding_model   text         NOT NULL DEFAULT 'text-embedding-3-small',
  builder_version   text         NOT NULL DEFAULT 'v1',
  embedding         vector(1536),
  embedded_text     text,
  updated_at        timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS paper_embeddings_hnsw
  ON paper_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 128);

CREATE INDEX IF NOT EXISTS paper_embeddings_cluster_idx
  ON paper_embeddings (cluster);
