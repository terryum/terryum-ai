# CURRENT_STATUS.md

> 목적: `/clear` 이후에도 이전 작업을 빠르게 재개하기 위한 **짧은 스냅샷** (append 금지, 매번 덮어쓰기)

## 1) 세션 스냅샷
- 마지막 업데이트: 2026-03-04 (KST)
- 현재 단계: 첫 페이지 로딩 속도 최적화 완료
- 이번 세션 목표: 로딩 성능 최적화 (6개 병목 해결)
- 전체 진행도(대략): 92%

## 2) 지금 기준 핵심 결정 (최대 5개)
- 인프라: Cloudflare + Vercel + GitHub
- 스택: Next.js 15.5 (App Router) + TypeScript + Tailwind CSS v4 + next-mdx-remote v5
- 콘텐츠 구조: `posts/<slug>/ko.mdx`, `en.mdx`, `cover.webp`
- Ideas/Research: 공용 템플릿 (ContentIndexPage, ContentDetailPage, ContentCard)
- 다크 모드: `[data-theme="dark"]` CSS 변수 오버라이드, ThemeToggle CSS 기반 아이콘 전환

## 3) 완료됨
- [x] 프로젝트 스캐폴딩 (package.json, tsconfig, tailwind, postcss)
- [x] 더미 콘텐츠 생성 (writing 2개 + reading 3개 + profile placeholder)
- [x] i18n 라우팅 (middleware, LanguageSwitcher, dictionaries)
- [x] 콘텐츠 파이프라인 (posts.ts, mdx.ts, 타입 정의)
- [x] 레이아웃 & 네비게이션 (Header, Footer, MobileNav)
- [x] 공용 목록/상세 템플릿 (7개 컴포넌트)
- [x] Home & About 페이지
- [x] SEO (sitemap, robots, 메타데이터), 빌드 성공 (26페이지 SSG)
- [x] 다크/라이트 테마 전환 (ThemeToggle, CSS 기반 아이콘, flash 방지 스크립트)
- [x] 로딩 성능 최적화:
  - next.config.ts: AVIF, 이미지 캐시 TTL, 정적 자산 장기 캐시, DNS prefetch
  - 루트 `/` 서버 redirect (빈 화면 제거)
  - posts.ts 병렬 I/O (Promise.all)
  - HeroSection/about 이미지 sizes prop
  - ThemeToggle CSS 기반 아이콘 (hydration pop-in 제거)
  - loading.tsx 스켈레톤 5개 (홈/목록/상세)

## 4) 진행 중 / 막힘
- 진행 중: 없음
- 막힘/리스크: 없음
- 필요한 결정: Vercel 배포 시점 (사용자 결정)

## 5) 다음 3개 작업 (우선순위)
1. `npm run dev` 시각 검증 (스켈레톤, 테마 토글, 리다이렉트)
2. GitHub repo push
3. Vercel Preview 배포 확인

## 6) 검증 상태 (요약)
- 빌드/린트/테스트: `npm run build` 성공 (26페이지 SSG)
- 콘텐츠 파이프라인: 구성 완료
- 배포(Preview/Prod): 준비전

## 7) 컨텍스트 메모 (다음 세션용)
- 이번 세션에서 꼭 유지할 규칙:
  1. 기존 포스트 수정/삭제 금지
  2. 더미 포스트는 `sample-` 접두사로 구분
  3. public/posts/는 gitignore에 추가 (prebuild로 자동 생성)
- 다음 세션 시작 시 먼저 읽을 문서:
  - `docs/CURRENT_STATUS.md`
  - `docs/CLAUDE_BUILD_RULES.md`
