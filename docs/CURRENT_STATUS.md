# CURRENT_STATUS.md

> 목적: `/clear` 이후에도 이전 작업을 빠르게 재개하기 위한 **짧은 스냅샷** (append 금지, 매번 덮어쓰기)

## 1) 세션 스냅샷
- 마지막 업데이트: 2026-03-09 (KST)
- 현재 단계: 새 브랜드 아이콘(청록색 3D 유기체) 로고 변형 파일 일괄 재생성 완료
- 전체 진행도(대략): 100% (v1 기능 완료 + 지속 개선)

## 2) 지금 기준 핵심 결정 (최대 5개)
- 인프라: Cloudflare(도메인/DNS/CDN) + Vercel(배포+SSL) + GitHub
- 도메인: `terry.artlab.ai` (Namecheap CNAME → cname.vercel-dns.com)
- 스택: Next.js 15.5 (App Router) + TypeScript + Tailwind CSS v4 + next-mdx-remote v6
- 썸네일: 288×288 정사각 cover crop, meta.json `thumb_position`/`thumb_extract`로 crop 조정 가능
- card_summary = TL;DR 텍스트 그대로 사용 (별도 작성 불필요)

## 3) 완료됨
- [x] v1 전체 기능 (스캐폴딩~ForceVLA 포스팅~UI 개선)
- [x] 리팩토링: 유틸 추출, 라우트 통합, 컴포넌트 분리, 설정 중앙화, 문서 정리
- [x] 썸네일 규칙 강화: 112→288px, center crop→cover crop + position/extract 지원
- [x] TL;DR→card_summary 통합, ContentCard line-clamp 모바일 8줄/데스크톱 4줄
- [x] About 페이지 리라이트 + 하단 연락처/소셜 섹션 삭제
- [x] 라이트 모드 배경색 조정 (#FFFFFF→#ECF0F2 푸른 회색), 다크 모드 약간 밝게 (#030712→#0B1120)
- [x] dev 서버 500 에러 수정: `next dev --turbopack` 전환 (jest-worker Windows 크래시 근본 해결)
- [x] 새 브랜드 아이콘(Icon-Terry-Homepage.png, 청록색 3D 유기체)으로 로고 변형 15개 일괄 재생성
  - 스크립트: `scripts/generate-logos.mjs` (소스 이미지 CLI 인수 지원, 재현 가능)
  - `npm run generate-logos` 명령어 추가

## 4) 진행 중 / 막힘
- 막힘/리스크: 없음

## 5) 다음 3개 작업 (우선순위)
1. 다음 논문 포스팅 추가 (새 규칙 기반)
2. Ideas 탭 첫 포스트 작성
3. Essays 탭 콘텐츠 추가

## 6) 검증 상태 (요약)
- 빌드: 확인 필요 (이번 세션 변경사항 커밋 전)
- 로고: 15개 파일 정상 생성, dev 서버에서 새 아이콘 확인 가능

## 7) 컨텍스트 메모 (다음 세션용)
- `.next` 캐시: `npm run build`에서 자동 정리 (scripts/clean-next.mjs)
- 썸네일 스크립트: `scripts/generate-thumbnails.mjs` — meta.json `thumb_source`, `thumb_position`, `thumb_extract` 지원
- 로고 스크립트: `scripts/generate-logos.mjs` — 새 아이콘 제공 시 `npm run generate-logos` 또는 `node scripts/generate-logos.mjs [경로]`
- About 페이지: 하단 Contact 섹션 제거됨, SocialIcons는 프로필 섹션에만 남아있음
- 테마 색상: 라이트 bg-base `#ECF0F2`, bg-surface `#E3E8EB` / 다크 bg-base `#0B1120`, bg-surface `#1A2332`
- dev 서버: Turbopack 사용 중 — `⚠ Webpack is configured` 경고는 무해함 (build는 webpack 정상 사용)
