# Research Post Generator 스펙

> arXiv 링크 → Research 포스트 파일 세트를 생성하는 파이프라인.
> 논문 요약 품질/스타일 규칙은 `docs/RESEARCH_SUMMARY_RULES.md` 참조.

---

## 입력 / 출력

### 입력
- arXiv 링크 (예: `https://arxiv.org/abs/2505.22159`)

### 출력 (필수)
- `meta.json` (언어 무관 메타데이터)
- `ko.mdx`, `en.mdx`, `cover.webp`

### 출력 (옵션)
- `fig-*.png` (본문용 figure 이미지)
- `tab-*.png` (본문용 table 이미지)

### 논문 PDF 보관
- `paper/<slug>.pdf` (`.gitignore` 포함)

---

## 파이프라인

### Step 0) 입력 정규화
- `abs/<id>` / `pdf/<id>.pdf` 모두 허용 → arXiv ID 추출

### Step 1) 메타데이터 수집
- 제목, 저자 목록 (이름+소속), 초록, 카테고리
- v1 제출일 → slug 날짜 (slug 규칙은 `POSTING_WORKFLOW.md` 참조)
- PDF URL, Project 페이지 URL

### Step 1-1) 1저자 Scholar URL 추출
- Google Scholar에서 논문 제목 검색 → 1저자 프로필 링크 추출
- 못 찾으면 `first_author_scholar_url` 생략 (SourceInfoBlock에서 비활성화)

### Step 2) PDF 다운로드
- `paper/<slug>.pdf`에 저장

### Step 3) 논문 읽기 및 콘텐츠 추출
- **`docs/RESEARCH_SUMMARY_RULES.md`에 따라** 수행
- 입력: PDF 전문
- 출력: TL;DR, 문제, 핵심 아이디어, 구체적 방법, 주요 결과, 달성점과 한계점, 참조논문, card_summary

### Step 4) Cover 이미지 선택 및 다운로드
- 선택 우선순위:
  1. 캡션 키워드: `overview`, `framework`, `pipeline`, `method`, `architecture`
  2. Figure 1 우선 (동점이면 1 > 2 > 3)
  3. 전체 개념 그림 > 세부 그래프/표
  4. 가독성 (너무 작은 텍스트 감점)
- 소스 우선순위: arXiv HTML → 프로젝트 사이트 → placeholder
- 출력: `cover.webp`
- `cover_caption`: 선택한 figure의 원문 캡션 그대로 (번역하지 않음)

### Step 4-1) Cover Thumbnail (자동 생성)
- 빌드타임에 `generate-thumbnails.mjs`가 자동 생성 (수동 작업 불필요)
- ko.mdx frontmatter `title` → SVG (컬러 배경 + 텍스트) → 112×112 webp (~2-3KB)
- 출력: `public/posts/<slug>/cover-thumb.webp`

### Step 4-2) Figure/Table 전수 추출

#### 소스 및 URL 구성
- **소스 우선순위**: arXiv HTML (`https://arxiv.org/html/<id>v<ver>/`) > PDF fallback
- arXiv HTML의 `<img>` src는 상대경로 → base URL에 붙여서 다운로드
  - 예: `extracted/6484354/figures/teaser.jpg` → `https://arxiv.org/html/2505.22159v1/extracted/6484354/figures/teaser.jpg`
  - 예: `x1.png` → `https://arxiv.org/html/2505.22159v1/x1.png`

#### 파일명 규칙
- 모든 figure → `fig-N.{원본확장자}` (N = 원문 figure 번호)
- 모든 table (이미지) → `tab-N.{원본확장자}` (N = 원문 table 번호)
- **원본 확장자 유지** (jpg→jpg, png→png). 불필요한 포맷 변환 금지
- `copy-post-images.mjs`가 `.jpg`, `.png`, `.webp` 모두 처리함

#### HTML 테이블 처리
- 논문의 테이블이 HTML로 렌더링된 경우 (이미지가 아닌 경우) → 이미지 추출 불가
- 이 경우 `tables[]` 배열은 빈 배열 유지
- 주요 수치는 MDX 본문 텍스트에 이미 포함되므로 문제 없음

#### 캡션 규칙
- 각 항목의 **캡션 원문 전체** 기록 → `figures`/`tables` 배열
- 캡션 생략/축약 절대 금지

### Step 5) MDX 파일 생성
- `ko.mdx`: 한국어 요약 본문 + frontmatter
- `en.mdx`: 영어 번역본 (`locale: "en"`, `translation_of: "<slug>:ko"`)
- **MDX body에 Source 블록/참조논문 섹션 작성하지 않음** (frontmatter → 컴포넌트 자동 렌더링)
- **`## Terry's memo` 섹션은 MDX body에 작성하지 않음** → frontmatter `terrys_memo` 필드 사용 (Appendix에서 자동 렌더링)
- MDX body에서 사용 가능한 커스텀 컴포넌트:
  - `<Figure src="./fig-N.png" caption="..." number={N} />` — 이미지+캡션
  - `<Collapsible title="구체적 방법">...</Collapsible>` — 접을 수 있는 섹션

