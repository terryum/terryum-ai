---
name: survey
description: "Survey 추가. Vercel 배포된 서베이 책 사이트를 Surveys 갤러리에 등록. 소개글, 목차 요약, 커버 이미지 자동 생성 지원."
argument-hint: "<URL | --title=... --embed=...> [--featured] [--status=active|archived|wip] [--visibility=group --group=snu]"
---

# Survey 추가 파이프라인

입력: $ARGUMENTS

## 공개 범위 (visibility) 옵션
- `--visibility=group --group=snu` → 그룹 전용 서베이
  - **surveys.json에 추가하지 않음** — Supabase `private_content` 테이블에 직접 저장
  - `content_type: 'surveys'`, `group_slug`, `meta_json` (전체 SurveyMeta 객체)
  - 커버 이미지 → Supabase Storage `private-covers/{slug}/cover.webp`
  - **Git 커밋/푸시 불필요**
- 기본값: `visibility: "public"` (surveys.json에 저장)

## Step 1) URL/정보 수집

- Vercel URL 또는 embed URL 제공 시 → WebFetch로 사이트 접속하여 목차, 소개글 추출
- GitHub URL 제공 시 → README에서 목차, 설명 추출
- `--title`, `--embed`, `--toc` 등 수동 옵션도 가능

## Step 2) 메타데이터 구성

```json
{
  "slug": "book-example",
  "survey_number": N,
  "title": { "ko": "...", "en": "..." },
  "description": { "ko": "...", "en": "..." },
  "cover_image": "/images/projects/{slug}-cover.webp",
  "tech_stack": ["Robotics", "Survey"],
  "toc": ["Chapter 1", "Chapter 2", ...],
  "links": [
    { "type": "demo", "url": "https://...", "label": "Read" },
    { "type": "github", "url": "https://github.com/..." }
  ],
  "embed_url": "https://...",
  "status": "active",
  "featured": true,
  "order": 0,
  "published_at": "2026-01-01"
}
```

- `survey_number`: `surveys.json`의 `next_survey_number` 사용 후 증가
- `toc`: 사이트/README에서 추출한 목차 배열

## Step 3) 이미지 생성

`/gemini-3-image-generation` 스킬로 두 가지 이미지를 생성한다:

1. **커버 이미지** (정사각형, 1:1): 카드 썸네일용
   - `public/images/projects/{slug}-cover.webp` (public) 또는 Supabase Storage (group)
2. **OG 이미지** (1200x630, 16:9): 소셜 공유용 대표 이미지
   - `public/images/projects/{slug}-og.jpg` (public) 또는 Supabase Storage (group)
   - JPEG 형식 (X/Twitter 호환)

공유 URL: `/surveys/{slug}` (lang 없는 경로) → 자동 리다이렉트 + OG 메타태그 제공.

## Step 4) surveys.json 업데이트

`projects/surveys/surveys.json`의 `surveys` 배열에 추가.
`next_survey_number` 증가.

## Step 5) 빌드 + 검증

```bash
npx tsc --noEmit
npm run build
```

## Step 6) Git 커밋 + 푸시 (public만)

```bash
git add projects/surveys/ public/images/projects/
git commit -m "feat(survey): add {slug}"
git push
```
