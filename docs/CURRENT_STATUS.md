# CURRENT_STATUS.md

> 목적: `/clear` 이후에도 이전 작업을 빠르게 재개하기 위한 **짧은 스냅샷** (append 금지, 매번 덮어쓰기)

## 1) 세션 스냅샷
- 마지막 업데이트: 2026-03-03 (KST)
- 현재 단계: 구현 완료 → 검증/배포준비
- 이번 세션 목표: v1 전체 구현 (처음부터)
- 전체 진행도(대략): 85%

## 2) 지금 기준 핵심 결정 (최대 5개)
- 인프라: Cloudflare + Vercel + GitHub
- 스택: Next.js 15.5 (App Router) + TypeScript + Tailwind CSS v4 + next-mdx-remote v5
- 콘텐츠 구조: `posts/<slug>/ko.mdx`, `en.mdx`, `cover.webp`
- Write/Read: 공용 템플릿 (ContentIndexPage, ContentDetailPage, ContentCard)
- i18n: `[lang]` 동적 세그먼트 + middleware + localStorage/cookie

## 3) 완료됨
- [x] 프로젝트 스캐폴딩 (package.json, tsconfig, tailwind, postcss)
- [x] 더미 콘텐츠 생성 (writing 2개 + reading 3개 + profile placeholder)
- [x] i18n 라우팅 (middleware, LanguageSwitcher, dictionaries)
- [x] 콘텐츠 파이프라인 (posts.ts, mdx.ts, 타입 정의)
- [x] 레이아웃 & 네비게이션 (Header, Footer, MobileNav)
- [x] 공용 목록/상세 템플릿 (7개 컴포넌트)
- [x] Home & About 페이지
- [x] SEO (sitemap, robots, 메타데이터), 빌드 성공 (26페이지 SSG)

## 4) 진행 중 / 막힘
- 진행 중: 없음 (코드 구현 완료)
- 막힘/리스크: 없음
- 필요한 결정: Vercel 배포 시점 (사용자 결정)

## 5) 다음 3개 작업 (우선순위)
1. `npm run dev`로 로컬 전체 수동 테스트
2. GitHub repo 생성 및 push
3. Vercel Preview 배포 확인

## 6) 검증 상태 (요약)
- 빌드/린트/테스트: **통과** (26페이지 SSG, 에러 0)
- 콘텐츠 파이프라인: 구성 완료 (prebuild 이미지 복사 동작)
- 배포(Preview/Prod): 준비전 (로컬만 확인)

## 7) 컨텍스트 메모 (다음 세션용)
- 이번 세션에서 꼭 유지할 규칙:
  1. 기존 포스트 수정/삭제 금지
  2. 더미 포스트는 `sample-` 접두사로 구분
  3. public/posts/는 gitignore에 추가 (prebuild로 자동 생성)
- 다음 세션 시작 시 먼저 읽을 문서:
  - `docs/CURRENT_STATUS.md`
  - `docs/CLAUDE_BUILD_RULES.md`
