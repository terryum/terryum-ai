# PRD_PAPER_GRAPH_DB

## 1. 목적
- 현재 `Papers` 탭의 논문 목록, markdown 요약본, `meta.json`, `taxonomy.json` 구조를 유지한다.
- 논문 간 관계를 **그래프 형태로 관리**할 수 있는 최소 기능을 추가한다.
- 관리자는 논문 노드와 연결 엣지를 **직접 확인, 수정, 승인/거절**할 수 있어야 한다.
- 현재는 **편집 중심 UI**를 우선 구현하고, 이후에 탐색 중심 시각화(`react-force-graph`)는 별도 화면으로 확장 가능하게 설계한다.

## 2. 이번 단계의 원칙
- **Supabase 사용**
  - 무료 계정 사용 주체는 `dev@artlab.ai`
  - 개인 본계정 `terry.t.um@gmail.com`과 혼동되지 않도록 프로젝트/CLI/MCP 설정을 분리 가능하게 설계한다.
- **Next.js 앱 중심**
  - 현재는 별도 Node.js 백엔드를 두지 않는다.
  - API, 서버 액션, DB 연동은 Next.js 내부에서 처리한다.
- **그래프 UI는 React Flow 사용**
  - 현재 단계에서는 편집/관리 중심 UI만 구현한다.
  - 이후 필요 시 `react-force-graph` 기반 탐색 화면을 별도로 추가할 수 있게 구조를 열어둔다.
- **관계 연결은 하이브리드 방식**
  - taxonomy / concepts / methodology / relations 기반 규칙 연결
  - 필요 시 임베딩 기반 후보 추천 확장 가능
  - 자동 연결은 바로 확정하지 않고 `suggested` 상태로 저장 후 관리자가 승인

## 3. 핵심 사용자 시나리오

### 3.1 관리자
- 새 논문이 추가되면 해당 논문이 그래프에 자동 생성된다.
- 관리자는 논문 상세 화면 또는 그래프 편집 화면에서:
  - 현재 연결된 노드/엣지를 확인하고
  - 잘못 연결된 관계를 제거하거나 수정하고
  - 자동 추천된 관계를 승인/거절할 수 있다.
- 관리자는 노드 위치를 수동으로 이동할 수 있고, 위치는 저장된다.

### 3.2 일반 사용자
- `Papers` 탭에서 기존처럼 논문 리스트를 본다.
- `Browse by Field`는 단순 리스트가 아니라 **최대 3단계 taxonomy 트리 메뉴**로 제공한다.
- 트리 메뉴는 접기/펼치기가 가능해야 하며, PC와 모바일에서 각각 자연스럽게 동작해야 한다.

## 4. 관리자 입장에서 그래프 연결 상태를 쉽게 파악하는 방법
`react-force-graph`가 없어도, 이번 단계에서는 아래 조합으로 충분히 관리 가능해야 한다.

### 4.1 React Flow 편집 캔버스
- 현재 논문 노드와 연결 관계를 시각적으로 확인
- 줌 인/아웃, 팬, 노드 드래그 지원
- 선택한 논문 기준 1-hop 또는 2-hop 정도까지만 표시 가능

### 4.2 우측 상세 패널
선택한 논문에 대해 아래를 보여준다.
- 기본 메타데이터
- taxonomy primary / secondary
- key concepts
- methodology
- explicit relations
- suggested relations
- connected edges 목록

### 4.3 연결 테이블 / 승인 UI
- 현재 논문과 연결된 edge를 표 형태로 보여준다.
- 최소 필드:
  - source
  - target
  - edge type
  - provenance (`meta`, `auto`, `manual`)
  - status (`confirmed`, `suggested`, `rejected`)
- 관리자 액션:
  - 승인
  - 거절
  - 수동 추가
  - 삭제
  - edge type 수정

즉, 이번 단계는 **그래프 탐색 뷰어**보다 **그래프 편집기 + 관계 패널**에 가깝게 구현한다.

## 5. 데이터 구조 방향
현재 구조를 유지하되, Supabase(Postgres)에 아래 정도의 최소 테이블을 둔다.

### 5.1 papers
- `paper_id`
- `slug`
- `title`
- `summary`
- `source_url`
- `source_date`
- `status`
- `meta_json`

### 5.2 taxonomy_nodes
- `taxonomy_id`
- `parent_id`
- `label`
- `depth`

### 5.3 graph_nodes
- `node_id`
- `node_type` (`paper`, `concept`, `method`, `taxonomy`)
- `label`
- `ref_id`

### 5.4 graph_edges
- `edge_id`
- `source_id`
- `target_id`
- `edge_type`
- `provenance`
- `status`
- `weight`

### 5.5 node_layouts
- `node_id`
- `view_id`
- `x`
- `y`
- `pinned`

## 6. 새 논문 추가 시 처리 흐름
새 논문이 추가되면 아래 흐름으로 동작한다.

1. markdown / `meta.json` 읽기
2. `papers` upsert
3. taxonomy 연결 생성
4. `key_concepts`, `methodology`, `relations`를 바탕으로 node/edge 생성
5. 자동 추천 edge 생성
   - 초기에는 규칙 기반으로만 시작
   - status는 `suggested`
6. 초기 좌표 배치
7. 관리자 UI에서 검토 후 승인/수정

