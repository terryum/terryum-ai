# Research Post — 비-arXiv 소스 로딩 가이드

> arXiv 외 학술 소스(Nature, IEEE, ACM 등)에서 Research 포스트를 생성할 때의 차이점과 절차를 정리한다.
> 공통 파이프라인/스키마/MDX 구조는 `docs/POST_GENERATOR_RESEARCH.md` 참조.
> arXiv 전용 로딩 가이드는 `docs/POST_LOADING_ARXIV.md` 참조.
> 요약 품질/톤 규칙은 `docs/RESEARCH_SUMMARY_RULES.md` 참조.

---

## 공통 사항 (소스 무관)

아래는 arXiv든 Nature든 모든 소스에 동일하게 적용되는 사항이다.

- **출력 파일**: `meta.json`, `ko.mdx`, `en.mdx`, `cover.webp`, `fig-*.{ext}`, `paper/<slug>.pdf`
- **meta.json 스키마**: `POST_GENERATOR_RESEARCH.md`의 메타데이터 스키마와 동일
- **MDX 구조**: TL;DR → 문제 → 핵심 아이디어 → 구체적 방법(Collapsible) → 주요 결과 → 달성점과 한계점
- **AI Memory 필드**: `post_number`, `domain`, `subfields`, `key_concepts`, `methodology`, `contribution_type`, `relations`, `ai_summary`
- **후처리 스크립트**: `node scripts/generate-index.mjs`, `node scripts/copy-post-images.mjs`
- **빌드 검증**: `rm -rf .next && npm run build`

---

## 소스별 차이 비교표

| 항목 | arXiv | Nature / Springer | IEEE Xplore | ACM DL |
|---|---|---|---|---|
| `source_type` | `"arXiv"` | `"Nature Communications"` 등 저널명 | `"IEEE"` | `"ACM"` |
| URL 패턴 | `arxiv.org/abs/<id>` | `nature.com/articles/<doi-suffix>` | `ieeexplore.ieee.org/document/<id>` | `dl.acm.org/doi/<doi>` |
| PDF URL | `arxiv.org/pdf/<id>.pdf` | `nature.com/articles/<doi-suffix>.pdf` | 로그인 필요 (별도 다운) | 로그인 필요 |
| Figure 추출 | arXiv HTML (`/html/<id>v<ver>/`) | Springer CDN (아래 참조) | PDF fallback | PDF fallback |
| slug 날짜 기준 | arXiv v1 제출일 (`YYMM`) | 발행 월 (`YYMM`) | 발행 월 | 발행 월 |
| `source_date` | arXiv v1 제출일 (ISO 날짜) | 저널 발행월 (ISO 날짜) | 발행 월 | 발행 월 |
| 메타데이터 소스 | arXiv API / HTML | article HTML meta tags | IEEE API / HTML | ACM HTML |
| Tables | HTML 렌더링 → `tables: []` | HTML 렌더링 → `tables: []` | 보통 PDF 이미지 | PDF 이미지 |

---

## Nature / Springer 전용 가이드

### URL 패턴

- 논문 페이지: `https://www.nature.com/articles/s41467-024-XXXXX-X`
- PDF: 위 URL + `.pdf`
- DOI: `10.1038/s41467-024-XXXXX-X`

### Figure 이미지 다운로드

Nature/Springer 논문의 full-resolution Figure URL 패턴:

```
https://media.springernature.com/full/springer-static/image/art%3A10.1038%2F{doi-suffix}/MediaObjects/{article-id}_Fig{N}_HTML.png
```

**예시** (doi: `10.1038/s41467-024-50101-w`):
- `doi-suffix`: `s41467-024-50101-w`
- `article-id`: `41467_2024_50101`  (하이픈 → 언더스코어, `s` 제거)
- Figure 1: `https://media.springernature.com/full/springer-static/image/art%3A10.1038%2Fs41467-024-50101-w/MediaObjects/41467_2024_50101_Fig1_HTML.png`

### 메타데이터 추출

Nature article HTML에서 추출 가능한 메타데이터:
- `<meta name="dc.title">` → 제목
- `<meta name="dc.creator">` → 저자
- `<meta name="dc.date">` → 발행일
- `<meta name="citation_doi">` → DOI
- Abstract는 본문 내 `<div id="Abs1-content">` 또는 PDF에서 추출

### 캡션 추출

- Nature HTML에서 각 Figure의 캡션은 `<figcaption>` 태그 내에 존재
- 또는 PDF 텍스트에서 `Fig. N |` 패턴으로 추출 가능
- **캡션 원문 전체 작성** 규칙은 동일하게 적용

### Tables 처리

- Nature 논문의 테이블은 대부분 HTML 렌더링 → 이미지 추출 불가
- `tables: []` (빈 배열)으로 처리
- 주요 수치는 MDX 본문 텍스트에 포함

### source_type 값

저널명을 그대로 사용:
- `"Nature Communications"`
- `"Nature"` (메인 저널)
- `"Nature Machine Intelligence"`
- `"Scientific Reports"`

UI의 `SourceBadge` 컴포넌트가 `source_type` 값을 동적으로 렌더링하므로 코드 변경 불필요.

---

## 새 소스 추가 체크리스트

향후 IEEE, ACM, Science 등 새 소스 추가 시 아래 항목을 확인한다.

### 1. 기본 정보 파악
- [ ] PDF 다운로드 URL 패턴 확인 (로그인 필요 여부)
- [ ] Figure full-resolution 이미지 URL 패턴 확인
- [ ] 메타데이터 추출 방법 확인 (HTML meta tags, API 등)
- [ ] 캡션 추출 방법 확인

### 2. slug 규칙
- [ ] 날짜 기준 결정 (발행일 기준 `YYMM`)
- [ ] slug 생성: `{YYMM}-{descriptive-name}`

### 3. meta.json
- [ ] `source_type`: 저널/컨퍼런스명 사용 (e.g., `"IEEE ICRA"`, `"ACM CHI"`)
- [ ] `source_url`: 논문 페이지 URL (PDF URL 아님)
- [ ] 나머지 필드는 공통 스키마와 동일

### 4. Figure 처리
- [ ] 가능하면 웹에서 full-res 이미지 다운로드
- [ ] 불가능하면 PDF에서 이미지 추출
- [ ] 파일명 규칙: `fig-N.{원본확장자}` (변환 금지)

### 5. 검증
- [ ] `node scripts/generate-index.mjs` 성공
- [ ] `node scripts/copy-post-images.mjs` 성공
- [ ] `rm -rf .next && npm run build` 성공
- [ ] `source_type`이 SourceBadge에 정상 표시

---

## 실전 예시: Nature Communications 논문

**대상**: `2407-stretchable-glove-hand-pose`

| 항목 | 값 |
|---|---|
| source_type | `"Nature Communications"` |
| source_url | `https://www.nature.com/articles/s41467-024-50101-w` |
| slug 날짜 | `2407` (2024년 7월 발행) |
| PDF | `https://www.nature.com/articles/s41467-024-50101-w.pdf` |
| Figure URL | Springer CDN 패턴 사용 (위 참조) |
| Figure 수 | 7개 (`fig-1.png` ~ `fig-7.png`) |
| Tables | HTML 렌더링 → `tables: []` |