#### 본문 Figure 삽입 규칙
- 갤러리와 별도로, MDX 본문 안에 핵심 Figure를 직접 삽입한다.
- **인라인 Figure ≠ 커버 이미지**: 핵심 아이디어 섹션의 인라인 Figure는 커버와 중복되지 않는 Figure를 선택 (예: 커버가 Fig 3 아키텍처면, 인라인은 Fig 4 태스크 설정)
- ko.mdx 캡션은 **한국어**로 작성, en.mdx 캡션은 **원문(영어)** 사용
- 본문 삽입 Figure와 갤러리 Figure는 중복 OK.

| 섹션 | 삽입 Figure 기준 | 위치 | 필수 여부 |
|---|---|---|---|
| **핵심 아이디어** | task setup 또는 non-cover overview (커버 ≠ 인라인) | bullet list 뒤 | **필수** |
| **구체적 방법** (Collapsible 내) | teaser/comparison (보통 Fig 1) | 마지막 문단 뒤 | 선택 |
| **주요 결과** | main results chart/table (보통 Fig 5) | bullet list 뒤 | **필수** |

### Step 6) 검증 + Git push
- `POSTING_WORKFLOW.md` 공통 검증 체크리스트 수행

### Step 6-1) 기존 포스트 역참조 업데이트
새 포스트 생성 시:
1. 새 포스트의 `source_url`(arXiv URL)이 기존 포스트 references의 `arxiv_url`과 일치하는지 확인
2. 일치하면 기존 포스트의 해당 reference에 `post_slug` 추가 (ko.mdx, en.mdx 모두)
3. 이를 통해 기존 포스트의 Reference Card에 "Post" 배지가 자동으로 표시됨

---

## 메타데이터 스키마

> `meta.json`이 base, MDX frontmatter가 override (shallow merge).
> `meta.json`이 없으면 기존처럼 frontmatter만 사용 (하위 호환).

### meta.json (언어 무관 필드)
| 키 | 설명 |
|---|---|
| `post_id` | slug과 동일 |
| `slug` | 폴더명과 동일 |
| `published_at` | ISO 8601 |
| `updated_at` | ISO 8601 |
| `status` | `"draft"` 또는 `"published"` |
| `content_type` | `"reading"` (참고용; 폴더가 실제 결정) |
| `tags` | 문자열 배열 |
| `cover_image` | `"./cover.webp"` |
| `cover_caption` | 원문 figure 캡션 (번역 안 함) |
| `cover_thumb` | `"./cover_thumb.webp"` (optional) |
| `reading_time_min` | 읽기 시간 (분) |
| `source_url` | arXiv abs URL |
| `source_title` | 원문 논문 제목 |
| `source_author` | `"First Author et al."` |
| `source_type` | `"arXiv"` |
| `source_project_url` | 프로젝트 페이지 URL (optional) |
| `source_authors_full` | 전체 저자 목록 (이름+소속, 배열) |
| `first_author_scholar_url` | 1저자 Google Scholar 프로필 URL (optional) |
| `figures` | Figure 이미지 배열: `{src, caption, caption_ko?, number}[]` (아래 예시 참조) |
| `tables` | Table 이미지 배열: `{src, caption, caption_ko?, number}[]` (HTML 테이블이면 빈 배열) |

#### figures/tables 배열 예시
```json
"figures": [
  {
    "src": "./fig-1.jpg",
    "caption": "Comparison between ForceVLA and baselines without force input...",
    "caption_ko": "ForceVLA와 힘 입력 없는 베이스라인 비교...",
    "number": 1
  },
  {
    "src": "./fig-3.png",
    "caption": "Overview of our ForceVLA model...",
    "caption_ko": "ForceVLA 모델 개요...",
    "number": 3
  }
],
"tables": []
```
- `src`: 반드시 `./` 접두사 사용 (normalizeMeta에서 `/posts/<slug>/`로 변환됨)
- `caption`: 원문(영어) 캡션 전체 (축약 금지)
- `caption_ko`: 한국어 캡션 (없으면 영어 caption fallback). 갤러리에서 locale별 자동 전환
- `number`: 원문 figure/table 번호 (정수)
| `newsletter_eligible` | `false` (v1 미사용) |
| `featured` | `false` |

### MDX frontmatter (언어별 필드)
| 키 | 설명 |
|---|---|
| `locale` | `"ko"` 또는 `"en"` |
| `title` | 제목 |
| `summary` | 2-3문장 요약 |
| `card_summary` | 카드용 짧은 요약 (작성 규칙은 RESEARCH_SUMMARY_RULES.md) |
| `seo_title` | SEO 제목 (optional) |
| `seo_description` | SEO 설명 (optional) |
| `translation_of` | 번역 원문 참조 (optional) |
| `translated_to` | 번역된 언어 목록 (optional) |
| `terrys_memo` | Terry의 메모 (빈 문자열이면 Appendix에 미표시) |
| `references` | 주요 참조논문 배열 (3-5개, description이 언어별이므로 전체 유지) |