## 7. 자동 연결 규칙 (초기 버전)
초기에는 단순 규칙 기반으로 시작한다.

### 연결 후보 규칙
- 같은 `taxonomy_primary`
- 같은 `taxonomy_secondary`
- 같은 `methodology`
- 공통 `key_concepts`
- `relations`에 직접 명시된 논문

### 상태 원칙
- 명시적 관계(`relations`)는 바로 `confirmed`
- 규칙 기반으로 찾은 유사 연결은 `suggested`
- 관리자가 승인하면 `confirmed`로 변경

## 8. Claude Code에서 사용할 수 있는 관리자 skill 방향
향후 Claude Code가 관계를 수동 검토할 수 있도록, 아래 수준의 명령 흐름을 염두에 둔다.

### 예시 기능
- 특정 논문의 현재 edge 목록 조회
- suggested edge만 필터링해서 보기
- edge 승인 / 거절
- paper ↔ concept / paper ↔ paper 관계 수동 추가
- 특정 논문 주변 1-hop 그래프 요약

즉, 나중에 Claude Code에서 그래프를 “읽고 고치는” 작업을 할 수 있도록, DB 스키마와 API는 단순하고 명확하게 유지한다.

## 9. Papers 탭 / Browse by Field 개편
현재 Papers 탭 구조를 유지하되, `Browse by Field`를 아래처럼 개편한다.

### 요구사항
- 최대 **3단계 depth** 지원
- Wikipedia 스타일의 **트리 메뉴** 느낌
- 접기 / 펼치기 가능
- 특정 항목 클릭 시 해당 taxonomy에 속한 논문 리스트 필터링
- 모바일에서는 drawer / accordion 형태로 자연스럽게 동작
- PC에서는 좌측 사이드바 트리로 자연스럽게 동작

### 예시 형태
- Robotics
  - Hand
    - Underactuated Gripper
  - Manipulation
    - Deformable Object
- AI
  - Agentic Research
    - AI Scientist

## 10. 프론트엔드 화면 방향

### 10.1 Papers 메인 화면
- 논문 리스트 유지
- 좌측 또는 상단에 `Browse by Field` 트리 메뉴
- taxonomy 클릭 시 리스트 필터링

### 10.2 관리자 그래프 편집 화면
- React Flow 캔버스
- 좌측 필터 또는 taxonomy selector
- 우측 상세 패널
- edge 승인/수정 테이블

### 10.3 미래 확장 화면
향후 별도 `/graph/explore` 같은 화면에서:
- `react-force-graph` 기반 탐색 화면 추가 가능
- 목적은 편집이 아니라 발견/탐색 중심

## 11. 기술적 가이드라인
- 현재는 Next.js 내부 API/서버 액션 중심
- 별도 Node.js 백엔드는 도입하지 않음
- 단, 향후 아래 조건이 생기면 Node.js worker 또는 별도 ingestion 서비스 분리 가능
  - 논문 대량 추가
  - 임베딩 생성 배치
  - 장시간 처리 작업
  - 에이전트용 비동기 파이프라인

## 12. Supabase 계정/프로젝트 주의사항
이 프로젝트는 `dev@artlab.ai`와 연결된 **무료 Supabase 계정**을 기준으로 한다.
따라서 Claude Code 또는 CLI/MCP 설정 시 아래를 고려해야 한다.

### 주의사항
- 개인 본계정 `terry.t.um@gmail.com` 기준으로 연결하지 않도록 주의
- 프로젝트별 `.env` / CLI 설정이 명시적으로 분리되어야 함
- 프로젝트 시작 시 어떤 Supabase project ref를 쓰는지 확인 가능해야 함
- 환경 변수와 문서에 현재 연결 대상 계정을 명확히 남길 것

## 13. 이번 단계의 범위
### 포함
- Supabase 연동
- Papers / taxonomy / graph 최소 스키마
- React Flow 기반 관리자 그래프 편집 화면
- edge 확인 / 승인 / 수정 UI
- Browse by Field 3단계 트리 메뉴
- PC / 모바일 대응

### 제외
- Neo4j 도입
- 별도 Node.js 백엔드
- `react-force-graph` 탐색 화면 본 구현
- 복잡한 자동 레이아웃 알고리즘
- 고급 임베딩 파이프라인
- 대규모 검색 최적화

## 14. 향후 확장 포인트
- `react-force-graph` 기반 탐색 전용 화면
- pgvector 기반 유사 논문 추천
- concept alias 정리
- graph 기반 agent reasoning API
- 논문 원본 PDF와의 연동 강화
- 관리자용 batch approve/reject 기능

## 15. 구현 우선순위
1. Supabase 스키마 설계
2. taxonomy 동기화
3. Papers 탭의 3단계 Browse by Field 트리 메뉴
4. React Flow 기반 관리자 그래프 편집 화면
5. edge 승인/수정 패널
6. 새 논문 추가 시 자동 node/edge 생성
7. Claude Code가 활용 가능한 간단한 관계 검토 workflow 정리

---

이 문서는 **큰 방향과 범위 정의용 PRD**이다.
세부 구현은 Claude Code가 현재 코드베이스를 분석한 뒤, 실제 라우트/컴포넌트/DB 구조에 맞게 재작성한다.
