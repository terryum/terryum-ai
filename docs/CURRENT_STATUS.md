# CURRENT_STATUS.md

> 목적: `/clear` 이후에도 이전 작업을 빠르게 재개하기 위한 **짧은 스냅샷** (append 금지, 매번 덮어쓰기)

## 1) 세션 스냅샷
- 마지막 업데이트: 2026-03-18 (KST)
- 현재 단계: Paper Graph DB 테스트 + 갭 보완 + E2E 검증 완료
- 전체 진행도(대략): 100%

## 2) 지금 기준 핵심 결정 (최대 5개)
- 인프라: Cloudflare(도메인/DNS/CDN) + Vercel(배포+SSL) + GitHub
- 스택: Next.js 15.5 (App Router) + TypeScript + Tailwind CSS v4 + next-mdx-remote v6
- AI Memory: `posts/index.json` + Supabase Graph DB (papers, graph_edges, node_layouts)
- Paper Graph: Supabase + React Flow, sync-papers.mjs로 동기화
- content_type 완전 정렬: `papers`/`notes`/`tech`/`essays` = 탭 슬러그 = 디렉토리명

## 3) 완료됨
- [x] v1 전체 기능 + AI Memory 시스템 + Research 포스팅 자동화
- [x] Paper Graph DB (Supabase 스키마 + sync-papers.mjs + admin UI)
- [x] **Graph DB 통합 테스트** (`scripts/test-graph.mjs`): 37/37 테스트 통과
  - Paper CRUD, Edge 생성 규칙, 상태 관리, 수동 Edge, 새 Taxonomy, Edge 삭제, Layout, 리밸런싱
- [x] **갭 보완 완료**:
  - sync-papers.mjs: taxonomy 검증 + `--auto-taxonomy` 자동 추가 + 최상위 노드 과다 경고
  - generate-index.mjs: 미등록 taxonomy를 leaf로 카운트 + 가장 가까운 ancestor로 rollup
  - generate-thumbnails.mjs: CONTENT_DIRS 버그 수정 (`research/idea/essay` → `papers/essays/tech`)
- [x] **E2E 검증**: `2407-tactile-skin-inhand-translation` 논문 포스팅 → Supabase sync → 3 meta edges + 3 auto edges + layout 생성 확인

## 4) 진행 중 / 막힘
- 없음

## 5) 다음 3개 작업 (우선순위)
1. **커밋 + 배포**: 변경사항 git commit + push + Vercel 배포
2. **Admin Graph UI 검증**: `/admin/graph`에서 새 논문 노드 + 엣지 확인
3. **추가 논문 포스팅**: 더 많은 논문 추가하여 그래프 확장

## 6) 검증 상태 (요약)
- 빌드: `npm run build` 성공 (54 pages, 13 posts)
- `test-graph.mjs`: 37/37 테스트 통과
- `validate-post.mjs`: 0 errors, 0 warnings
- `posts/index.json`: 13개 포스트, 20 edges, 3 clusters

## 7) 컨텍스트 메모 (다음 세션용)
- 빌드 시 SSL 인증서 이슈 → `NODE_TLS_REJECT_UNAUTHORIZED=0`으로 우회 필요
- dev 서버: Turbopack 사용 중 (`npm run dev`, 포트 3040)
- Supabase: fyrgooabpegysrcawtdm.supabase.co (terry-paper-graph-db)
