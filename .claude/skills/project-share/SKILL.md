---
name: project-share
description: "Project Share — 프로젝트를 소셜미디어 & Substack에 공유. 프로젝트 URL/slug/제목으로 식별하여 Facebook, Threads, LinkedIn, X, Bluesky, Substack에 발행."
argument-hint: "<project-URL | slug | title> [platform-filter]"
---

# Project Share — 소셜미디어 공유

입력: $ARGUMENTS
예시:
  /project-share https://terry.artlab.ai/projects/survey-robot-hand-tactile-sensor
  /project-share survey-robot-hand-tactile-sensor
  /project-share Tactile Sensing
  /project-share survey-robot-hand-tactile-sensor X에만 올려줘
  /project-share survey-robot-hand-tactile-sensor --platform=facebook,threads

## 필수 참조
실행 전 반드시 `docs/SOCIAL_SHARE_GUIDE.md`를 읽고 플랫폼별 메시지 포맷, 커버이미지 규칙, URL 규칙을 준수할 것.

## 실행 순서 (모든 단계를 권한 요청 없이 완료할 것)

### Step 1. 프로젝트 식별

`projects/gallery/projects.json`을 읽어 $ARGUMENTS를 파싱한다.

**프로젝트 식별자 파싱** (우선순위 순서):
1. `http://` 또는 `https://` → URL 경로에서 slug 추출 (`/projects/<slug>` 또는 마지막 세그먼트)
2. 하이픈 포함 문자열 → `slug` 직접 매칭
3. 나머지 텍스트 → `title.ko` 또는 `title.en`에서 대소문자 무시 부분 매칭

**플랫폼 필터 파싱** (없으면 전체):
- 한국어 명칭 인식: `페이스북` → facebook, `쓰레드`/`스레드` → threads, `링크드인` → linkedin, `X`/`엑스`/`트위터` → x, `블루스카이` → bluesky
- `~에만`, `~만`, `--platform=a,b` 등 다양한 표현 수용
- `소셜미디어`/`소셜` 키워드 → facebook,threads,linkedin,x,bluesky (substack 제외)
- 플랫폼 미지정 → 전체: facebook,threads,linkedin,x,bluesky,substack

식별 완료 후 출력:
```
대상 프로젝트: slug (title_en)
대상 플랫폼: facebook, threads, linkedin, x, bluesky, substack
```

### Step 2. 메시지 구성

`docs/SOCIAL_SHARE_GUIDE.md`의 규칙에 따라 메시지를 구성한다. 스크립트(`publish-project-social.py`)가 자동 처리하며, 핵심 규칙:

- **Facebook** (KO): `{description.ko}` — 컴팩트, CTA 없음, link 파라미터로 URL 전달
- **Threads** (KO): `{description.ko}\n\nRead more ↓` — link_attachment로 URL 전달
- **LinkedIn** (EN): `{description.en}` — 컴팩트, CTA 없음, ARTICLE 카드로 URL 전달
- **X** (EN): `{description.en}\n\nRead more ↓\n{url}` — URL 인라인 (캐시버스팅 타임스탬프 포함)
- **Bluesky** (EN): `{description.en}\n\nRead more ↓` — external embed로 URL 전달

**금지**: 제목 반복, 해시태그, 이모지(👉 등), `→` 화살표 (↓만 허용)

### Step 3. 토큰 만료 확인

`/post-share`와 동일한 로직:
- `.env.local`에서 `THREADS_TOKEN_CREATED`, `LINKEDIN_TOKEN_CREATED` 확인
- 잔여 14일 이하: 경고 출력 후 계속
- 만료: 해당 플랫폼 제외

### Step 4. 소셜미디어 발행

전용 스크립트 `scripts/publish-project-social.py`를 사용한다:

```bash
python scripts/publish-project-social.py --slug={slug} --platform={platforms_comma_separated}
```

dry-run으로 먼저 확인:
```bash
python scripts/publish-project-social.py --slug={slug} --dry-run
```

스크립트가 자동으로:
- `projects/gallery/projects.json`에서 프로젝트 조회
- 한국어/영어 메시지 구성 (Facebook/Threads는 한국어, LinkedIn/X/Bluesky는 영어)
- `embed_url` 있으면 `terry.artlab.ai/[lang]/projects/[slug]` URL 사용
- 소셜미디어 + Substack(EN/KO) API로 발행
- Substack: 커버 이미지 + 설명 + CTA 링크로 티저 포스트 생성

### Step 5. 결과 요약 출력

```
─── /project-share 결과 ─────────────────────────────
프로젝트: survey-robot-hand-tactile-sensor

✓ facebook   — https://www.facebook.com/permalink/...
✓ threads    — https://www.threads.net/@terry.artlab/post/...
✓ linkedin   — https://www.linkedin.com/feed/update/...
✓ x          — https://x.com/TerryUm_ML/status/...
✓ bluesky    — https://bsky.app/profile/.../post/...
✓ substack(en) — https://terryum.substack.com/p/...
✓ substack(ko) — https://taewoongum.substack.com/p/...
──────────────────────────────────────────────────────
```

실패 시 원인 포함:
```
✗ x          — 실패 (에러 메시지)
```
