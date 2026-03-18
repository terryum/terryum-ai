# Post 생성 파이프라인

입력: $ARGUMENTS

---

## Step 0) 타입 자동 감지

- `https://arxiv.org/` 포함 → **Research 경로** (아래 Research 섹션 실행)
- `--type=blog` 명시 또는 arXiv URL 없음 → **Blog 경로** (아래 Blog 섹션 실행)

```
/post https://arxiv.org/abs/2505.22159          → Research 경로
/post https://arxiv.org/abs/2505.22159 --tags=VLA
/post --type=blog 260315-rebalancing            → Blog 경로
/post --type=blog                               → Blog 경로 (slug 확인 후 진행)
```

---

## Research 경로 (arXiv)

입력: `https://arxiv.org/abs/<id> [--tags=TAG1,TAG2] [--memo=메모] [--featured]`

모든 단계를 권한 요청 없이 완료할 것.

### Step R1) 요약 규칙 로드
`docs/RESEARCH_SUMMARY_RULES.md` 읽기

### Step R2) URL 파싱
arXiv ID 추출, 슬러그 결정 (`YYMM-<short-name>`)

### Step R3) Graph Analysis (새 논문 추가 전)
a. `posts/index.json` 로드 → `concept_index`, `posts` 배열 확인
b. 새 논문의 key_concepts와 기존 논문의 concept_index 비교
c. **taxonomy 배치 제안**:
   - `posts/taxonomy.json`의 nodes 확인
   - primary: key_concepts/domain에서 가장 자연스러운 taxonomy 노드
   - secondary: 두 번째 겹침 노드 (있으면)
d. **관계 후보 생성**:
   - concept 2개+ 겹침 → `related`
   - 같은 VLA/method + 이 논문이 개선 → `builds_on` 또는 `extends`
   - 같은 task, 다른 방법 → `compares_with`
   - 기존 논문의 한계를 보완 → `fills_gap_of`
e. **outlier 판단**: 기존 clusters와 concept 겹침이 1개 이하이면 경고 출력
f. meta.json 생성 전에 아래를 출력:
   ```
   📊 Graph Context:
   - Taxonomy: robotics/brain (primary), robotics/arm (secondary)
   - Related: [slug] (builds_on), [slug] (compares_with)
   - Clusters: vla-robotics 클러스터에 합류
   ```

### Step R4) 메타데이터 수집
`https://export.arxiv.org/abs/<id>` API → 제목, 저자, 초록, v1 제출일

### Step R5) PDF 다운로드
`posts/papers/<slug>/paper/<slug>.pdf` 로 저장
URL: `https://arxiv.org/pdf/<id>`

### Step R6) Figure 추출
- `GET https://arxiv.org/html/<id>v1/` → 200이면 img src 전수 추출 + 다운로드
- **404이면 즉시 PDF fallback** (Semantic Scholar 등 외부 사이트 탐색 금지):
  a. `python scripts/extract-paper-pdf.py posts/papers/<slug>/paper/<slug>.pdf posts/papers/<slug>/`
  b. `extraction_report.json` 읽기 → figures/captions 자동 적용
  c. `suggested_cover`를 `cover.webp`로 PIL 변환

### Step R7) MDX 생성
`docs/RESEARCH_SUMMARY_RULES.md` 기준으로 `ko.mdx` + `en.mdx` 생성
- frontmatter: title, summary, card_summary, cover_caption, published_at (현재 ISO), source_type, source_url, source_date, display_tags, figures, tables, references

### Step R8) meta.json 생성
- **status 항상 `"published"`** (draft 옵션 없음)
- `--featured` 시 `featured: true`
- `display_tags`: `--tags=` 값, `terrys_memo`: `--memo=` 값
- **Graph Analysis 결과 포함**: `taxonomy_primary`, `taxonomy_secondary`, `relations`
- **필수 메타데이터 필드**:
  - `source_title`: arXiv 원문 제목
  - `source_author`: "1저자 et al." 형식
  - `source_authors_full`: 전체 저자 목록 (이름 + 소속)
  - `source_url`, `source_type`, `source_date`
  - `google_scholar_url`: 논문 제목 기반 Scholar 검색 URL
  - `source_project_url`: 프로젝트 페이지 URL (있으면)

### Step R9) 빌드 스크립트 실행
```bash
node scripts/copy-post-images.mjs
node scripts/generate-thumbnails.mjs
node scripts/generate-index.mjs
node scripts/generate-og-image.mjs
```

### Step R10) Build 검증
```bash
npm run build
```
실패 시 에러 수정 후 재실행

### Step R11) Git 커밋 + 푸시
```bash
git add posts/ public/posts/
git commit -m "feat(post): add <slug> (ko/en)"
git push
```

---

## Research 경로 플래그 파싱 규칙

- `--tags=VLA,robotics`: display_tags 배열로 변환
- `--memo=내용`: terrys_memo 필드로 저장
- `--featured`: meta.json에 `featured: true` 추가

## PDF fallback 상세 (`scripts/extract-paper-pdf.py`)

```
사용법: python scripts/extract-paper-pdf.py <pdf_path> <output_dir> [--max-pages=38]
출력:  output_dir/fig-N.{ext} 파일들 + extraction_report.json
```

`extraction_report.json` 구조:
```json
{
  "figures": [
    {"seq_num": 1, "file": "fig-1.png", "page": 5, "caption": "...", "is_cover_candidate": false},
    {"seq_num": 3, "file": "fig-3.png", "page": 12, "caption": "The overview...", "is_cover_candidate": true}
  ],
  "suggested_cover": "fig-3.png",
  "total_extracted": 5
}
```

