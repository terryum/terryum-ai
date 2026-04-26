-- ============================================================
-- Post Interactions: anonymous likes + anonymous comments
-- - post_likes: 쿠키 UUID(anon_id) × slug 토글
-- - post_comments: 익명 댓글 (이름 + 이메일 비공개 + 본문). status로 모더레이션
-- - post_comments_public: 이메일·ip_hash·status 제외한 공개 뷰
-- ============================================================

CREATE TABLE post_likes (
  post_slug TEXT NOT NULL,
  anon_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_slug, anon_id)
);
CREATE INDEX idx_post_likes_slug ON post_likes(post_slug);

CREATE TABLE post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_slug TEXT NOT NULL,
  author_name TEXT NOT NULL CHECK (length(author_name) BETWEEN 1 AND 40),
  author_email TEXT NOT NULL,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 5 AND 2000),
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','hidden','spam')),
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_post_comments_slug ON post_comments(post_slug, created_at DESC);
CREATE INDEX idx_post_comments_status ON post_comments(status);

-- RLS: 모든 쓰기는 service_role(API 라우트)을 통해서만.
-- 읽기는 view를 통해서 이메일·ip_hash 제외하고 노출.
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_likes_service_all" ON post_likes
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "post_comments_service_all" ON post_comments
  FOR ALL USING (auth.role() = 'service_role');

-- 공개 읽기 뷰 (이메일·ip_hash·hidden/spam 제외)
CREATE VIEW post_comments_public AS
  SELECT id, post_slug, author_name, content, created_at
  FROM post_comments
  WHERE status = 'visible';

GRANT SELECT ON post_comments_public TO anon;
GRANT SELECT ON post_comments_public TO authenticated;
