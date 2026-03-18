-- ============================================================
-- Paper Graph DB — Initial Schema
-- 3 tables: papers, graph_edges, node_layouts
-- ============================================================

-- papers: meta.json에서 동기화되는 논문 메타데이터
CREATE TABLE papers (
  slug TEXT PRIMARY KEY,
  title_en TEXT NOT NULL,
  title_ko TEXT NOT NULL,
  domain TEXT,
  taxonomy_primary TEXT,
  taxonomy_secondary TEXT[] DEFAULT '{}',
  key_concepts TEXT[] DEFAULT '{}',
  methodology TEXT[] DEFAULT '{}',
  contribution_type TEXT,
  source_author TEXT,
  source_date TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  meta_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- graph_edges: 논문 간 관계 (핵심 테이블)
CREATE TABLE graph_edges (
  edge_id TEXT PRIMARY KEY,
  source_slug TEXT NOT NULL REFERENCES papers(slug),
  target_slug TEXT NOT NULL REFERENCES papers(slug),
  edge_type TEXT NOT NULL,
  provenance TEXT NOT NULL DEFAULT 'auto',
  status TEXT NOT NULL DEFAULT 'suggested',
  weight REAL DEFAULT 0.5,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_slug, target_slug, edge_type)
);

-- node_layouts: React Flow 캔버스에서 노드 위치
CREATE TABLE node_layouts (
  slug TEXT NOT NULL REFERENCES papers(slug),
  view_id TEXT NOT NULL DEFAULT 'default',
  x REAL NOT NULL DEFAULT 0,
  y REAL NOT NULL DEFAULT 0,
  pinned BOOLEAN DEFAULT false,
  PRIMARY KEY (slug, view_id)
);

-- 인덱스
CREATE INDEX idx_edges_source ON graph_edges(source_slug);
CREATE INDEX idx_edges_target ON graph_edges(target_slug);
CREATE INDEX idx_edges_status ON graph_edges(status);
CREATE INDEX idx_papers_domain ON papers(domain);
CREATE INDEX idx_papers_taxonomy ON papers(taxonomy_primary);

-- ============================================================
-- RLS 정책
-- ============================================================

-- papers: 누구나 읽기, service_role만 쓰기
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "papers_read" ON papers FOR SELECT USING (true);
CREATE POLICY "papers_write" ON papers FOR ALL USING (auth.role() = 'service_role');

-- graph_edges: 누구나 읽기, service_role만 쓰기
ALTER TABLE graph_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "edges_read" ON graph_edges FOR SELECT USING (true);
CREATE POLICY "edges_write" ON graph_edges FOR ALL USING (auth.role() = 'service_role');

-- node_layouts: 동일
ALTER TABLE node_layouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "layouts_read" ON node_layouts FOR SELECT USING (true);
CREATE POLICY "layouts_write" ON node_layouts FOR ALL USING (auth.role() = 'service_role');
