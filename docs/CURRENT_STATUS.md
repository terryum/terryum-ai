# CURRENT_STATUS.md

> 목적: `/clear` 이후에도 이전 작업을 빠르게 재개하기 위한 **짧은 스냅샷** (append 금지, 매번 덮어쓰기)

## 1) 세션 스냅샷
- 마지막 업데이트: 2026-04-07 (KST)
- 현재 단계: Obsidian 연동 + 블로그 포스트 체계 정비 + 하네스 스킬 업데이트 완료. 공동연구 서베이 책 프로젝트 별도 레포 준비 중.
- 전체 진행도(대략): 100%

## 2) 지금 기준 핵심 결정 (최대 5개)
- 인프라: Cloudflare(도메인/DNS/CDN) + Vercel(배포+SSL) + GitHub
- 스택: Next.js 15.5 (App Router) + TypeScript + Tailwind CSS v4 + next-mdx-remote v6
- AI Memory: `posts/index.json` + Supabase Graph DB (papers, graph_edges, node_layouts)
- Paper Graph: Supabase + React Flow, sync-papers.mjs로 동기화
- content_type: `papers`/`notes`/`memos`/`essays` = 탭 슬러그 = 디렉토리명

## 3) 완료됨
- [x] v1 전체 기능 + AI Memory 시스템 + Research 포스팅 자동화
- [x] Bluesky 소셜미디어 공유 + X 카드 캐시 버스팅
- [x] 하네스 스킬 추가: `/draft` (Obsidian Drafts 초안), `/tagging` (자동 태깅)
- [x] 포스트 이동/정리: brain-augmentation tech→essays, 삭제된 원본 파일 정리
- [x] sync-obsidian.mjs 업데이트, posts/index.json 확장
- [x] OG 이미지 생성 (gen0, gen1, harnessing-claude)
- [x] 공동연구 서베이 컨텍스트 문서 작성 (docs/handoff/)

## 4) 진행 중 / 막힘
- #26 TacScale, #27 TacPlay 포스트 — 로컬에만 존재 (비공개, 공개 여부 미정)

## 5) 다음 3개 작업 (우선순위)
1. **#26/#27 포스트 공개 여부 결정** 후 커밋/푸시
2. **Admin Graph UI 검증**: `/admin/graph`에서 노드/엣지 확인 (Supabase 연결 필요)
3. **GA4 설정**: `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX` 환경변수 추가

## 6) 검증 상태 (요약)
- Bluesky dry-run + 실제 발행 테스트 ✅
- X 카드 캐시 버스팅 이미지 표시 확인 ✅
- Obsidian 동기화 스크립트 정상 동작 ✅

## 7) 컨텍스트 메모 (다음 세션용)
- 소셜미디어 플랫폼: Facebook, Threads, LinkedIn, X, Bluesky (5개)
- Supabase: fyrgooabpegysrcawtdm.supabase.co (terry-paper-graph-db)
- dev 서버: Turbopack (`npm run dev`, 포트 3040)
- 별도 레포: `book-snu-largescale-tactile-hand` (공동연구 서베이 책, 준비 중)
- 로컬 미커밋 포스트: #26 TacScale, #27 TacPlay (posts/papers/ 아래)
