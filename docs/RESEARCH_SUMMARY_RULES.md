# Research Post 요약 규칙

> 논문을 어떻게 읽고, 무엇을 추출하고, 어떻게 요약하는가를 정의한다.
> 포스팅의 톤, 깊이, 섹션 구조를 조정하려면 **이 파일만 수정**하면 된다.
> 파이프라인/파일 생성 스펙은 `docs/POST_GENERATOR_RESEARCH.md` 참조.

---

## 핵심 원칙

1. **구조화 추출 → 요약 생성** (순서 엄수)
   - 메타데이터, 섹션, figure/caption, 결과 숫자 후보를 먼저 추출
2. **근거 기반 요약**
   - 결과 숫자는 표/본문/캡션에서 확인된 수치만 사용
   - 불확실하면 `확인 불가` 또는 `추정` 명시
3. **허위 수치 생성 절대 금지**
4. **Figure 캡션 원문 전체 작성** — 생략/축약 금지, 원문 캡션 그대로

---

## MDX 본문 섹션 구조

아래 순서를 기본값으로 한다.

### 1. TL;DR (1-2문장)
- **문제 + key insight** 위주, 수치 불필요
- 예: "VLA 모델에 힘 감지가 빠져있어 접촉이 많은 조작에서 한계를 보이는 문제를, MoE 기반 힘-비전-언어 융합으로 해결했다."

### 2. 문제 (1문단 압축)
- **3-beat 구조**: 기존 한계 → 최근 연구 한계 → 이 논문이 다루는 문제
- 3-5문장, 1문단으로 압축

### 3. 핵심 아이디어
- 기존 대비 차별점 설명 + 핵심 구성 요소 bullet
- **본문 이미지 1장** 포함: `<Figure src="./fig-N.png" caption="Figure N: ..." />`
- 캡션은 **원문 전체** 작성 (절대 생략/축약 금지)

### 4. 구체적 방법 (Collapsible)
- `<Collapsible title="구체적 방법">` 으로 래핑 (기본 접혀있음)
- 내용: 알고리즘 상세, cost function, 수식, 학습 전략 등
- 본문 이미지 1장 포함 가능 (선택)
- 관심 있는 독자가 펼쳐서 읽는 용도

### 5. 주요 결과
- 가장 중요한 정량 결과 bullet (수치 1-3개)
- baseline 비교 포함
- **주요 표 이미지 1장**: `<Figure src="./tab-N.png" caption="Table N: ..." />`
- 수치 출처를 표/본문/캡션에서 확인

### 6. 달성점과 한계점
- **새롭게 달성한 점**: 이 논문이 기존 대비 새롭게 이룬 것 (2-3개 bullet)
- **한계점**:
  - 저자 언급 한계: future work / discussion 기반
  - AI 분석 한계: 1개만, `🤖` 표시 (재현성/범용성/실제적용성/비교공정성 관점)

### 7. Terry's memo
- 비어있으면 `- *(None)*` 출력

### 8-9. (MDX 바깥, 자동 렌더링)
- **Key References**: frontmatter `references` 기반, `foundational`/`recent` 카테고리 분리
- **Figure 갤러리 + Table 갤러리**: frontmatter `figures`/`tables` 기반

---

## 추출 규칙

### 1저자 Google Scholar URL 추출
- Google Scholar에서 논문 제목 검색 → 1저자 프로필 링크 추출
- 못 찾으면 빈 값 (SourceInfoBlock에서 비활성화)
- frontmatter 키: `first_author_scholar_url`

### Figure/Table 전수 추출
- **소스 우선순위**: arXiv HTML > PDF fallback
- 모든 figure → `fig-N.png`, 모든 table → `tab-N.png`
- 각 항목의 캡션 원문 전체 기록 (frontmatter `figures`/`tables` 배열)
- 캡션 생략/축약 절대 금지

### 주요 결과 추출
- 우선순위: 결과 표 > 실험 문단 > 그림 캡션 > Abstract
- 출력 형식: `Task X에서 68.2% → 79.4% (+11.2%p), baseline Y 대비`

