---
name: project-share
description: "Project Share — 프로젝트를 소셜미디어 & Substack에 공유. 프로젝트 URL/slug/제목으로 식별하여 Facebook, Threads, LinkedIn, X, Bluesky에 발행."
argument-hint: "<project-URL | slug | title> [platform-filter]"
---

# Project Share — 소셜미디어 공유

입력: $ARGUMENTS
예시:
  /project-share https://terry.artlab.ai/projects/book-robot-hand-tactile-sensor
  /project-share book-robot-hand-tactile-sensor
  /project-share Tactile Sensing
  /project-share book-robot-hand-tactile-sensor X에만 올려줘
  /project-share book-robot-hand-tactile-sensor --platform=facebook,threads

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
- `소셜미디어`/`소셜` 키워드 → facebook,threads,linkedin,x,bluesky
- 플랫폼 미지정 → 전체: facebook,threads,linkedin,x,bluesky

식별 완료 후 출력:
```
대상 프로젝트: slug (title_en)
대상 플랫폼: facebook, threads, linkedin, x, bluesky
```

### Step 2. 메시지 구성

프로젝트 정보로 소셜미디어 메시지를 구성한다.

**URL 결정**:
- `embed_url`이 있으면: `https://terry.artlab.ai/en/projects/{slug}` (내부 임베딩 페이지)
- `embed_url`이 없으면: 첫 번째 링크 URL

**한국어 메시지** (Facebook, Threads):
```
{title.ko}

{description.ko}

자세히 보기 👉 {url}
#{tech1} #{tech2} #{tech3}
```

**영어 메시지** (LinkedIn, X, Bluesky):
```
{title.en}

{description.en}

Check it out → {url}
#{tech1} #{tech2} #{tech3}
```

해시태그는 `tech_stack`에서 생성 (공백→언더스코어, 특수문자 제거).

### Step 3. 토큰 만료 확인

`/post-share`와 동일한 로직:
- `.env.local`에서 `THREADS_TOKEN_CREATED`, `LINKEDIN_TOKEN_CREATED` 확인
- 잔여 14일 이하: 경고 출력 후 계속
- 만료: 해당 플랫폼 제외

### Step 4. 소셜미디어 발행

구성된 메시지를 `scripts/publish-social.py`의 개별 함수로 발행한다.
스크립트를 직접 호출하되 `--raw` 모드를 사용:

```bash
python scripts/publish-social.py --raw --slug={slug} --platform={platforms} \
  --raw-text-ko="{ko_message}" --raw-text-en="{en_message}" --raw-url="{url}"
```

`--raw` 모드가 지원되지 않으면, 각 플랫폼별로 Python one-liner로 직접 함수 호출:

```bash
python -c "
import sys; sys.path.insert(0, 'scripts')
from publish_social import publish_facebook, publish_threads, publish_linkedin, publish_x, publish_bluesky
publish_facebook('''TEXT''', 'URL', False)
"
```

또는 `curl`로 각 플랫폼 API를 직접 호출해도 된다.

### Step 5. 결과 요약 출력

```
─── /project-share 결과 ─────────────────────────────
프로젝트: book-robot-hand-tactile-sensor

✓ facebook   — https://www.facebook.com/permalink/...
✓ threads    — https://www.threads.net/@terry.artlab/post/...
✓ linkedin   — https://www.linkedin.com/feed/update/...
✓ x          — https://x.com/TerryUm_ML/status/...
✓ bluesky    — https://bsky.app/profile/.../post/...
──────────────────────────────────────────────────────
```

실패 시 원인 포함:
```
✗ x          — 실패 (에러 메시지)
```
