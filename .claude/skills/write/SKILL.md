---
name: write
description: "Obsidian 지식베이스 글쓰기 도구. 3가지 모드: (1) 메모→초안: 메모 파일/인덱스 지정 시 스타일 가이드 기반 Tech/Essays 초안 생성, (2) 대화 인사이트 저장: '인사이트 저장해줘', '대화 요약 저장' 요청 시 현재 대화의 핵심을 vault에 md로 파일링, (3) 재수정: 기존 초안 개선. /write, '글 써줘', '초안 작성', '메모를 글로', '인사이트 저장', '대화 정리해줘' 등 요청 시 트리거."
---

# /write — Obsidian 지식베이스 글쓰기 도구

## 용도
3가지 모드를 지원한다:
1. **초안 모드**: Obsidian 메모 → Terry 스타일 Tech/Essays 초안 생성
2. **인사이트 모드**: 현재 대화의 핵심 인사이트를 vault에 md 파일로 저장
3. **재수정 모드**: 기존 초안 개선 + 스타일 가이드 학습

## 모드 판별

| 입력 패턴 | 모드 | 예시 |
|---|---|---|
| 파일 경로 또는 #인덱스 지정 | 초안 모드 | `/write #23 #25 --type=tech` |
| "인사이트 저장", "대화 요약", "정리해줘" | 인사이트 모드 | `/write 위의 대화 인사이트 저장해줘` |
| "다시 써줘", 기존 초안 언급 | 재수정 모드 | `/write #24 다시 써줘, 톤을 더 차분하게` |

---

## Mode 1: 초안 모드 (메모 → Tech/Essays)

### 입력 형식
```
/write <소스...> [--type=tech|essays] [--slug=YYMMDD-short-name] [--topic=주제]
```

- `<소스>`: Obsidian 메모 파일 경로 또는 `#인덱스` (복수 가능)
  - 예: `/write #23 #25 --type=tech --slug=260403-ai-future`
  - 예: `/write ~/Documents/Obsidian\ Vault/From\ Terry/Memos/ai-thought.md --type=essays`
- `--type`: tech (기술/미래/new normal) 또는 essays (개인적 삶/에세이). 미지정 시 내용 기반 추론 후 사용자 확인
- `--slug`: 미지정 시 날짜+주제로 자동 생성 (YYMMDD-short-name)
- `--topic`: 메모에서 초점을 맞출 주제 (선택)

## 실행 순서

### Step 1) 소스 로드
- `#인덱스`가 주어지면 `posts/global-index.json`에서 경로 조회
- 파일 경로가 주어지면 직접 읽기
- `~` 경로는 홈 디렉토리로 확장

### Step 2) 스타일 가이드 로드
- `posts/terry_writing_style_guide.md` 전문 읽기
- 핵심 원칙 내재화: 간결+밀도, 담백+강렬, 인사이트 중심, 수학적 비유

### Step 3) 기존 지식베이스 참조
- `posts/index.json` 로드 → 관련 논문/포스트 식별
- 메모의 키워드가 기존 포스트의 key_concepts와 겹치면 [[wikilink]] 후보로 표시

### Step 4) 초안 작성
스타일 가이드의 체크리스트를 따른다:
1. 첫 두 단락에 핵심 개념 배치
2. 원문 순서를 따르지 않고 가장 강한 개념부터 재배열
3. 설명보다 인사이트 비중 증가
4. 비유는 1~2축 유지 (수학적/기하학적)
5. 개인 서사는 점화 장치로만 사용
6. 마지막 문장은 여운 있는 방향성으로 마무리

### Step 5) Obsidian Drafts/ 에 저장
- 경로: `~/Documents/Obsidian Vault/From Terry/Drafts/<slug>.md`
- frontmatter 포함:
  ```yaml
  doc_id: (global-index에서 새 번호 할당)
  type: "draft"
  visibility: "private"
  content_type: "tech" 또는 "essays"
  slug: "<slug>"
  created_at: "<오늘 날짜>"
  source_memos: ["#23", "#25"]
  ```
- 본문 첫 줄: `` `#N` · 제목 ``
- 관련 포스트에 `[[wikilinks]]` 포함

