# PRD: Paper Graph DB (v1)

## 목적
- Papers 탭의 논문 간 관계를 그래프 형태로 관리
- 관리자가 노드/엣지를 확인, 수정, 승인/거절

## 기술 스택
- **DB**: Supabase (dev@artlab.ai 계정)
- **UI**: React Flow (편집 중심)
- **API**: Next.js API Routes

## 데이터 구조
- `posts/index.json` — 논문 메타데이터 + relations
- `posts/taxonomy.json` — 분야 분류 트리
- Supabase `edges` 테이블 — 관계 엣지 (source, target, type, status)
- Supabase `node_layouts` 테이블 — 그래프 시각화 좌표

## 관계 타입
- `related`, `builds_on`, `extends`, `compares_with`, `fills_gap_of`
- 자동 생성 시 `suggested` 상태 → 관리자 승인 후 `confirmed`

## Admin 페이지
- `/admin/graph` — React Flow 기반 그래프 에디터
- 노드 드래그, 엣지 추가/삭제, 레이아웃 저장

## 참고
- 설계 요약: `docs/REFACTOR_PAPER_DB.md`
- 논문 추가 시 자동 관계 생성: `.claude/commands/post.md` Step R3
