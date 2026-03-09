# CURRENT_STATUS.md

> 목적: `/clear` 이후에도 이전 작업을 빠르게 재개하기 위한 **짧은 스냅샷** (append 금지, 매번 덮어쓰기)

## 1) 세션 스냅샷
- 마지막 업데이트: 2026-03-10 (KST)
- 현재 단계: Ideas 탭 첫 포스트 생성 + Blog Post Generator 스펙 작성 완료
- 전체 진행도(대략): 100% (v1 기능 완료 + 지속 개선)

## 2) 지금 기준 핵심 결정 (최대 5개)
- 인프라: Cloudflare(도메인/DNS/CDN) + Vercel(배포+SSL) + GitHub
- 도메인: `terry.artlab.ai` (Namecheap CNAME → cname.vercel-dns.com)
- 스택: Next.js 15.5 (App Router) + TypeScript + Tailwind CSS v4 + next-mdx-remote v6
- 썸네일: 288×288 정사각 cover crop, meta.json `thumb_position`/`thumb_extract`로 crop 조정 가능
- Blog/Idea/Essay 포스팅 스펙: `docs/POST_GENERATOR_BLOG.md` (Ideas + Essays 공통)

## 3) 완료됨
- [x] v1 전체 기능 (스캐폴딩~ForceVLA 포스팅~UI 개선)
- [x] 리팩토링: 유틸 추출, 라우트 통합, 컴포넌트 분리, 설정 중앙화, 문서 정리
- [x] 썸네일 규칙 강화: 112→288px, center crop→cover crop + position/extract 지원
- [x] TL;DR→card_summary 통합, ContentCard line-clamp 모바일 8줄/데스크톱 4줄
- [x] About 페이지 리라이트 + 하단 연락처/소셜 섹션 삭제
- [x] 라이트 모드 배경색 조정 (#FFFFFF→#ECF0F2 푸른 회색), 다크 모드 약간 밝게 (#030712→#0B1120)
- [x] dev 서버 500 에러 수정: `next dev --turbopack` 전환 (jest-worker Windows 크래시 근본 해결)
- [x] 새 브랜드 아이콘(Icon-Terry-Homepage.png, 청록색 3D 유기체)으로 로고 변형 15개 일괄 재생성
- [x] `docs/POST_GENERATOR_BLOG.md` 작성 (Ideas + Essays 공통 포스팅 스펙)
- [x] Ideas 탭 첫 포스트: `260310-on-the-manifold-frist-post` 생성 및 썸네일 생성

## 4) 진행 중 / 막힘
- 막힘/리스크: 없음

## 5) 다음 3개 작업 (우선순위)
1. 다음 Research 논문 포스팅 추가
2. Essays 탭 첫 포스트 작성
3. 커밋 후 Vercel 배포 확인

## 6) 검증 상태 (요약)
- 빌드: 미확인 (dev 서버 접속으로 확인 필요)
- 썸네일: `generate-thumbnails.mjs` 실행 완료 (1 generated, 4 up-to-date)

## 7) 컨텍스트 메모 (다음 세션용)
- `.next` 캐시: `npm run build`에서 자동 정리 (scripts/clean-next.mjs)
- 썸네일 스크립트: `scripts/generate-thumbnails.mjs` — meta.json `thumb_source`, `thumb_position`, `thumb_extract` 지원
- 로고 스크립트: `scripts/generate-logos.mjs` — 새 아이콘 제공 시 `npm run generate-logos`
- Blog 포스팅 스펙: `docs/POST_GENERATOR_BLOG.md` — Ideas/Essays 공통. 마크다운 + 선택적 커버/썸네일 이미지 제공 시 사용
- About 페이지: 하단 Contact 섹션 제거됨, SocialIcons는 프로필 섹션에만 남아있음
- 테마 색상: 라이트 bg-base `#ECF0F2`, bg-surface `#E3E8EB` / 다크 bg-base `#0B1120`, bg-surface `#1A2332`
- dev 서버: Turbopack 사용 중 — `⚠ Webpack is configured` 경고는 무해함