### 한계점 추출
- **A. 저자 언급**: Limitations, Discussion, Future Work, Conclusion에 근거
- **B. AI 분석**: 1개만, 재현성/범용성/실제적용성/비교공정성에서 선택, `🤖` 표기

### 주요 참조논문 선택
- **근본 참조 (foundational)**: 2-3개 — 연구의 기반이 되는 핵심 선행 연구
- **극복 대상 (recent)**: 1-2개 — 이 논문이 직접 비교/극복하려는 최근 연구
- 각 항목 필드: `title`, `author`, `description`, `arxiv_url`, `scholar_url`, `category`
- `description`: 논문 요약 + **현재 논문에서 어떤 맥락으로 언급했는지** (데스크톱 약 2줄)

### 본문 이미지 선택 (MDX 본문에 삽입할 것)
- 핵심 아이디어 섹션: overview/framework 이미지 1장
- 주요 결과 섹션: 주요 결과 표 이미지 1장
- 구체적 방법 섹션: 상세 아키텍처/알고리즘 이미지 1장 (선택)

---

## 홈 목록 표시 요소 작성 규칙

홈/리스트 페이지의 카드에 표시되는 요소들의 작성 원칙.

### `card_summary` (카드 부연설명)
- 홈/리스트 카드에서 제목 아래 표시되는 짧은 설명
- 카드 line-clamp: 모바일 4줄 / 데스크톱 3줄
- **ko**: 85-100자 / **en**: 150-180자
- **내용**: 핵심 문제 + 해결 방법 + 대표 수치 1개
- 제목과 중복되는 표현 피하기, 제목이 못 전달하는 맥락을 보충

### `summary` (상세 요약)
- SEO/OG 메타 등에 사용되는 상세 요약
- 2-3문장, 문제 + 방법 + 결과 수치 포함

### 썸네일 (`cover-thumb.webp`)
- 홈/리스트 카드 왼쪽에 표시되는 112×112 정사각 이미지
- **원칙: 실제 로봇/실험 장면 사진 우선**, 다이어그램/아키텍처 그림 지양
- 선택 우선순위:
  1. 논문의 실제 로봇/하드웨어/실험 사진 (task setup, hardware, teaser 중 실사 부분)
  2. 실사가 없으면 가장 직관적인 개념도
  3. cover.webp fallback (아키텍처 다이어그램 등)
- **meta.json `thumb_source`**: cover.webp 대신 다른 figure를 소스로 지정
  - 예: `"thumb_source": "./fig-2.jpg"` → fig-2에서 center crop
  - 미지정 시 cover.webp에서 자동 생성
- 빌드타임에 `generate-thumbnails.mjs`가 자동 생성 (112×112, center crop, webp q80)
- 목표 크기: < 5KB

### `cover_caption`
- 선택한 cover figure의 원문 캡션 그대로 (**번역하지 않음**)

---

## 수식 작성 원칙

- **인라인 수식**: `$...$` — 변수, 짧은 수식 (예: `$x_f = x_o + k_f \cdot f$`)
- **블록 수식**: `$$...$$` — 핵심 방정식 (display math, 중앙 정렬)
- **변수 표기**: subscript `x_f`, superscript `J^\top`, dot `\dot{x}`, hat `\hat{y}`
- **함수/연산자**: `\text{Softmax}`, `\text{MoE}` 등 text 래핑
- **집합/공간**: `\mathbb{R}^6`, `\mathbb{R}^{d}` 등
- **backtick 코드 대신 LaTeX 사용**: 수식은 항상 `$...$` 또는 `$$...$$`로 작성 (backtick은 코드 전용)
- 논문 PDF에서 수식 추출 시 LaTeX로 정확하게 옮기기

---

## 한국어/영어 작성 원칙

- 제목/고유명사/기술 용어는 원문 유지 우선
- summary/섹션 설명만 해당 언어로 자연스럽게 작성
- en.mdx의 `references` → `description`도 영어로 작성
