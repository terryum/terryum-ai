# CURRENT_STATUS.md

> 목적: `/clear` 이후에도 이전 작업을 빠르게 재개하기 위한 **짧은 스냅샷** (append 금지, 매번 덮어쓰기)

## 1) 세션 스냅샷
- 마지막 업데이트: 2026-03-18 (KST)
- 현재 단계: Papers 포스트 제목 일관성 + 메타데이터 정비 완료 (빌드 검증 완료)
- 전체 진행도(대략): 100%

## 2) 지금 기준 핵심 결정 (최대 5개)
- 인프라: Cloudflare(도메인/DNS/CDN) + Vercel(배포+SSL) + GitHub
- 도메인: `terry.artlab.ai` (Namecheap CNAME → cname.vercel-dns.com)
- 스택: Next.js 15.5 (App Router) + TypeScript + Tailwind CSS v4 + next-mdx-remote v6
- AI Memory: 글번호(`post_number`) + `ai_summary` + `relations` + `concept_index` + `taxonomy` → `posts/index.json`
- content_type 완전 정렬: `papers`/`notes`/`tech`/`essays` = 탭 슬러그 = 디렉토리명

## 3) 완료됨
- [x] v1 전체 기능 (스캐폴딩~ForceVLA 포스팅~UI 개선)
- [x] AI Memory 시스템, Research 포스팅 자동화, Social Media v2
- [x] OG 이미지 수정 + 소셜봇 허용 (robots.ts, /posts/[slug] AutoRedirect)
- [x] GA4 Analytics 대시보드 확장
- [x] **Papers 포스트 제목 일관성 + 메타데이터 정비**:
  - 10개 포스트 ko/en 제목 → `키워드: 핵심 설명` 형식으로 통일
  - PP-Tac: `source_title`, `source_authors_full`, `source_project_url` 추가
  - `first_author_scholar_url` → `google_scholar_url` 필드명 전체 통일 (meta.json + docs)
  - DexUMI/ExoStart/DEXOP에 누락된 `google_scholar_url` 추가
  - 레거시 `posts/idea/`, `posts/research/` 삭제
  - `next.config.ts` 리다이렉트: `tab=research`→`tab=papers`, `tab=ideas`→`tab=tech`
  - `post.md` R8에 필수 meta.json 필드 목록 추가

## 4) 진행 중 / 막힘
- 없음 (코드 구현 완료)

## 5) 다음 3개 작업 (우선순위)
1. **배포**: 변경사항 Vercel 배포 후 전체 포스트 페이지 제목 표시 확인
2. **GA4 실시간 확인**: analytics.google.com 실시간 보고서에서 접속자 확인
3. **Admin Stats 대시보드 검증**: `/admin` 로그인 → Stats → 7d/30d/90d 전환 확인

## 6) 검증 상태 (요약)
- 빌드: TypeScript OK (2026-03-18 기준)
- `npm run build` 성공 확인 (46 pages, 12 posts)
- `posts/index.json` 재생성 완료 — 12개 포스트 title_en/title_ko 정상

## 7) 컨텍스트 메모 (다음 세션용)
- 빌드 시 SSL 인증서 이슈 (Google Fonts) → `NODE_TLS_REJECT_UNAUTHORIZED=0`으로 우회 필요할 수 있음
- recharts + @vercel/speed-insights 이번 세션에서 설치됨
- dev 서버: Turbopack 사용 중 (`npm run dev`, 포트 3040)
