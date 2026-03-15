# Paper Knowledge Graph — 설계 문서

## 설계 원칙

1. **파일 우선**: `meta.json` + `MDX`가 source of truth. DB는 read-only 쿼리 레이어
2. **그래프 확장**: `posts/index.json`이 knowledge graph 뼈대 — 확장이 충분 (~100개 논문까지)
3. **Taxonomy 도입**: `posts/taxonomy.json` 기반 계층적 분류 (robotics/arm, ai/llm 등)

---

## 데이터 모델

### `posts/taxonomy.json`
```json
{
  "version": 1,
  "nodes": {
    "robotics": { "label": { "ko": "로보틱스", "en": "Robotics" }, "children": ["robotics/arm", "..."] },
    "robotics/arm": { "label": { "ko": "팔·조작", "en": "Arm / Manipulation" }, "children": [] }
  }
}
```

### `posts/research/*/meta.json` 추가 필드
```json
{
  "taxonomy_primary": "robotics/arm",
  "taxonomy_secondary": ["robotics/brain"],
  "relations": [
    { "target": "other-slug", "type": "builds_on" }
  ]
}
```

### `posts/index.json` 확장 구조
```json
{
  "knowledge_graph": {
    "edges": [{ "from": "slug-a", "to": "slug-b", "type": "builds_on" }],
    "clusters": [{ "id": "vla-robotics", "post_numbers": [1, 2], "taxonomy_nodes": ["robotics/brain"] }],
    "bridge_papers": [2],
    "outlier_papers": []
  },
  "taxonomy_stats": { "robotics/arm": 4, "robotics/brain": 3 }
}
```

### 관계 타입 전체 목록
| 타입 | 의미 |
|------|------|
| `builds_on` | 이 논문이 대상을 기반으로 발전 |
| `extends` | 대상 방법론을 확장 |
| `contradicts` | 대상 주장과 반박/대립 |
| `supports` | 대상 주장을 실험적으로 지지 |
| `compares_with` | 동일 태스크에서 비교 대상 |
| `uses_method` | 대상의 방법론 채용 |
| `uses_dataset` | 대상의 데이터셋 사용 |
| `addresses_task` | 동일 태스크를 다른 방식으로 해결 |
| `inspired_by` | 아이디어 영감 수준의 연결 |
| `fills_gap_of` | 대상의 한계를 보완 |
| `identifies_limitation_of` | 대상의 한계를 지적 |
| `related` | 기타 관련 (약한 연결) |

---

## 구현 단계

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | taxonomy.json 생성, types 확장, meta.json 업데이트, generate-index.mjs 강화 | 진행 중 |
| 2 | RelatedPapers, TaxonomyFilter UI 컴포넌트, ContentDetailPage/FilterablePostList 수정 | 대기 |
| 3 | `/post` 슬래시 커맨드에 Graph Analysis 단계 추가 | 대기 |
| 4 | Supabase 도입 (조건부, 아래 참조) | 미래 |

---

## Phase 4 (선택적): Supabase 도입 조건

아래 중 하나를 만족할 때:
- 논문 **50개 초과** → JSON 조회 속도 이슈
- `"이 논문과 method가 같은 논문 모두"` 같은 SQL 쿼리 반복 필요
- AI agent가 graph를 MCP tool로 직접 쿼리해야 할 때

도입 시 최소 스키마:
```sql
papers(slug PK, title_en, title_ko, taxonomy_primary, ai_summary jsonb, published_at)
relations(from_slug, to_slug, type, confidence float, source text)
```
mdx + meta.json은 계속 source of truth. Supabase는 read-only 쿼리 레이어만.
