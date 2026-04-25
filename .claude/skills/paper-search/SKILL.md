---
name: paper-search
description: "GraphRAG-lite 기반 논문 추천. 두 모드: (1) explore — 사용자 질문을 임베딩으로 anchor 노드에 매핑한 뒤 지식그래프를 BFS로 탐색하여 내부 논문(interpolation)을 찾고, 외부 학술 검색(arXiv/Semantic Scholar)에서 새 후보를 가져와 기존 그래프와의 정렬도(alignment)로 평가(extrapolation). (2) next — 'surveys에서 어떤 논문을 다음에 추가할 차례인지' 답하기 위해 surveys candidate pool에서 추천. /paper-search 명령어로 실행. '논문 추천', '읽을 논문 찾아줘', '관련 논문', 'paper search', '다음에 무슨 논문', '다음 차례', '추가할' 등 요청 시 트리거."
argument-hint: "<질문 또는 연구 방향 설명> [#인덱스 참조]"
---

# /paper-search — Anchor + Traversal + Alignment

## 의도 분류 (Step 0)

질문 텍스트를 보고 모드를 결정한다. **이 분류는 LLM이 한 줄 판단으로 수행**한다.

| 모드 | 트리거 표현 (한국어 / 영어) | 설명 |
|---|---|---|
| `next-restricted` | "survey 안에서만", "이미 모은 것 중", "외부 말고", "internal only", "no external" | candidate pool로만 추천, 외부 검색 차단 |
| `next` | "다음에", "다음 차례", "다음에 추가할", "쌓을", "next paper to add", "what should I read next" | surveys candidate pool 우선, 약하게 매칭되면 외부 자동 보충 |
| `explore` (default) | 위 트리거 없음 — 일반적 "관련 논문 찾아줘" 류 | 기존 동작 (내부 BFS + 외부 arXiv/SemScholar) |

**우선순위**: `next-restricted` > `next` > `explore` (구체 → 일반).

판단이 모호하면 `next` 모드로 가되, 출력에 모드 표기.

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
- 모드 트리거 표현 (위 표 참조)으로 `next` / `next-restricted` 모드 진입

## 실행 단계

### Step 1) 의도 정리 + 질문 정제

- Step 0 분류 결과(mode) 확정
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

---

### **🔀 모드 분기**

- `mode == explore` → Step 3 (외부 검색)으로 진행
- `mode == next` 또는 `next-restricted` → Step 2b (next-mode ranking)로 진입

---

### Step 2b) Next mode — surveys candidate pool ranking

surveys (`humanoid-revolution`, `robot-hand-tactile-sensor`, `vla-agentic-robotics`, `snu-tactile-hand`)의 인용 풀을 예비 노드로 매달아둔 `candidate_index`에서 "내가 다음에 추가할 차례인 논문"을 추천한다.

```bash
# Step 2의 출력을 stdin으로 전달
node scripts/paper-search-rank-next.mjs --top-n=10 [--restrict] < /tmp/paper-search-internal.json
```

- `--restrict`: `next-restricted` 모드 (외부 fallback 신호 무시)
- 출력: `{ mode, top_score, top_anchor_similarity, suggest_external_fallback, candidates: [...] }`

**점수 구성** (`paper-search-rank-next.mjs`):
- `anchor` (0.60): 사용자 질문 임베딩과 candidate 임베딩의 cosine
- `survey` (0.12): surveys 인용 빈도 (몇 개 surveys에서 인용됐나 / 3, clamp 0-1)
- `graph` (0.10): 가장 가까운 confirmed 노드와의 Jaccard (anchor와 일치하면 1.4× boost)
- `gap` (0.08): 미해결 research_gaps 매칭 여부
- `verify` (0.05): surveys 본문 fact-check 여부 (primary_source_verified면 1, else 0.5)
- `recency` (0.05): 출판 연도 (current_year - 3 기준 정규화)
- **anchor floor 0.20**: 임베딩 유사도가 너무 낮은 후보는 제외

**External fallback 신호**: `top_anchor_similarity < 0.45` 일 때 `suggest_external_fallback=true`. 이 때 `mode == next`라면 Step 3 (외부 검색)을 추가로 수행하고 출력에 `[external]` 태그로 명시 구분. `mode == next-restricted`라면 무시.

**Metadata quality 배지**: 각 candidate는 `metadata_quality: "rich" | "skeleton"`을 가진다 — surveys-side `_research/papers.json` 엔트리가 deep-researcher 패스를 거쳐 method_summary/tags가 채워졌으면 `rich`, `provenance: "bibtex_backfill"` 스켈레톤만 있으면 `skeleton`. 출력 상위 영역에 `metadata_coverage: { rich, skeleton, rich_in_top, skeleton_in_top }`로 풀 전체와 top-N 분포를 표시. 사용자에게 "이 후보는 surveys 본문에 풍부히 언급됐는지(rich) / 단순 인용에 그치는지(skeleton)"의 신호.