### References 항목 필드
| 키 | 설명 |
|---|---|
| `title` | 논문 제목 |
| `author` | `"First Author et al. (YYYY)"` |
| `description` | 논문 요약 + 현재 논문에서의 맥락 (데스크톱 약 2줄) |
| `arxiv_url` | arXiv URL (optional) |
| `scholar_url` | Google Scholar URL (optional) |
| `project_url` | 프로젝트 페이지 URL (optional) |
| `post_slug` | 사이트 내 포스트 slug (있으면 "Post" 배지 렌더링, optional) |
| `category` | `"foundational"` 또는 `"recent"` |

---

## UI 렌더링 구조 (참고)

### Source Box (`SourceInfoBlock`)
frontmatter 기반으로 포스트 상단에 자동 렌더링. `first_author_scholar_url` 있으면 1저자 이름이 링크.

### Appendix 구조 (`ContentDetailPage`)
MDX body 아래에 자동 렌더링되는 Appendix(h2) 섹션:
1. **Figures** (h3): `ImageGallery` — locale별 캡션 자동 전환 (`caption_ko` 사용)
2. **Tables** (h3): `ImageGallery` — 있을 때만 표시
3. **Key References** (h3): `ReferenceCard` — `foundational`/`recent` 카테고리 분리. `project_url` → Project 배지, `post_slug` → Post 배지 (내부 링크)
4. **Terry's memo** (h3): frontmatter `terrys_memo` — 빈 문자열이면 미표시

### 본문 Figure (`Figure`)
MDX 내 `<Figure>` 컴포넌트 클릭 시 Lightbox 열림. hover 시 확대 아이콘 오버레이.

---

## 검수 체크리스트

### 기본 파일
- [ ] `meta.json`, `ko.mdx`, `en.mdx`, `cover.webp` 생성
- [ ] `cover-thumb.webp` — 빌드타임 자동 생성 (수동 불필요)
- [ ] `paper/<slug>.pdf` 저장
- [ ] `post_id == slug == 폴더명` 일치
- [ ] `posts/research/<slug>/`에 배치

### 메타데이터
- [ ] `meta.json`에 언어 무관 필드 모두 존재
- [ ] MDX frontmatter에 언어별 필드만 존재 (중복 없음)
- [ ] `cover_caption`, `card_summary` 작성 (권장)
- [ ] `references` 존재 (3-5개, category 포함)
- [ ] `first_author_scholar_url` 확인 (optional)

### Figure/Table 이미지 검증
- [ ] `fig-N.{ext}` 파일이 포스트 디렉토리에 존재 (갯수 확인)
- [ ] `meta.json`의 `figures[]` 배열 항목 수 == 실제 fig 파일 수
- [ ] 각 `figures[]` 항목의 `src` 파일명이 실제 파일과 일치
- [ ] 각 `figures[]` 항목의 `caption`이 원문 전체 캡션
- [ ] `tables[]` 배열: 이미지 테이블이면 항목 존재, HTML 테이블이면 빈 배열
- [ ] `node scripts/copy-post-images.mjs` 실행 → public 디렉토리에 복사 확인

### MDX 본문 검증
- [ ] MDX body에 Source/참조논문/Terry's memo 섹션 없음
- [ ] MDX body에 `<Figure>` / `<Collapsible>` 올바르게 사용
- [ ] 핵심 아이디어 섹션에 인라인 Figure 삽입 (필수, 커버 ≠ 인라인)
- [ ] 주요 결과 섹션에 results Figure 삽입 (필수)
- [ ] MDX `<Figure src>` 경로가 실제 파일명과 일치
- [ ] ko.mdx 인라인 Figure 캡션이 한국어
- [ ] `caption_ko` 19개 전수 존재 (meta.json)
- [ ] references에 `project_url` 확인 (해당 논문에 프로젝트 페이지가 있으면)
- [ ] 역참조 확인: 새 포스트의 source_url이 기존 포스트 references의 arxiv_url과 일치 시 post_slug 추가

### 빌드 검증
- [ ] `rm -rf .next && npm run build` 성공
- [ ] ko/en 모두 SSG 렌더링 확인

### 예외 처리
- Figure 추출 실패 → placeholder cover
- 숫자 추출 실패 → `정량 비교 수치 확인 불가` 명시
- arXiv 링크 미확인 → `arxiv_url` 생략, `scholar_url`만 제공
- Project 페이지 미확인 → `source_project_url` 생략
- 1저자 Scholar URL 미확인 → `first_author_scholar_url` 생략