**의존성**: `pymupdf` + `pypdf` (이미 설치됨). 미설치 시 `pip install pymupdf pypdf`

## Research 주의사항

- 허위 수치/사실 생성 절대 금지 — 결과 숫자는 표/본문/캡션 확인된 수치만
- Figure 캡션: 원문 전체 작성, 생략/축약 금지
- **MDX Figure 캡션 i18n 규칙**: `ko.mdx`의 `<Figure caption="...">` 값은 반드시 `meta.json`의 해당 figure `caption_ko` 값을 사용. `en.mdx`는 `caption` (영문) 사용. `meta.json` 작성 시 `caption`과 `caption_ko` 두 필드를 동시에 생성할 것
- `cover.webp`가 없으면 가장 대표적인 figure를 cover.webp로 복사
- 이미지 리네임 후 본문 경로 미치환 상태로 커밋 금지

---

---

## Blog 경로 (essays/tech)

입력: `--type=blog [<slug>]`

모든 단계를 권한 요청 없이 완료할 것.

### Step B1) 타입 + Slug 결정

- `--type=blog` + slug 인자 있으면 그대로 사용
- slug 없으면 현재 작업 컨텍스트에서 포스트 폴더 탐지 또는 사용자에게 확인
- **content_type 분기**:
  - `posts/essays/<slug>/` → `content_type: "essays"` (긴 형식 에세이)
  - `posts/tech/<slug>/` → `content_type: "tech"` (기술 글)
- Slug 규칙: `YYMMDD-<영문-kebab-title>`

### Step B2) 입력 파일 확인

```
posts/<type>/<slug>/post_original.md       원본 초안 (한글+영문 또는 한글만)
posts/<type>/<slug>/cover_Original.{png,jpg}  원본 커버 이미지
```

- `post_original.md` 없으면 사용자에게 내용 요청
- `cover_Original.*` 없으면 → `cover.webp` 생성 건너뜀 + 경고 출력
  - `generate-thumbnails.mjs`는 `cover.webp` 없으면 해당 포스트를 건너뜀

### Step B3) Cover 이미지 변환

`cover_Original.*` 있을 때만 실행:
```bash
node -e "
const sharp = require('sharp');
sharp('posts/<type>/<slug>/cover_Original.png')
  .resize(1200, null, { withoutEnlargement: true })
  .webp({ quality: 90 })
  .toFile('posts/<type>/<slug>/cover.webp')
  .then(info => console.log('cover.webp 생성:', JSON.stringify(info)));
"
```
- 최대 너비 1200px, 원본 비율 유지, WebP 품질 90

### Step B4) Graph Analysis (경량)

- `posts/index.json` 로드 → `key_concepts` 기반 유사 포스트 탐색
- 겹침 2개 이상인 포스트 → `related_posts` 후보 제안 (선택사항)

### Step B5) meta.json 생성

```json
{
  "post_id": "<slug>",
  "slug": "<slug>",
  "post_number": <마지막+1>,
  "published_at": "<ISO 8601>",
  "updated_at": "<ISO 8601>",
  "status": "published",
  "content_type": "<essays|tech>",
  "tags": ["<Essays|Tech>", "<주제태그1>", "<주제태그2>"],
  "cover_image": "./cover.webp",
  "reading_time_min": <N>,
  "domain": "<최상위 분야>",
  "subfields": ["<세부 분야>"],
  "key_concepts": ["<핵심 개념>"],
  "idea_status": null,
  "related_posts": ["<관련slug>"],
  "ai_summary": {
    "one_liner": "<한 줄 요약>",
    "problem": "<문제>",
    "solution": "<해법>",
    "key_result": "<핵심 결과>",
    "limitations": []
  },
  "figures": [],
  "tables": [],
  "newsletter_eligible": false,
  "featured": false
}
```

- `post_number`: `posts/index.json` 마지막 번호 + 1
- `reading_time_min`: 한국어 기준 250자/분으로 계산
- **태깅 규칙**: 첫 번째 태그는 카테고리 태그 (`"Essays"` 또는 `"Tech"`) — **대문자** 필수

### Step B6) MDX 파일 생성

#### ko.mdx
```yaml
---
locale: "ko"
title: "<한국어 제목>"
subtitle: "<에세이적 1줄, 40자 이내>"
summary: "<2-3문장 요약>"
card_summary: "<카드용 짧은 요약, 2줄 이내>"
terrys_memo: ""
---
[한국어 본문]
```

#### en.mdx
```yaml
---
locale: "en"
translation_of: "<slug>:ko"
title: "<영문 제목>"
subtitle: "<essay-style 1 line, within 25 chars>"
summary: "<2-3 sentence summary>"
card_summary: "<short card summary>"
terrys_memo: ""
---
[English body]
```

#### MDX 본문 규칙
- **TL;DR 섹션 없음** (Research 포스트 전용)
- **References/Source 섹션 없음**
- 본문은 자유 에세이 형식
- 헤더는 `##`부터 사용 (H1은 title frontmatter)
- 한글만 제공된 경우 → 영문 번역 (뉘앙스/문체 유지)
- 필요시 `<Figure>`, `<Collapsible>` 컴포넌트 사용 가능

### Step B7) 빌드 스크립트 실행

```bash
node scripts/copy-post-images.mjs
node scripts/generate-thumbnails.mjs
node scripts/generate-index.mjs
node scripts/generate-og-image.mjs
```

### Step B8) Build 검증

```bash
npm run build
```
실패 시 에러 수정 후 재실행

### Step B9) Git 커밋 + 푸시

```bash
git add posts/ public/posts/
git commit -m "feat(post): add <slug> (ko/en)"
git push
```
