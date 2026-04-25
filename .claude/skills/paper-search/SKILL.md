---
name: paper-search
description: "GraphRAG-lite 기반 논문 추천. 사용자 질문을 임베딩으로 anchor 노드에 매핑한 뒤 지식그래프를 BFS로 탐색하여 내부 논문(interpolation)을 찾고, 외부 학술 검색(arXiv/Semantic Scholar)에서 새 후보를 가져와 기존 그래프와의 정렬도(alignment)로 평가한다(extrapolation). /paper-search 명령어로 실행. '논문 추천', '읽을 논문 찾아줘', '관련 논문', 'paper search' 등 요청 시 트리거."
argument-hint: "<질문 또는 연구 방향 설명> [#인덱스 참조]"
---

# /paper-search — Anchor + Traversal + Alignment

## 핵심 흐름 (3-step GraphRAG-lite)

```
사용자 질문 Q
    │
    ▼
[Step 1] Anchor lookup
    Q → embedding → top-K 노드 (Supabase pgvector)
    │
    ▼
[Step 2] Internal interpolation
    anchors → BFS depth=2 over knowledge-index.json
    score = α·anchor_sim + β·edge_path_weight + γ·memo_bonus
    │
    ▼
[Step 3] External extrapolation
    anchor의 메타에서 검색 키워드 추출
    arXiv + Semantic Scholar 병렬 검색
    각 후보 abstract → alignment_score
        (anchor_sim + citation_overlap + concept_jaccard + gap_completion)
    │
    ▼
출력: Internal Top-K + External Top-N (각각 path/rationale 명시)
```

이 흐름은 사용자의 명시적 의도를 따른다:
> "가장 가까운 임베딩 논문 하나만 검색되더라도 그들의 관계성 안에서 빠르게 내가 봐야할 논문들이 어떤 맥락에서 참조되어야 하는지"
>
> "새롭게 검색된 논문이 더해졌을 때 우리가 묻는 주제에 대한 답변은 훨씬 더 깊이있는 답변을 할 수 있어야"

`anchor_sim`은 임베딩 거리, `edge_path_weight`는 typed edge의 strength(`ONTOLOGY.md`), `alignment_score`는 외부 후보가 기존 그래프 위에 얼마나 잘 얹히는지를 정량화한다.

## 입력

```
/paper-search <질문 또는 연구 방향>
```

- `#인덱스`로 기존 포스트 참조 가능 (예: `/paper-search #16 논문의 한계를 보완하는 연구`)
- 한국어/영어 모두 OK (임베딩이 bilingual 텍스트로 학습됨)

## 실행 단계

### Step 1) 의도 정리 + 질문 정제

- 사용자 질문에서 핵심 의도, 제약, "왜 이걸 알고 싶은지" 추출
- `#N` 참조 시 `posts/global-index.json`에서 slug 조회 → 그 포스트의 메타도 질문에 합침
- 정제된 질문 Q (1-3 문장) 만들기

### Step 2) Internal: anchor + traversal

```bash
cd ~/Codes/personal/terryum-ai
node scripts/paper-search-internal.mjs --query="<정제된 Q>" --top-k=3 --depth=2 --top-n=10 --json > /tmp/paper-search-internal.json
```

`/tmp/paper-search-internal.json`에 `{ query, anchors, recommendations, neighborhood_slugs, q_embedding }` 저장.

**해석 포인트**:
- `anchors[].similarity`가 0.4 미만이면 KB가 이 주제를 거의 다루지 않음 → 외부 검색 비중을 늘려야 함
- `recommendations[].path`는 anchor에서부터의 의미 있는 경로 (e.g. `2505-dexumi --reviews--> 2407-stretchable-glove`)
- `📝memo` 표시된 노드는 Terry가 직접 분석한 것이라 추천 우선순위 ↑

### Step 3) External 검색 키워드 도출

`anchors[].key_concepts`와 사용자 질문에서 검색 쿼리 3종 도출:
- **핵심 쿼리**: 사용자 질문의 명사구 (그대로)
- **확장 쿼리**: anchor의 key_concepts 상위 3-5개 조합
- **갭 쿼리**: neighborhood의 research_gaps에서 핵심 명사 추출 (gap을 메우는 후보 찾기)

### Step 4) 외부 학술 검색 (병렬 WebFetch)

**a) Semantic Scholar API**
```
WebFetch: https://api.semanticscholar.org/graph/v1/paper/search?query=<query>&limit=15&fields=title,authors,year,citationCount,abstract,externalIds,references.externalIds,citations.externalIds
```
- `references.externalIds` / `citations.externalIds`가 alignment 평가에 핵심 — 인용 그래프 1-hop 가져옴
- 최근 2년 우선

**b) arXiv API**
```
WebFetch: https://export.arxiv.org/api/query?search_query=all:<query>&sortBy=submittedDate&sortOrder=descending&max_results=15
```
- 최신 프리프린트

