# CURRENT_STATUS.md

> 목적: `/clear` 이후에도 이전 작업을 빠르게 재개하기 위한 **짧은 스냅샷** (append 금지, 매번 덮어쓰기)

## 1) 세션 스냅샷
- 마지막 업데이트: 2026-03-27 (KST)
- 현재 단계: Papers 사이드바 outside-container 배치 + 모바일 collapsible 완료
- 전체 진행도(대략): 100%

## 2) 지금 기준 핵심 결정 (최대 5개)
- 인프라: Cloudflare(도메인/DNS/CDN) + Vercel(배포+SSL) + GitHub
- 스택: Next.js 15.5 (App Router) + TypeScript + Tailwind CSS v4 + next-mdx-remote v6
- AI Memory: `posts/index.json` + Supabase Graph DB (papers, graph_edges, node_layouts)
- Paper Graph: Supabase + React Flow, sync-papers.mjs로 동기화
- content_type: `papers`/`notes`/`tech`/`essays` = 탭 슬러그 = 디렉토리명

## 3) 완료됨
- [x] v1 전체 기능 + AI Memory 시스템 + Research 포스팅 자동화
- [x] 이전 글/다음 글 네비게이션 (3afbc42)
- [x] **Papers 사이드바 outside-container** (최신):
  - xl+(≥1280px): absolute top-0 bottom-0, right:calc(100%+1rem), w-44 — Container 왼쪽 바깥에 sticky 배치
  - 모바일/좁은 화면(<xl): 글 상단에 collapsible 패널 (기본 접힘)
  - 선택된 taxonomy 표시 칩 + ✕ 해제 버튼
  - "Seminal" 버튼 숨김 처리 (나중에 재활성화)
  - 필터 파이프라인: tab → taxonomy → tag → starred
  - taxonomy 변경 시 태그 선택 초기화

## 4) 진행 중 / 막힘
- 없음

## 5) 다음 3개 작업 (우선순위)
1. **posts/tech/260315-rebalancing/** 블로그 포스트 작업
2. **Admin Graph UI 검증**: `/admin/graph`에서 노드/엣지 확인 (Supabase 연결 필요)
3. **GA4 설정**: `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX` 환경변수 추가

## 6) 검증 상태 (요약)
- tsc --noEmit: 오류 없음 ✅
- 번들 내 xl:block absolute, sticky top-24, xl:hidden, calc(100%+1rem) 확인 ✅
- Seminal 버튼 제거 확인 ✅

## 7) 컨텍스트 메모 (다음 세션용)
- Papers 사이드바: xl(1280px)+ 에서만 outside sidebar 표시. sticky top-24(96px) — 헤더 높이 조정 필요 시 변경
- Seminal 버튼: FilterablePostList.tsx에서 주석처리됨 (나중에 재활성화)
- Supabase: fyrgooabpegysrcawtdm.supabase.co (terry-paper-graph-db)
- dev 서버: Turbopack (`npm run dev`, 포트 3040)
