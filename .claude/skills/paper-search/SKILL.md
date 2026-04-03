---
name: paper-search
description: "지식그래프 기반 논문 추천. 사용자의 연구 관심사와 기존 포스트를 분석하여 읽어야 할 후보 논문 10개를 추천한다. /paper-search 명령어로 실행. '논문 추천', '읽을 논문 찾아줘', '관련 논문', 'paper search' 등 요청 시 트리거."
argument-hint: "<질문 또는 연구 방향 설명> [#인덱스 참조]"
---

# /paper-search — 지식그래프 기반 논문 추천

## 용도
사용자의 연구 관심사, 기존 포스트 분석, 외부 학술 검색을 결합하여 **읽어야 할 후보 논문 Top 10**을 추천한다.

## 입력
```
/paper-search <질문 또는 연구 방향>
```
- `#인덱스`로 기존 포스트 참조 가능
- 예: `/paper-search #16 논문의 리타게팅 한계를 해결하는 접근법은?`
- 예: `/paper-search VLA 모델에서 힘 제어를 통합하는 최신 연구`

## 실행 순서

### Step 1) 사용자 의도 분석
- 질문에서 핵심 키워드, 연구 방향, 해결하고 싶은 문제 추출
- `#인덱스` 참조 시 `posts/global-index.json`에서 slug 조회 → 해당 포스트의 `meta.json` 읽기
- 사용자가 언급한 논문의 key_concepts, methodology, limitations 파악

### Step 2) 내부 지식그래프 탐색
- `posts/index.json` 로드 → 기존 포스트들의 relations, key_concepts, methodology 분석
- 참조된 논문과 직접 연결된 논문들 (builds_on, extends, compares_with 등) 확인
- 기존 포스트의 references 섹션에서 인용된 논문들 수집
- 지식그래프에서 **아직 포스팅되지 않았지만 여러 포스트에서 반복 인용되는 논문** 식별

### Step 3) 검색 쿼리 생성
사용자 의도 + 내부 그래프에서 추출한 키워드로 다층 검색 쿼리 구성:
- **핵심 쿼리**: 사용자가 명시한 주제 (예: "human hand data robot dexterous manipulation retargeting")
- **확장 쿼리**: 관련 key_concepts 조합 (예: "teleoperation wearable glove sim-to-real transfer")
- **저자 쿼리**: 참조 논문의 주요 저자들의 최신 연구

### Step 4) 외부 학술 검색 (병렬)
다음 소스를 **병렬로** 검색:

**a) Semantic Scholar API**
```
WebFetch: https://api.semanticscholar.org/graph/v1/paper/search?query=<query>&limit=20&fields=title,authors,year,citationCount,url,abstract,externalIds
```
- 관련성 기반 검색 + 인용 수 확인
- 최근 2년(2024-2026) 논문 우선

**b) arXiv API**
```
WebFetch: https://export.arxiv.org/api/query?search_query=all:<query>&sortBy=submittedDate&sortOrder=descending&max_results=20
```
- 최신 프리프린트 탐색

**c) Google Scholar (제목 기반)**
- Step 2에서 발견된 "반복 인용되지만 포스팅 안 된 논문"의 제목으로 검색
- 인용 수 및 관련 논문 확인

**d) 주요 저자 최신 논문**
- 참조된 논문의 first/last author의 Semantic Scholar profile에서 최근 논문 확인
- `WebFetch: https://api.semanticscholar.org/graph/v1/author/search?query=<author>&limit=1` → authorId → recent papers

### Step 5) 후보 평가 및 랭킹
수집된 후보를 다음 기준으로 점수화:

| 기준 | 가중치 | 설명 |
|---|---|---|
| **관련성** | 30% | 사용자 질문과의 의미적 유사도, key_concepts 겹침 |
| **참신성** | 20% | 기존 지식그래프에 없는 새로운 접근법/방법론 |
| **인용 영향력** | 15% | 인용 수 (최신 논문은 인용 수 대신 트렌딩 속도) |
| **최신성** | 15% | 발행일 (최근 1년 보너스) |
| **저자 신뢰도** | 10% | 해당 분야 주요 연구 그룹/저자 여부 |
| **실용성** | 10% | 사용자가 제기한 구체적 문제를 해결하는 정도 |

### Step 6) 중복 제거
- 기존 포스트에 이미 있는 논문 제외
- 같은 연구 그룹의 유사 버전 (v1/v2, workshop/conference) 통합
- arXiv preprint과 conference version이 둘 다 있으면 최신 버전만 유지

### Step 7) Top 10 추천 출력

각 논문에 대해:
```markdown
### 1. [논문 제목] (YYYY)
- **저자**: First Author et al. (소속)
- **출처**: arXiv:XXXX.XXXXX / Conference Name
- **인용**: N회 (또는 "프리프린트, 트렌딩 중")
- **추천 이유**: 왜 이 논문이 사용자의 질문에 답하는지 2-3문장
- **기존 그래프와의 연결**: [[관련 포스트]] 와의 관계 (builds_on, fills_gap_of 등)
- **arXiv URL**: https://arxiv.org/abs/XXXX.XXXXX
```

출력 끝에:
```markdown
---
💡 위 논문 중 포스팅하려면: `/post <arXiv URL>` 또는 `/post <블로그 URL>`
```

### Step 8) QA 파일링 (선택)
추천 결과를 Obsidian vault에 저장하고 싶으면:
- `/write 위의 대화 인사이트 저장해줘` 로 이어갈 수 있음을 안내
- 사용자가 요청하면 `From AI/QA/` 에 검색 결과 파일링

## 검색 실패 시
- Semantic Scholar API 실패 → arXiv만으로 진행
- arXiv도 실패 → 내부 지식그래프의 references에서만 추천 (최소 5개)
- 모든 외부 검색 실패 → 내부 그래프 분석만으로 "포스팅되지 않았지만 자주 인용되는 논문" 추천

## 주의사항
- **이미 포스팅된 논문은 추천하지 않는다** — `posts/index.json`의 slug 목록과 대조
- 추천 이유는 사용자의 구체적 질문에 맞춰 작성 (일반적인 "좋은 논문이니까" 금지)
- 인용 수가 낮더라도 최신+관련성 높으면 추천 (트렌딩 우선)
- 한국어로 응답하되, 논문 제목은 원문 영어 유지
