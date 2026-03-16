# Blog Post Generator 스펙 (Ideas & Essays)

> 직접 작성한 글(Ideas, Essays) 포스트 파일 세트를 생성하는 파이프라인.
> Research 포스트(`POST_GENERATOR_RESEARCH.md`)와 달리, 외부 논문 요약이 아닌 자유 본문 작성 스타일.

---

## 콘텐츠 타입 구분

| 타입 | 폴더 | content_type | 특징 |
|---|---|---|---|
| **Ideas** | `posts/idea/<slug>/` | `"ideas"` | 짧은 단상, 아이디어, 에세이 (~ 수백 ~ 수천 자) |
| **Essays** | `posts/essay/<slug>/` | `"essays"` | 긴 형식 에세이 (섹션 구조 가능) |

둘 다 동일한 파이프라인 사용. 배치 폴더와 tags만 다름.

---

## 태깅 아키텍처

### 카테고리 구조
- Research / Ideas / Essays는 모두 `posts/` 하위의 Post이며, **타입 구분이 없는 동일한 구조**이다.
- 헤더 탭(Ideas / Essays / Research)은 **해당 카테고리 태그 유무로만 분류**된다.
  - 따라서 **카테고리 태그가 없으면 탭에 표시되지 않음**.
- `src/lib/posts.ts`의 `normalizeTags()` 함수가 폴더 경로를 기반으로 카테고리 태그를 자동 prepend한다.
  - `posts/idea/` → `"Ideas"` 태그 자동 추가 (없을 때만)
  - `posts/essay/` → `"Essays"` 태그 자동 추가 (없을 때만)
  - `posts/research/` → `"Research"` 태그 자동 추가 (없을 때만)

### 태깅 규칙
- **첫 번째 태그**: 카테고리 태그 (`"Ideas"` 또는 `"Essays"`) — **대문자**, 명시적 작성 권장
- **추가 태그**: 글의 주제/키워드를 영어로 (예: `"AI"`, `"Philosophy"`, `"Labor"`)
- 자동 보완이 있어도 명시적 작성이 Research 포스트와 일관성을 유지함

### 예시
```json
// Ideas 포스트
"tags": ["Ideas", "AI", "Philosophy"]

// Essays 포스트
"tags": ["Essays", "Technology", "Society"]
```

---

## 입력 케이스

### Case A: 한글 + 영문 모두 제공
- 마크다운(또는 `.md`) 파일에 한글·영문 본문 포함
- 번역 작업 불필요

### Case B: 한글만 제공
- 한글 본문 → 영문 번역 필요
- 원문의 뉘앙스·전문 용어·문체를 살려 자연스럽게 번역

### Case C: 커버 이미지 없음
- `cover.webp` 없으면 `generate-thumbnails.mjs`가 해당 포스트를 건너뜀
- placeholder 이미지 또는 텍스트 기반 커버 생성 고려

---

## 입력 파일 규칙

사용자가 제공하는 파일은 아래 이름으로 포스트 폴더에 보관:

| 파일명 | 역할 |
|---|---|
| `post_original.md` | 원본 초안 (한글+영문 또는 한글만) |
| `cover_Original.png` (또는 `.jpg`) | 원본 커버 이미지 |
| `thumb_original.png` (또는 `.jpg`) | 선택적 썸네일 소스 |

---

## 출력 파일 세트

| 파일 | 필수 | 설명 |
|---|---|---|
| `meta.json` | **필수** | 언어 무관 메타데이터 |
| `ko.mdx` | **필수** | 한국어 본문 + frontmatter |
| `en.mdx` | **필수** | 영문 본문 + frontmatter |
| `cover.webp` | **필수** | 커버 이미지 (WebP 변환) |

---

## 파이프라인

### Step 1) Slug 결정
- 규칙: `YYMMDD-<영문-kebab-title>`
- 예: `260310-on-the-manifold-first-post`
- 폴더명 = slug = `post_id`

### Step 2) 커버 이미지 변환
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

### Step 3) meta.json 생성
```json
{
  "post_id": "<slug>",
  "slug": "<slug>",
  "post_number": <N>,
  "published_at": "<ISO 8601>",
  "updated_at": "<ISO 8601>",
  "status": "published",
  "content_type": "<ideas 또는 essays>",
  "tags": ["<Ideas 또는 Essays>", "<주제 태그1>", "<주제 태그2>"],
  "cover_image": "./cover.webp",
  "thumb_source": "./thumb_original.png",
  "reading_time_min": <N>,
  "domain": "<최상위 연구 분야>",
  "subfields": ["<세부 분야>"],
  "key_concepts": ["<핵심 개념>"],
  "idea_status": "<hypothesis|exploring|validated|abandoned|incorporated>",
  "related_posts": ["<관련 포스트 slug>"],
  "ai_summary": {
    "one_liner": "<한 줄 요약>",
    "problem": "<문제>",
    "solution": "<해법>",
    "key_result": "<핵심 결과>",
    "limitations": ["<한계점>"]
  },
  "figures": [],
  "tables": [],
  "newsletter_eligible": false,
  "featured": false
}
```
- `thumb_source`: 별도 썸네일 소스가 있으면 지정, 없으면 생략 (cover.webp 자동 사용)
- `reading_time_min`: 한국어 기준 250자/분으로 계산

### Step 4) MDX 파일 생성

#### ko.mdx
```yaml
---
locale: "ko"
title: "<한국어 제목>"
subtitle: "<Substack 부제, 에세이적 1줄, 25자 이내>"
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
subtitle: "<Substack subtitle, essay-style 1 line, within 25 chars>"
summary: "<2-3 sentence summary>"
card_summary: "<short card summary>"
terrys_memo: ""
---
[English body]
```

