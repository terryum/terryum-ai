# CURRENT_STATUS.md

> 목적: `/clear` 이후에도 이전 작업을 빠르게 재개하기 위한 **짧은 스냅샷** (append 금지, 매번 덮어쓰기)

## 1) 세션 스냅샷
- 마지막 업데이트: 2026-03-14 (KST)
- 현재 단계: 포스팅 파이프라인 개선 완료 (PDF fallback 자동화 + status 기본값 published)
- 전체 진행도(대략): 100% (v1 기능 완료 + 포스팅 자동화)

## 2) 지금 기준 핵심 결정 (최대 5개)
- 인프라: Cloudflare(도메인/DNS/CDN) + Vercel(배포+SSL) + GitHub
- 도메인: `terry.artlab.ai` (Namecheap CNAME → cname.vercel-dns.com)
- 스택: Next.js 15.5 (App Router) + TypeScript + Tailwind CSS v4 + next-mdx-remote v6
- AI Memory: 글번호(`post_number`) + `ai_summary` + `relations` + `concept_index` → `posts/index.json`
- 태그 이중 구조: `tags`(자동, 내부 색인) + `display_tags`(수동 큐레이션, UI 노출)

## 3) 완료됨
- [x] v1 전체 기능 (스캐폴딩~ForceVLA 포스팅~UI 개선)
- [x] AI Memory 시스템: `PostMeta` 타입 확장, `generate-index.mjs` 스크립트
- [x] Research #6~#11 포스팅 (arXiv + Nature Communications)
- [x] Research Notes 6가지 이슈 수정
- [x] 포스팅 자동화:
  - `.claude/commands/post.md` — `/post <url>` 슬래시 커맨드 (status 기본값 published)
  - `scripts/extract-paper-pdf.py` — PDF fallback 자동화 (pymupdf + pypdf, fig-N rename + report)
  - AdminBar Post 탭 제거 (커맨드로만 포스팅)

## 4) 진행 중 / 막힘
- 특이사항 없음

## 5) 다음 3개 작업 (우선순위)
1. 새 포스팅 시 `/post <arXiv URL>` 커맨드 사용 (개선된 파이프라인)
2. 기존 포스트 meta.json에 `source_date`, `display_tags` 추가
3. 기타 신규 콘텐츠 추가

## 6) 검증 상태 (요약)
- 빌드: 성공 (2026-03-13)
- `posts/index.json`: 10개 포스트
- Admin Post UI: `/ko/admin/post`, `/en/admin/post`

## 7) 컨텍스트 메모 (다음 세션용)
- `/post <url>` 슬래시 커맨드: `.claude/commands/post.md`
- GitHub Actions 워크플로우: `.github/workflows/create-post.yml`
- Admin Post API: `POST /api/admin/post` → workflow_dispatch → 폴링 `GET /api/admin/post/status?runId=xxx`
- dev 서버: Turbopack 사용 중 — `⚠ Webpack is configured` 경고는 무해함
