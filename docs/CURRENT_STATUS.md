# CURRENT_STATUS.md

> 목적: `/clear` 이후에도 이전 작업을 빠르게 재개하기 위한 **짧은 스냅샷** (append 금지, 매번 덮어쓰기)

## 1) 세션 스냅샷
- 마지막 업데이트: 2026-03-15 (KST)
- 현재 단계: 탭명·디렉토리·content_type 정렬 완료 (`feature/knowledge-graph` 브랜치)
- 전체 진행도(대략): 100% (빌드 성공)

## 2) 지금 기준 핵심 결정 (최대 5개)
- 인프라: Cloudflare(도메인/DNS/CDN) + Vercel(배포+SSL) + GitHub
- 도메인: `terry.artlab.ai` (Namecheap CNAME → cname.vercel-dns.com)
- 스택: Next.js 15.5 (App Router) + TypeScript + Tailwind CSS v4 + next-mdx-remote v6
- AI Memory: 글번호(`post_number`) + `ai_summary` + `relations` + `concept_index` + `taxonomy` → `posts/index.json`
- content_type 완전 정렬: `papers`/`notes`/`tech`/`essays` = 탭 슬러그 = 디렉토리명

## 3) 완료됨
- [x] v1 전체 기능 (스캐폴딩~ForceVLA 포스팅~UI 개선)
- [x] AI Memory 시스템: `PostMeta` 타입 확장, `generate-index.mjs` 스크립트
- [x] Research #6~#11 포스팅 (arXiv + Nature Communications)
- [x] 포스팅 자동화: `.claude/commands/post.md` 슬래시 커맨드 + `scripts/extract-paper-pdf.py`
- [x] 리팩토링: 웹 포스팅 UI/API 제거, Container 컴포넌트, display.ts 헬퍼, TagItem 단일화
- [x] Knowledge Graph Phase 1~3 (taxonomy, clusters, RelatedPapers, TaxonomyFilter)
- [x] 탭명·디렉토리·content_type 완전 정렬:
  - `posts/research/` → `posts/papers/`, `posts/idea/` → `posts/tech/`, `posts/essay/` → `posts/essays/`
  - content_type: `reading`→`papers`, `writing`→`tech`, `essay`→`essays`
  - TAB_CONFIG, tags.json, dictionaries, ContentDetailPage, ContentCard 모두 정렬

## 4) 진행 중 / 막힘
- `feature/knowledge-graph` 브랜치 작업 중 (main에 미병합)

## 5) 다음 3개 작업 (우선순위)
1. `feature/knowledge-graph` → main PR 생성 + 병합
2. 새 포스팅 시 `/post <arXiv URL>` 커맨드 사용 (Graph Analysis 단계 포함)
3. 기타 신규 콘텐츠 추가

## 6) 검증 상태 (요약)
- 빌드: 성공 (2026-03-15, feature/knowledge-graph)
- TypeScript: 에러 없음
- `posts/index.json`: 11개 포스트, 3 clusters, 3 bridge papers, 1 outlier

## 7) 컨텍스트 메모 (다음 세션용)
- `/post <url>` 슬래시 커맨드: `.claude/commands/post.md` (Step 3에 Graph Analysis 추가)
- dev 서버: Turbopack 사용 중 — `⚠ Webpack is configured` 경고는 무해함
- Container 컴포넌트: `src/components/ui/Container.tsx` (max-w-4xl 기본)
- 공유 헬퍼: `src/lib/display.ts` (getDisplayTags, formatPostDate)
- Taxonomy 파일: `posts/taxonomy.json` (robotics/*, ai/* 계층)
- Graph 데이터: `posts/index.json` → knowledge_graph.clusters, taxonomy_stats
- 디렉토리: `posts/papers/`, `posts/tech/`, `posts/essays/`, `posts/notes/`
