---
name: post-share
description: "Post Share — 소셜미디어 & Substack 발행. 포스트 식별자(번호/slug/제목)와 플랫폼을 지정하여 Facebook, Threads, LinkedIn, X, Bluesky, Substack에 발행."
argument-hint: "<post-identifier> [platform-filter]"
---

# Post Share — 소셜미디어 & Substack 발행

입력: $ARGUMENTS
예시:
  /post-share On the Manifold
  /post-share 11
  /post-share brain-augmentation X에만 올려줘
  /post-share 260310-on-the-manifold-first-post --platform=facebook,threads

## 필수 참조
실행 전 반드시 `docs/SOCIAL_SHARE_GUIDE.md`를 읽고 플랫폼별 메시지 포맷, 커버이미지 규칙, URL 규칙을 준수할 것.

## 실행 순서 (모든 단계를 권한 요청 없이 완료할 것)

### Step 1. 포스트 식별

`posts/index.json`을 읽어 $ARGUMENTS를 파싱한다.

**포스트 식별자 파싱** (우선순위 순서):
1. 숫자만 있으면 → `post_number` 매칭
2. `YYMMDD-` 또는 `YYMM-` 접두어 패턴 → `slug` 직접 매칭
3. `http://` 또는 `https://` → URL 마지막 세그먼트를 slug로 추출
4. 나머지 텍스트 → `title_ko` 또는 `title_en`에서 대소문자 무시 부분 매칭, 가장 유사한 항목 선택

**플랫폼 필터 파싱** (없으면 전체):
- 한국어 명칭 인식: `페이스북` → facebook, `쓰레드`/`스레드` → threads, `링크드인` → linkedin, `X`/`엑스`/`트위터` → x, `블루스카이` → bluesky, `섭스택`/`서브스택` → substack
- `~에만`, `~만`, `--platform=a,b` 등 다양한 표현 수용
- `소셜미디어`/`소셜` 키워드 → facebook,threads,linkedin,x,bluesky (substack 제외)
- 플랫폼 미지정 → 전체: facebook,threads,linkedin,x,bluesky,substack

식별 완료 후 출력:
```
대상 포스트: [post_number] slug (title_ko)
대상 플랫폼: facebook, threads, linkedin, x, bluesky, substack
```

### Step 1.5. content_type 검증

소셜미디어 공유 대상은 Terry가 직접 쓴 글(`essays`, `tech`)이다.
식별된 포스트의 `content_type`이 `essays` 또는 `tech`가 **아닌** 경우 (예: `papers`), 발행을 즉시 중단하고 사용자에게 확인을 요청한다:

```
⚠️ 이 포스트는 content_type이 "{content_type}"입니다 (소셜 공유 대상: essays, tech).
정말 공유하시겠습니까?
```

사용자가 명시적으로 승인한 경우에만 Step 2로 진행한다. 그 외에는 중단.

### Step 2. 사전 확인 (캐시 + 토큰)

**캐시 확인** — `.social-published.json`과 `.substack-published.json`을 읽어 대상 slug의 발행 기록이 있으면 경고만 출력하고 발행은 계속 진행:
```
ℹ️ 이미 발행 기록 있음: facebook, threads (무시하고 재발행)
```

**토큰 만료 확인** — `.env.local`에서 아래 환경변수를 읽어 오늘 날짜 기준으로 만료 여부 계산:

| 환경변수 | 플랫폼 | 만료 기준 |
|----------|--------|-----------|
| `THREADS_TOKEN_CREATED` | threads | 60일 |
| `LINKEDIN_TOKEN_CREATED` | linkedin | 60일 |

- 잔여 **14일 이하**: `⚠️ [플랫폼] 토큰 만료 임박 (N일 남음)` 경고 출력 후 교체 방법 안내, 발행은 계속 진행
- 이미 **만료**: `✗ [플랫폼] 토큰 만료 — 발행 건너뜀` 출력 후 해당 플랫폼 제외

Threads 토큰 교체 방법 (만료 임박/만료 시 출력):
```
Threads 토큰 교체 방법:
1. developers.facebook.com → Graph API Explorer (graph.threads.net)
2. "Generate Threads Access Token" 클릭 → 승인
3. 교환: curl "https://graph.threads.net/access_token?grant_type=th_exchange_token&client_id={THREADS_APP_ID}&client_secret={THREADS_APP_SECRET}&access_token={단기토큰}"
4. .env.local의 THREADS_ACCESS_TOKEN + THREADS_TOKEN_CREATED 업데이트
```

LinkedIn 토큰 교체 방법 (만료 임박/만료 시 출력):
```
LinkedIn 토큰 교체 방법:
1. LinkedIn Developer Portal → 앱 → OAuth 2.0 tools
2. Access Token 재발급 (r_liteprofile, w_member_social 권한)
3. .env.local의 LINKEDIN_ACCESS_TOKEN + LINKEDIN_TOKEN_CREATED 업데이트
```

### Step 3. 소셜미디어 발행

플랫폼 필터에 facebook/threads/linkedin/x/bluesky 중 하나라도 포함된 경우 실행:
```bash
python scripts/publish-social.py --slug={slug} --platform={social_platforms_comma_separated}
```
스크립트 stdout에서 `post_id`, `id`, `tweet_id`, `urn` 값을 추출해 결과 링크 구성에 활용.

### Step 4. Substack 발행

플랫폼 필터에 substack이 포함된 경우 실행:
```bash
python scripts/publish-substack.py --slug={slug}
```
스크립트 stdout에서 발행된 URL(`https://{subdomain}.substack.com/p/{id}`)을 추출.

### Step 5. 결과 요약 출력

아래 형식으로 결과를 출력한다:
```
─── /post-share 결과 ───────────────────────────────
포스트: [11] 260310-on-the-manifold-first-post

✓ facebook   — https://www.facebook.com/permalink/...
✓ threads    — https://www.threads.net/@terry.artlab/post/...
✓ linkedin   — https://www.linkedin.com/feed/update/urn:li:share:...
✓ x          — https://x.com/TerryUm_ML/status/...
✓ bluesky    — https://bsky.app/profile/user.bsky.social/post/...
✓ substack(en) — https://terryum.substack.com/p/...
✓ substack(ko) — https://taewoongum.substack.com/p/...
────────────────────────────────────────────────────
```

**링크 구성 규칙**:
- facebook: 스크립트 stdout의 `Facebook URL:` 줄에서 추출 (API로 permalink_url 조회)
- threads: 스크립트 stdout의 `Threads URL:` 줄에서 추출 (API로 permalink 조회, threads.com 도메인)
- linkedin: `https://www.linkedin.com/feed/update/{urn}`
- x: `https://x.com/TerryUm_ML/status/{tweet_id}`
- bluesky: 스크립트 stdout의 `Bluesky URL:` 줄에서 추출
- substack: 스크립트 출력의 URL 그대로 사용

**실패 시** 원인 메시지 포함:
```
✗ x          — 실패 (CreditsDepleted — X API 크레딧 충전 필요)
```