#### MDX 본문 규칙
- **TL;DR 섹션 없음** (Research 포스트 전용)
- **References/Source 섹션 없음** (frontmatter에도 references 불필요)
- 본문은 자유 에세이 형식
- 헤더는 `##`부터 사용 (H1은 title frontmatter)
- 필요시 `<Figure>`, `<Collapsible>` 컴포넌트 사용 가능

#### Substack 구독 블럭 (자동 삽입)
- MDX에 직접 추가할 필요 없음
- `ContentDetailPage.tsx`가 `content_type === 'essays' || 'tech'` 조건으로 포스트 하단에 자동 삽입
- Ideas 포스트(`content_type: "ideas"`)에도 구독 블럭을 표시하려면 `ContentDetailPage.tsx`의 조건에 `'ideas'` 추가 필요

### Step 5) 빌드 스크립트 실행
```bash
node scripts/copy-post-images.mjs
node scripts/generate-thumbnails.mjs
node scripts/generate-index.mjs
```

---

## 메타데이터 스키마

### meta.json (언어 무관 필드)

| 키 | 타입 | 설명 |
|---|---|---|
| `post_id` | string | slug과 동일 |
| `slug` | string | 폴더명과 동일 |
| `published_at` | string | ISO 8601 |
| `updated_at` | string | ISO 8601 |
| `status` | string | `"draft"` 또는 `"published"` |
| `content_type` | string | `"essays"` 또는 `"ideas"` (폴더 타입과 일치) |
| `tags` | string[] | `["Ideas"]` 또는 `["Essays"]` + 추가 태그 (카테고리 태그 **대문자** 필수) |
| `cover_image` | string | `"./cover.webp"` |
| `thumb_source` | string | 썸네일 소스 (optional) |
| `reading_time_min` | number | 읽기 시간 (분) |
| `figures` | array | 본문 이미지 배열 (없으면 `[]`) |
| `tables` | array | 테이블 이미지 배열 (통상 `[]`) |
| `newsletter_eligible` | boolean | `false` (v1 미사용) |
| `featured` | boolean | `false` |
| `post_number` | number | 글로벌 순번 (등록순, 마지막 +1) |
| `domain` | string | 최상위 연구 분야 |
| `subfields` | string[] | 세부 분야 |
| `key_concepts` | string[] | 핵심 개념 (AI semantic matching용) |
| `idea_status` | string | Ideas 전용: `hypothesis` \| `exploring` \| `validated` \| `abandoned` \| `incorporated` |
| `related_posts` | string[] | 관련 포스트 slug 목록 |
| `ai_summary` | object | AI 구조화 요약 (`one_liner`, `problem`, `solution`, `key_result`, `limitations`) |

> Research 전용 필드 (`source_url`, `source_title`, `source_author`, `source_type`, `source_authors_full`, `cover_caption` 등)는 **사용하지 않음**.

### MDX frontmatter (언어별 필드)

| 키 | 타입 | 설명 |
|---|---|---|
| `locale` | string | `"ko"` 또는 `"en"` |
| `title` | string | 제목 |
| `summary` | string | 2-3문장 요약 |
| `card_summary` | string | 카드용 짧은 요약 |
| `terrys_memo` | string | Terry의 메모 (빈 문자열이면 미표시) |
| `translation_of` | string | en.mdx에만 사용 (`"<slug>:ko"`) |

---

## 이미지 처리 규칙

### cover.webp 변환
- 최대 너비 1200px (원본이 작으면 확대 금지 `withoutEnlargement: true`)
- WebP 품질 90, 원본 비율 유지

### 썸네일 (cover-thumb.webp)
- **빌드타임 자동 생성** (`generate-thumbnails.mjs`)
- 기본: `cover.webp`에서 288×288 center crop
- `meta.json`의 `thumb_source` 지정 시 해당 이미지 사용
- `meta.json`의 `thumb_position` / `thumb_extract`로 crop 조정 가능

---

## 검수 체크리스트

### 파일
- [ ] `meta.json`, `ko.mdx`, `en.mdx`, `cover.webp` 생성
- [ ] `post_id == slug == 폴더명` 일치
- [ ] `posts/idea/<slug>/` 또는 `posts/essay/<slug>/`에 배치

### 메타데이터
- [ ] `content_type: "writing"` 설정
- [ ] `tags` 첫 번째 항목이 `"Ideas"` 또는 `"Essays"` (대문자) — 탭 표시 필수
- [ ] `source_*` 필드 없음
- [ ] `card_summary` 작성
- [ ] `post_number` 부여 (글로벌 순번, 마지막 +1)
- [ ] `domain`, `subfields`, `key_concepts` 작성
- [ ] `idea_status` 설정 (Ideas 포스트만)
- [ ] `ai_summary` 작성
- [ ] `node scripts/generate-index.mjs` 실행

### MDX 본문
- [ ] TL;DR 섹션 없음
- [ ] Source/References 섹션 없음
- [ ] ko.mdx, en.mdx 양쪽 모두 본문 존재

### 빌드
- [ ] `node scripts/copy-post-images.mjs` 실행 완료
- [ ] `node scripts/generate-thumbnails.mjs` 실행 완료
- [ ] `npm run dev` → `/ko/posts/<slug>`, `/en/posts/<slug>` 접근 확인
- [ ] Ideas 또는 Essays 탭에 카드 표시 (썸네일 포함)
- [ ] 언어 전환 시 ko/en 전환 확인
