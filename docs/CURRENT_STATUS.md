# CURRENT_STATUS.md

> 목적: `/clear` 이후에도 이전 작업을 빠르게 재개하기 위한 **짧은 스냅샷** (append 금지, 매번 덮어쓰기)

## 1) 세션 스냅샷
- 마지막 업데이트: 2026-03-11 (KST)
- 현재 단계: Research Notes 6가지 이슈 수정 완료
- 전체 진행도(대략): 100% (v1 기능 완료 + 지속 개선)

## 2) 지금 기준 핵심 결정 (최대 5개)
- 인프라: Cloudflare(도메인/DNS/CDN) + Vercel(배포+SSL) + GitHub
- 도메인: `terry.artlab.ai` (Namecheap CNAME → cname.vercel-dns.com)
- 스택: Next.js 15.5 (App Router) + TypeScript + Tailwind CSS v4 + next-mdx-remote v6
- AI Memory: 글번호(`post_number`) + `ai_summary` + `relations` + `concept_index` → `posts/index.json`
- 태그 이중 구조: `tags`(자동, 내부 색인) + `display_tags`(수동 큐레이션, UI 노출)

## 3) 완료됨
- [x] v1 전체 기능 (스캐폴딩~ForceVLA 포스팅~UI 개선)
- [x] AI Memory 시스템: `PostMeta` 타입 확장, `generate-index.mjs` 스크립트
- [x] Research #6~#10 포스팅 (arXiv + Nature Communications)
- [x] Research Notes 6가지 이슈 수정:
  - 정렬 tiebreaker (post_number 내림차순)
  - 날짜 표시 폴백 (source_date 없으면 published_at)
  - display_tags 필드 추가 (PostMeta 타입, normalizeMeta, ContentCard, FilterablePostList)
  - 탭 전환 시 태그 초기화 (useRef + useEffect)
  - docs 재편: POST_LOADING_ARXIV.md, POST_LOADING_ETC.md 추가

## 4) 진행 중 / 막힘
- 막힘/리스크: 없음

## 5) 다음 3개 작업 (우선순위)
1. 기존 포스트 meta.json에 `source_date`, `display_tags` 추가
2. Essays 탭 첫 포스트 작성

## 6) 검증 상태 (요약)
- 빌드: 성공 (2026-03-11)
- `posts/index.json`: 10개 포스트
- display_tags 없는 기존 포스트는 tags fallback (하위 호환)

## 7) 컨텍스트 메모 (다음 세션용)
- AI Memory 필드: `post_number`, `domain`, `subfields`, `key_concepts`, `methodology`, `contribution_type`, `relations`, `ai_summary`, `idea_status`, `related_posts`
- 인덱스 스크립트: `scripts/generate-index.mjs` — 모든 meta.json → `posts/index.json`
- 로딩 가이드 분리: `docs/POST_LOADING_ARXIV.md` (arXiv), `docs/POST_LOADING_ETC.md` (비-arXiv)
- `published_at`은 실제 시각(`new Date().toISOString()`)으로 설정해야 동일 날짜 내 정렬 보장
- dev 서버: Turbopack 사용 중 — `⚠ Webpack is configured` 경고는 무해함