**c) 기존 그래프에서 자주 인용되지만 KB에 없는 후보**
- `knowledge-index.json`에 없는 slug지만 anchor의 references[]에 자주 등장하는 논문 식별

세 소스에서 모은 후보는 다음 형식의 JSON 배열로 정리:
```json
[
  {
    "id": "arxiv:2511.99999",
    "title": "...",
    "abstract": "...",
    "authors": ["..."],
    "year": 2025,
    "url": "...",
    "ext_references": ["arxiv:2402.12345"],
    "ext_cited_by":   ["arxiv:2603.45678"]
  }
]
```

이미 KB에 포스팅된 슬러그는 제외 (`posts/index.json`의 slug 목록과 대조).

### Step 5) Alignment scoring

```bash
echo '<candidates JSON>' | node scripts/paper-search-score-external.mjs --internal=/tmp/paper-search-internal.json
```

stdout에 `alignment_score`로 정렬된 후보 배열. 각 후보는 다음 breakdown을 가진다:
- `anchor_sim`: anchor 클러스터와의 의미적 거리 (w1=0.4)
- `citation_overlap`: 후보의 인용/피인용이 neighborhood와 겹치는 정도 (w2=0.3)
- `concept_jaccard`: 후보 abstract의 컨셉이 neighborhood concept vocab과 겹치는 정도 (w3=0.2)
- `gap_completion`: neighborhood의 research_gaps를 후보가 다루는 정도 (w4=0.1)

`gap_completion`이 0보다 큰 후보는 **기존 그래프의 미해결 질문을 메우는** 가치 있는 추가다 — 사용자가 강조한 "답변을 더 깊이 있게 만들어주는" 후보.

### Step 6) Top-N 출력 형식

내부 추천 3-5개 + 외부 추천 5-7개 = 총 10개. 각 항목:

```markdown
### Internal #1 — [제목] (`slug`)
- **anchor 경로**: `2505-dexumi --reviews--> 2407-stretchable-glove`
- **score**: 0.703 (sim=0.61, path=0.6, has_memo=true)
- **추천 이유**: 사용자 질문의 어떤 부분을 이 논문이 다루는지 1-2 문장
- **메모 미리보기** (있을 때): "..."

### External #1 — [제목] (arXiv:XXXX.XXXXX, YYYY)
- **저자**: First Author et al.
- **alignment_score**: 0.62
  - anchor_sim 0.58 / citation_overlap 0.18 / concept_jaccard 0.12 / **gap_completion 0.20** ← 어떤 갭을 메우는지
- **그래프 정렬**: `2505-dexumi`, `2509-dexop`의 references와 겹침. neighborhood의 "long-horizon contact-rich manipulation" 갭 다룸
- **추천 이유**: 1-2 문장
- **URL**: https://arxiv.org/abs/XXXX.XXXXX
```

출력 끝에:
```markdown
---
💡 위 논문 중 포스팅하려면: `/post <arXiv URL>` 또는 `/post <블로그 URL>`
```

## Anchor 품질 진단

스크립트 출력의 `anchors[].similarity`로 KB 커버리지 진단:
- ≥ 0.55: KB에 좋은 anchor 있음 → 내부 추천 비중 ↑
- 0.35 - 0.55: 부분 커버 → 내부 50% / 외부 50%
- < 0.35: KB가 이 주제를 거의 안 다룸 → 외부 80% + 내부는 "관련 인접 영역" 정도

## 검색 실패 fallback

- Semantic Scholar API 실패 → arXiv만으로 진행
- arXiv도 실패 → 내부 추천만 출력 (anchor + traversal 결과)
- OpenAI 임베딩 실패 → FTS RPC `search_posts_fts`로 키워드 anchor 대체 (정확도 ↓)
- `search_papers_vector` RPC 미설치 → 자동으로 클라이언트 사이드 cosine fallback (`paper-search-internal.mjs`가 처리)

## 주의사항

- **이미 KB에 있는 논문은 외부 후보에서 제외** — `posts/index.json`의 slug 목록과 대조
- 추천 이유는 사용자의 구체적 질문에 맞춰 작성 (일반적 "좋은 논문이니까" 금지)
- `gap_completion > 0` 후보는 강하게 추천 (기존 그래프 보완)
- 한국어로 응답하되, 논문 제목은 원문 영어 유지
- 가중치는 `--top-k` `--depth` `--weights=w1,w2,w3,w4` 등으로 오버라이드 가능

## 현재 KG 상태 (참고)

- 36개 논문 노드, 110 엣지 (forward + 자동 inverse). CiTO/SPAR 기반 7개 predicate 어휘 (`ONTOLOGY.md`)
- 32/36 노드에 1536-dim 임베딩 (4개는 Supabase 미동기화 — `sync-papers.mjs` 필요)
- 기본 가중치: α=0.5 / β=0.4 / γ=0.1 (internal), w1=0.4 / w2=0.3 / w3=0.2 / w4=0.1 (external)
