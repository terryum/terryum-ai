# Research Post — arXiv 로딩 가이드

> arXiv 소스에 특화된 메타데이터 수집, PDF 다운로드, figure 추출 방법.
> 공통 파이프라인/스키마/MDX 구조는 `docs/POST_GENERATOR_RESEARCH.md` 참조.
> 비-arXiv 소스는 `docs/POST_LOADING_ETC.md` 참조.

---

## Step 0) 입력 정규화

- `abs/<id>` / `pdf/<id>.pdf` 모두 허용 → arXiv ID 추출
- 버전 명시 없으면 최신 버전으로, `source_date`는 항상 v1 기준

## Step 1) 메타데이터 수집

arXiv API (`https://export.arxiv.org/abs/<id>`) 또는 HTML에서 추출:

| 필드 | 출처 |
|---|---|
| 제목, 저자, 초록, 카테고리 | arXiv API / HTML |
| v1 제출일 | arXiv API `<published>` 태그 → `source_date` (ISO 날짜) |
| PDF URL | `https://arxiv.org/pdf/<id>.pdf` |
| Project 페이지 | 논문 본문 또는 abstract 페이지에서 추출 (optional) |

**`source_date` 추출**: API 응답의 `<published>` 값 (UTC) → ISO date 형식 (`YYYY-MM-DD`)
- 예: `<published>2025-05-28T17:59:20Z</published>` → `"2025-05-28"`

## Step 1-1) 1저자 Scholar URL 추출

- Google Scholar에서 논문 제목 검색 → 1저자 프로필 링크 추출
- 못 찾으면 `first_author_scholar_url` 생략

## Step 2) PDF 다운로드

- `paper/<slug>.pdf`에 저장 (`.gitignore` 포함)

## Step 3) Figure 추출

### arXiv HTML Figure URL 패턴

- Base URL: `https://arxiv.org/html/<id>v<ver>/`
- `<img>` src는 상대경로 → base URL에 붙여서 다운로드
  - 예: `extracted/6484354/figures/teaser.jpg` → `https://arxiv.org/html/2505.22159v1/extracted/6484354/figures/teaser.jpg`
  - 예: `x1.png` → `https://arxiv.org/html/2505.22159v1/x1.png`

### 파일명 규칙

- 모든 figure → `fig-N.{원본확장자}` (N = 원문 figure 번호)
- 모든 table (이미지) → `tab-N.{원본확장자}`
- **원본 확장자 유지** (변환 금지)

## meta.json arXiv 전용 필드

| 필드 | 값 |
|---|---|
| `source_type` | `"arXiv"` |
| `source_url` | `https://arxiv.org/abs/<id>` |
| `source_date` | arXiv v1 제출일 (ISO 날짜) |
| `google_scholar_url` | 자동 생성 (sanitizeTitle 사용) 또는 수동 지정 |
