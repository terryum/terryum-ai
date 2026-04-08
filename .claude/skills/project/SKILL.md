---
name: project
description: "Project 갤러리 추가. GitHub URL 또는 수동 입력(책, 제품 등)으로 프로젝트 카드를 생성. 다중 링크, 커버 이미지 자동 생성(/gemini-3-image-generation) 지원."
argument-hint: "<GitHub-URL | --type=book --title=... --url=...> [--featured] [--status=active|archived|wip] [--visibility=group --group=snu]"
---

# Project 갤러리 추가 파이프라인

입력: $ARGUMENTS

## 공개 범위 (visibility) 옵션
- `--visibility=group --group=snu` → 그룹 전용 프로젝트
  - projects.json에 `"visibility": "group"`, `"allowed_groups": ["snu"]` 추가
  - 메인 사이트에서 해당 그룹 로그인 세션이 있어야만 노출됨
- 기본값: `visibility: "public"` (생략 가능)

---

## Step 0) 입력 타입 감지

$ARGUMENTS에서 프로젝트 타입을 자동 감지한다.

- `https://github.com/` 포함 → **GitHub 경로**
- `--type=book` 명시 또는 GitHub URL 없음 → **수동 경로** (책, 제품 등)

```
/project https://github.com/terryum/awesome-deep-learning-papers          → GitHub 경로
/project https://github.com/terryum/awesome-deep-learning-papers --featured
/project --type=book --title="책 제목" --url=https://...                  → 수동 경로
```

---

## GitHub 경로

### Step 1) GitHub URL 파싱

$ARGUMENTS에서 GitHub URL을 추출한다.

- `owner/repo` 추출
- `--featured` 플래그 확인 (기본: false)
- `--status=active|archived|wip` 확인 (기본: archived → README에 최근 업데이트 없으면, active → 있으면)
- `--tech=tag1,tag2` 확인 (없으면 자동 감지)

## Step 2) GitHub API로 레포 정보 수집

`gh api repos/{owner}/{repo}` 또는 WebFetch로 정보를 가져온다:

- `name` → slug
- `description` → 영문 설명
- `topics` → tech_stack 후보
- `language` → 주 언어
- `homepage` → demo 링크 후보
- `html_url` → GitHub 링크
- `created_at`, `pushed_at` → 날짜 정보

README.md도 읽어서:
- 프로젝트에 대한 더 자세한 설명 추출
- 한국어 설명이 있으면 활용

## Step 3) 메타데이터 구성

다음 형식으로 ProjectMeta 객체를 구성한다:

```json
{
  "slug": "awesome-deep-learning-papers",
  "title": {
    "ko": "한국어 제목",
    "en": "English Title"
  },
  "description": {
    "ko": "한국어 설명 (1-2문장)",
    "en": "English description (1-2 sentences)"
  },
  "cover_image": "/images/projects/{slug}-cover.webp",
  "tech_stack": ["Python", "Deep Learning"],
  "links": [
    { "type": "github", "url": "https://github.com/owner/repo" },
    { "type": "demo", "url": "https://...", "label": "Live Demo" }
  ],
  "embed_url": "https://my-project.vercel.app/",
  "status": "active",
  "featured": false,
  "order": 0,
  "published_at": "2024-01-15"
}
```

- `order`는 기존 projects.json의 마지막 order + 1
- `published_at`는 레포의 `created_at` 사용
- `status`는 `pushed_at`이 1년 이내면 `active`, 아니면 `archived`

### embed_url 규칙
- **Vercel 링크** (`*.vercel.app`) → `embed_url`에 설정 (iframe 내부 임베딩)
  - 카드 클릭 시 `/projects/[slug]` 내부 페이지로 이동
- **그 외 링크** → `embed_url` 없음 (외부 링크, 새 탭에서 열림)
- 사용자가 명시적으로 임베딩/외부 링크 지정 시 그에 따름

## Step 4) 커버 이미지 생성

`/gemini-3-image-generation` 스킬을 사용하여 커버 이미지를 생성한다.

프롬프트 구성:
- 프로젝트의 핵심 주제를 반영하는 추상적/기술적 일러스트
- 16:9 비율, 깔끔한 디자인
- 텍스트 없이 시각적 이미지만

생성된 이미지를 `public/images/projects/{slug}-cover.webp`로 저장한다.

API 키가 없거나 생성 실패 시 → `scripts/gen-project-cover.mjs`를 참고하여 SVG 기반 placeholder 이미지를 생성한다.

## Step 5) projects.json 업데이트

`projects/gallery/projects.json`을 읽어 `projects` 배열에 새 항목을 추가한다.

- 이미 같은 slug이 있으면 업데이트 (덮어쓰기)
- 없으면 배열 끝에 추가

## Step 6) 검증

추가된 프로젝트 정보를 출력한다:

```
✅ 프로젝트 추가 완료
slug: awesome-deep-learning-papers
title: Awesome Deep Learning Papers
status: archived
tech_stack: [Python, Deep Learning, ...]
cover: /images/projects/awesome-deep-learning-papers-cover.webp
links: GitHub
```

`npx tsc --noEmit`으로 타입 체크를 실행한다.

---

## 수동 경로 (책, 제품 등)

GitHub 경로와 동일한 Step 3~6을 따르되, 정보 수집을 사용자 입력/URL에서 한다.

### 입력 파싱
```
/project --type=book --title="대학원생 때 알았더라면 좋았을 것들" --url=https://gradschoolstory.chkwon.net/
/project --type=book --slug=my-book --cover=/path/to/cover.jpg
```

- `--type=book|product|other` → 첫 번째 링크 타입 결정
- `--title` → 프로젝트 제목 (없으면 URL에서 추출하거나 사용자에게 요청)
- `--url` → 주 링크 (썸네일 클릭 시 이동 대상, links 배열의 첫 번째)
- `--cover` → 커버 이미지 경로 (있으면 sharp로 16:9 크롭 + WebP 변환)
- `--slug` → 슬러그 (없으면 제목에서 자동 생성)

### 다중 링크
links 배열에 여러 링크를 추가할 수 있다. **첫 번째 링크가 primary** (썸네일 클릭 대상).
사용자가 추가 링크를 언급하면 배열에 추가:
```json
"links": [
  { "type": "other", "url": "https://blog.example.com", "label": "Blog" },
  { "type": "book", "url": "https://kyobobook.co.kr/...", "label": "Book" },
  { "type": "github", "url": "https://github.com/...", "label": "GitHub" }
]
```
지원 타입: `github`, `demo`, `paper`, `book`, `other`

### 커버 이미지 처리
- `--cover` 제공 시: sharp로 16:9 비율 크롭 → `public/images/projects/{slug}-cover.webp`로 저장
  - 책 표지: 상단(제목 영역) 위주로 크롭
- `--cover` 없으면: `/gemini-3-image-generation` 또는 SVG placeholder 사용

### 메타데이터
- 제목/설명은 ko/en 모두 입력 또는 번역 생성
- `tech_stack`: 책이면 `["Book", ...]`, 제품이면 관련 기술
- `published_at`: `--date=` 또는 사용자에게 질문