각 candidate 출력 항목:
```json
{
  "canonical_id": "arxiv:2410.24164",
  "title": "...", "year": 2024, "venue": "...",
  "metadata_quality": "rich",
  "bibtex_keys": ["bjorck2025gr00tn1", "nvidia2025grt"],
  "aliases": [{ "title": "GR00T-N1 Foundation Model", "year": "2025" }],
  "score": 0.706, "breakdown": { "anchor": 0.66, ... },
  "survey_backrefs": [{ "survey": "humanoid-revolution", "chapters_cited": [8, 10] }],
  "nearest_confirmed": [{ "slug": "2410-pi0-vla-flow-model", "similarity": 0.3 }],
  "matches_gaps": [{ "concept": "manipulation", "gap_slug": "..." }],
  "reason": "cited in humanoid-revolution ch8,10 / ...; near 2410-pi0-...; fills gap on manipulation; fact-checked"
}
```

`bibtex_keys` (plural)는 surveys-side dedup이 같은 논문으로 머지한 모든 bibtex 키 목록 (예: GR00T-N1이 두 가지 키로 인용된 경우). `aliases`는 머지된 title 변형(예: "GR00T N1" / "GR00T-N1 Foundation Model"). 둘 다 candidate UI에 "동일 논문의 다른 표기" 정보로 노출 가능.

이미 confirmed 노드로 promote된 candidate는 `promoted_to_slug` 필드가 채워져 있어 자동 제외된다. promotion lookup은 arxiv_id, doi, **bibtex_keys 전체 배열**, aliases, title 모두를 시도하므로 surveys-side 변형이 어떻게 잡혀도 confirmed와 매칭된다.

→ 결과를 받은 뒤 Step 6 출력 단계로 (Step 3-5는 explore 또는 fallback 시에만).

---

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

#### Explore 모드

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

#### Next 모드

```markdown
**Mode: next** — surveys 인용 풀에서 추천 (active 405 / 풀 428개)
**Metadata coverage**: 🟢 rich 108 / ⚪ skeleton 320 — top-5엔 🟢 5 / ⚪ 0
   (skeleton은 surveys deep-researcher 패스 전 — method_summary 미채움)

### Candidate #1 — [제목] (`canonical_id`) 🟢 rich
- **score**: 0.706 (anchor=0.66 / survey=1.0 / graph=0.30 / gap=1.0 / verify=1.0 / recency=0.33)
- **인용 위치**: humanoid-revolution Ch8,10 · robot-hand-tactile-sensor Ch8 · vla-agentic-robotics Ch1,4,5
- **인접 confirmed 노드**: `2410-pi0-vla-flow-model` (sim=0.30)
- **메우는 gap**: manipulation
- **검증 상태**: ✓ fact-checked (primary source)
- **method 요약**: "..." (rich일 때만)
- **다른 표기** (있을 때): bibtex `bjorck2025gr00tn1` / `nvidia2025grt`, alias "GR00T-N1 Foundation Model"
- **추천 이유**: 사용자 질문 + 인용 맥락 + gap을 엮어 1-2 문장
- **URL**: arXiv:2406.09246

### [external] #1 — ... (suggest_external_fallback=true 일 때만)
... explore 모드와 동일 포맷
```

skeleton 후보는 `🟢 rich` 자리에 `⚪ skeleton`으로 표시하고, **method 요약**과 **메우는 gap** 라인은 생략 (정보 없음). 사용자가 "이 후보는 surveys 본문에 깊이 다뤄지지 않았다"는 신호로 해석.

출력 끝에:
```markdown
---
💡 위 논문 중 포스팅하려면: `/post <arXiv URL>` 또는 `/post <블로그 URL>`
   포스팅 후 `/survey --sync-candidates`로 candidate pool 재계산 (또는 `/survey --deploy` 시 자동)
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

- 36개 confirmed 논문 노드, 110 엣지 (forward + 자동 inverse). CiTO/SPAR 기반 7개 predicate 어휘 (`ONTOLOGY.md`)
- 32/36 노드에 1536-dim 임베딩 (4개는 Supabase 미동기화 — `sync-papers.mjs` 필요)
- **428개 candidate 노드** (4 surveys에서 lift, 23 promoted, 405 active; rich 108 / skeleton 320). `.cache/candidates-embeddings.json`에 임베딩 + content hash 캐시 (입력 텍스트 변경 시 자동 재생성).
- 기본 가중치:
  - explore mode: α=0.5 / β=0.4 / γ=0.1 (internal), w1=0.4 / w2=0.3 / w3=0.2 / w4=0.1 (external)
  - next mode: anchor=0.60 / survey=0.12 / graph=0.10 / gap=0.08 / verify=0.05 / recency=0.05, anchor floor 0.20