### Step 6) global-index.json 업데이트
- 새 초안에 doc_id 할당
- entries에 추가

### Step 7) 결과 출력
- 초안 요약 (핵심 논지 2~3줄)
- 구조 변경 이유 (원문과 어떻게 재배열했는지)
- 관련 기존 포스트 링크
- "Obsidian에서 Drafts/<slug>.md를 열어 수정하세요" 안내

---

## Mode 2: 인사이트 모드 (대화 → vault 파일링)

### 입력 형식
```
/write 위의 대화 인사이트 저장해줘
/write 위의 대화에서 #3 논문 관련 인사이트 요약 저장해줘
/write 이 대화 정리해서 저장해줘
```

### 동작 순서

#### Step 1) 대화 분석
- 현재 대화에서 핵심 인사이트를 추출
- 특정 논문(#인덱스) 언급 시 해당 논문 관련 내용만 필터링
- Terry가 밝힌 생각/의견/방향성과 AI의 분석/답변을 구분

#### Step 2) 인사이트 구조화
- **핵심 발견**: 대화에서 새로 알게 된 것
- **Terry의 관점**: Terry가 표명한 생각/방향
- **질문과 답변**: 핵심 Q&A 요약
- **연결 고리**: 관련 논문/포스트 wikilinks

#### Step 3) vault에 저장
- 경로: `~/Documents/Obsidian Vault/From AI/QA/YYMMDD-<topic>.md`
- frontmatter:
  ```yaml
  doc_id: (global-index에서 새 번호)
  type: "qa"
  visibility: "private"
  topic: "<주제>"
  created_at: "<오늘 날짜>"
  related_papers: ["slug1", "slug2"]
  source: "conversation"
  ```
- 본문 첫 줄: `` `#N` · <주제> ``
- 관련 논문/포스트에 `[[wikilinks]]` 포함
- 태그: `#qa #<도메인> #<키워드>`

#### Step 4) global-index.json 업데이트
- 새 QA 노트에 doc_id 할당

#### Step 5) 결과 출력
- 저장된 파일 경로 + 인덱스 번호
- 인사이트 요약 (3~5줄)
- "Obsidian에서 QA/<filename>.md를 열어 확인하세요" 안내

### 인사이트 노트 예시
```markdown
---
doc_id: 28
type: "qa"
visibility: "private"
topic: "VLA 모델 힘 제어 비교"
created_at: 2026-04-03
related_papers: ["2505-forcevla-force-aware-moe", "2410-pi0-vla-flow-model"]
source: "conversation"
---

`#28` · VLA 모델 힘 제어 비교

## 핵심 발견
- ForceVLA는 F/T 센서를 MoE gating으로 통합 → 기존 VLA 대비 +23.2%p
- Pi0는 flow matching 기반이지만 힘 피드백 미사용

## Terry의 관점
- 힘 제어는 접촉 작업의 핵심이지만 현재 VLA 대부분이 무시
- 센서 의존성(end-effector only)이 한계 → distributed sensing 필요

## 관련 논문
- [[2505-forcevla-force-aware-moe]]
- [[2410-pi0-vla-flow-model]]

#qa #robotics #VLA #force-control
```

---

## Mode 3: 재수정 모드

## 스타일 가이드 학습 (자동)

`/write`로 재수정 요청을 받으면 (예: "이 초안 다시 써줘" + 수정 방향 제시):
1. 이전 버전과 새 요청의 차이 분석
2. 수정에서 드러나는 패턴 추출
3. `posts/terry_writing_style_guide.md` 업데이트 여부 판단
4. 유의미한 새 패턴 발견 시 스타일 가이드에 추가 (기존 항목과 병합 우선)
5. 가이드 길이가 과도하면 약한 항목 통합/제거

## 주의사항
- `/post` 와 혼동하지 않기: `/write`는 초안 생성 (Obsidian Drafts/에 저장), `/post`는 홈페이지 발행
- 초안은 비공개 (visibility: private). 공개 발행은 `/post --from=` 사용
- 스타일 가이드를 반드시 읽고 따를 것. 특히 §3(톤), §4(문장), §5(구조) 섹션
