# CURRENT_STATUS.md

> 목적: `/clear` 이후에도 이전 작업을 빠르게 재개하기 위한 **짧은 스냅샷** (append 금지, 매번 덮어쓰기)

## 1) 세션 스냅샷
- 마지막 업데이트: 2026-03-05 (KST)
- 현재 단계: KaTeX 수식 지원 도입 완료
- 전체 진행도(대략): 100% (v1 기능 완료 + 리팩토링 + 개선 + KaTeX)

## 2) 지금 기준 핵심 결정 (최대 5개)
- 인프라: Cloudflare + Vercel + GitHub
- 스택: Next.js 15.5 (App Router) + TypeScript + Tailwind CSS v4 + next-mdx-remote v6
- 콘텐츠 구조: `posts/{research,idea}/<slug>/meta.json`, `ko.mdx`, `en.mdx`, `cover.webp`
- 메타데이터: `meta.json` (언어 무관) + MDX frontmatter (언어별), shallow merge
- 수식: remark-math + rehype-katex로 `$...$`(인라인), `$$...$$`(블록) LaTeX 지원

## 3) 완료됨
- [x] v1 전체 기능 (스캐폴딩~ForceVLA 포스팅~UI 개선)
- [x] 리팩토링: 유틸 추출, 라우트 통합, 컴포넌트 분리, 설정 중앙화, 문서 정리
- [x] KaTeX 수식 지원: remark-math + rehype-katex 도입, DexForce/ForceVLA 포스트 수식 LaTeX 변환
- [x] 수식 작성 규칙 문서화 (RESEARCH_SUMMARY_RULES.md, POST_GENERATOR_RESEARCH.md)

## 4) 진행 중 / 막힘
- 진행 중: 없음
- 막힘/리스크: 없음

## 5) 다음 3개 작업 (우선순위)
1. Vercel 배포 확인
2. 다음 논문 포스팅 추가 (새 규칙 기반)
3. Ideas 탭 첫 포스트 작성

## 6) 검증 상태 (요약)
- 빌드: `npm run build` 성공 (18페이지 SSG 정상 생성)
- KaTeX: 인라인/블록 수식 빌드 정상, 모바일 overflow-x:auto 적용

## 7) 컨텍스트 메모 (다음 세션용)
- `.next` 캐시: `npm run build`에서 자동 정리 (scripts/clean-next.mjs)
- 수식 파이프라인: remark-math → rehype-katex, CSS는 globals.css에서 import
- Figure.tsx: `isCover` prop으로 cover/inline 통합, `priority` prop으로 LCP 제어
- 공유 유틸: `src/lib/paths.ts`, `src/lib/references.ts`, `src/lib/localize.ts`, `src/lib/site-config.ts`
- 라우트 헬퍼: `src/lib/content-page-helpers.ts` (Index + Detail 공통 로직)
- 메타데이터 스키마 정본: `docs/POST_GENERATOR_RESEARCH.md`
