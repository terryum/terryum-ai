---
name: share
description: "콘텐츠를 소셜미디어에 공유. Posts, Surveys, Projects 등 콘텐츠 타입에 따라 메시지 전략을 자동 적용. Facebook, Threads, LinkedIn, X, Bluesky, Substack 발행."
argument-hint: "<번호 | slug | 제목 | URL> [플랫폼 필터]"
---

# Share — 소셜미디어 공유

입력: $ARGUMENTS
예시:
  /share #11                                → Post #11 전체 플랫폼
  /share S1                                 → Survey S1 전체 플랫폼
  /share P1                                 → Project P1 전체 플랫폼
  /share brain-augmentation X에만           → slug으로 식별, X만
  /share Tactile Sensing 링크드인에만       → 제목으로 식별
  /share https://www.terryum.ai/posts/...  → URL로 식별

## 필수 참조
실행 전 반드시 `docs/SOCIAL_SHARE_GUIDE.md`를 읽고 플랫폼별 메시지 포맷, 커버이미지 규칙, URL 규칙을 준수할 것.

---

## Step 1. 콘텐츠 식별 + 타입 감지

**식별자 파싱** (우선순위 순서):
1. `#N` (숫자) → `posts/index.json`에서 `post_number` 매칭 → **Post**
2. `SN` (S+숫자) → `projects/surveys/surveys.json`에서 `survey_number` 매칭 → **Survey**
3. `PN` (P+숫자) → `projects/gallery/projects.json`에서 `project_number` 매칭 → **Project**
4. `http(s)://` URL → 경로에서 타입 추론 (`/posts/` → Post, `/surveys/` → Survey, `/projects/` → Project)
5. 하이픈 포함 slug → 각 데이터 소스에서 순서대로 탐색 (posts → surveys → projects)
6. 텍스트 → 제목 부분 매칭 (posts → surveys → projects)

**플랫폼 필터 파싱** (없으면 전체):
- `페이스북`→facebook, `쓰레드/스레드`→threads, `링크드인`→linkedin, `X/엑스/트위터`→x, `블루스카이`→bluesky, `섭스택/서브스택`→substack
- `소셜미디어/소셜` → facebook,threads,linkedin,x,bluesky (substack 제외)
- `~에만`, `~만`, `--platform=a,b` 등
- 미지정 → 전체: facebook,threads,linkedin,x,bluesky,substack (특별한 언급 없으면 **항상 Substack 포함**)

식별 완료 후 출력:
```
대상: [타입] [번호] slug (제목)
플랫폼: facebook, threads, linkedin, x, bluesky, substack
```

---

## Step 2. 콘텐츠 타입별 메시지 전략

### Posts (papers, essays, memos, threads)
- **데이터 소스**: MDX frontmatter의 `summary` → `card_summary` → `ai_summary.one_liner`
- **papers**: AI가 쓴 논문 요약. 핵심 기여와 결과를 간결하게 전달
- **essays/memos**: Terry가 직접 쓴 글. 가장 강한 인사이트 1-2문장으로
- **threads**: AI 대화(ChatGPT share URL 또는 Claude 세션)를 Terry가 요약한 글. 탐색 주제·레슨·FAQ 구조 중 가장 강한 1~2 bullet을 뽑아 한두 문장으로
- **공유 URL**: `https://www.terryum.ai/posts/{slug}` (캐시버스팅: `?v={YYYYMMDD}`)
- **커버이미지**: `posts/{slug}/og.png` (OG 메타태그로 자동 전달)
- **publishableTypes**: `content.config.json`의 `publishableTypes` 배열이 소셜 공유 대상을 결정. 현재 `["essays", "memos", "threads"]`. `papers`는 외부 논문 요약이라 기본적으로 `/share` 대상이 아니다 — 공유 시 사용자 확인 후 임시로 배열 확장 또는 개별 스크립트 우회

### Surveys
- **데이터 소스**: `surveys.json`의 `description.ko` / `description.en`
- **1인칭 톤**: "저의 AI scientist들과 분석하였습니다" — 주체성 강조
- **규모감**: 논문 수, 챕터 수 등 구체적 숫자 포함
- **공유 URL**: `https://www.terryum.ai/surveys/{slug}` (캐시버스팅: `?v={YYYYMMDD}`)
- **커버이미지**: `images/projects/{slug}-og.jpg` (OG 메타태그로 자동 전달)

### Projects
- **데이터 소스**: `projects.json`의 `description.ko` / `description.en`
- **1인칭 톤**: 내가 만든 결과물임을 강조
- **공유 URL**: `https://www.terryum.ai/projects/{slug}` 또는 외부 링크
- **커버이미지**: `images/projects/{slug}-og.jpg` (없으면 cover.webp)

### 플랫폼별 언어 + 글자수

| 플랫폼 | 언어 | 최대 글자수 | 스타일 |
|--------|------|-----------|--------|
| Facebook | KO | 63,206자 (첫 3줄 노출) | 컴팩트, CTA 없음 |
| Threads | KO | 500자 | 설명 + `\n\nRead more ↓` |
| LinkedIn | EN | 3,000자 (첫 3줄 노출) | 컴팩트, CTA 없음 |
| X (Basic) | EN | 280자 (URL=23자) | 설명 + `\n\nRead more ↓\n{url}` |
| Bluesky | EN | 300 grapheme | 설명 + `\n\nRead more ↓` |
| Substack | 각각 | 무제한 | 커버이미지 + 설명 + CTA |

### 절대 규칙
- **제목 반복 금지** — 링크 카드에 제목이 표시됨
- **해시태그 금지**, **이모지 금지**, **화살표는 ↓만**
- **Facebook/LinkedIn은 1-2문장** — "더 보기" 없이 전문 노출
- **X는 280자 이내** (URL 23자 포함)

---

## Step 3. 토큰 만료 확인

`.env.local`에서 확인:

| 환경변수 | 플랫폼 | 만료 기준 |
|----------|--------|-----------|
| `THREADS_TOKEN_CREATED` | threads | 60일 |
| `LINKEDIN_TOKEN_CREATED` | linkedin | 60일 |

- 14일 이하 남음 → 경고 + 교체 방법 안내 후 계속
- 만료 → 해당 플랫폼 제외

---

## Step 3.7. 글자수 pre-check (필수)

스크립트를 실행하기 **전에** 데이터 소스의 글자수를 측정해 각 플랫폼 한계를 넘는지 확인한다. 초과 시 **첫 실행 전에** 짧은 커스텀 메시지를 준비해 `--message-*-file`로 넘긴다. 실패 후 재시도는 안티패턴 — X는 길이 초과에 403을 쓰므로 오진단을 유발한다.

### 한계 (CTA/URL 오버헤드 차감 후 description 상한)

| 플랫폼 | 총 한계 | CTA+URL 오버헤드 | description 상한 |
|--------|---------|------------------|-------------------|
| X | 280자 | Read more ↓(17) + URL(23) + 개행 = 43 | **237자** |
| Bluesky | 300 grapheme | Read more ↓(17), URL은 external embed | **283자 (안전 270)** |
| Threads | 500자 | Read more ↓(17) | **483자** |
| LinkedIn | 3,000자 | 없음 | 3,000자 (거의 무제한) |
| Facebook | 63,206자 | 없음 | 거의 무제한 |

### 절차

1. 데이터 소스에서 ko/en description 추출:
   - Post: `posts/{slug}/ko.mdx` / `en.mdx`의 `summary`
   - Survey: `projects/surveys/surveys.json`의 `description.ko` / `description.en`
   - Project: `projects/gallery/projects.json`의 `description.ko` / `description.en`
2. `wc -m` 또는 Python `len()`으로 각 길이 측정
3. EN이 237자 초과 → X용 짧은 버전 준비 필요 (Bluesky도 270자면 거의 확실히 오버)
4. KO가 483자 초과 → Threads용 짧은 버전 필요
5. 짧은 버전을 `/tmp/share-ko.txt`, `/tmp/share-en.txt`에 저장 → `--message-ko-file` / `--message-en-file`로 **첫 실행부터** 전달
6. 모두 한계 이내면 기본 흐름 그대로 진행

---

## Step 3.5. 사용자 커스텀 메시지 처리

사용자가 직접 메시지를 제공한 경우:
1. 한국어 메시지를 `/tmp/share-ko.txt`에, 영어 메시지를 `/tmp/share-en.txt`에 저장
2. `--message-ko-file` / `--message-en-file` 옵션으로 스크립트에 전달
3. **전문을 싣는 경우**: 단락 사이에 빈 줄 1개씩 추가 (줄바꿈으로 가독성 확보)
4. **"(링크는 댓글에)" 등 불필요한 문구**: 삭제
5. **Threads 500자 제한**: 커스텀 메시지가 500자 초과 시 자동으로 짧은 description으로 fallback
6. **X 280자, Bluesky 300 grapheme**: 영문 전문이 초과하면 짧은 description으로 fallback
7. **LinkedIn**: 사용자가 영어 전문 그대로 올려달라고 한 경우 전문 사용 (3,000자 이내)

## Step 4. 발행

콘텐츠 타입에 따라 적절한 스크립트 사용:

```bash
# Posts (소셜미디어: facebook, threads, linkedin, x, bluesky) — 기본 메시지
python scripts/publish-social.py --slug={slug} --platform={platforms}

# Posts (커스텀 메시지) — Step 3.7 글자수 초과 시 사용
python scripts/publish-social.py --slug={slug} --message-ko-file=/tmp/share-ko.txt --message-en-file=/tmp/share-en.txt --platform={platforms}

# Posts (Substack: 별도 스크립트 — EN/KO 동시 발행)
python scripts/publish-substack.py --slug={slug}

# Surveys / Projects (기본 메시지)
python scripts/publish-project-social.py --slug={slug} --platform={platforms}

# Surveys / Projects (커스텀 메시지)
python scripts/publish-project-social.py --slug={slug} --message-ko-file=/tmp/share-ko.txt --message-en-file=/tmp/share-en.txt --platform={platforms}
```

`--message-ko-file`은 facebook/threads에 적용, `--message-en-file`은 linkedin/x/bluesky에 적용. 빌더가 override를 받아 그대로 쓰되, 한계 초과면 동일한 truncate 규칙으로 자른다 (즉 사용자가 한계 이내로 사이즈를 맞춰 넘기면 잘림 없이 발행됨).

**중요: Substack은 `publish-social.py`에 포함되어 있지 않다.** 반드시 `publish-substack.py`를 별도로 실행해야 한다. `--platform=substack`은 `publish-social.py`에서 무시된다.

**Substack 지원 범위**: `essays`, `tech` 타입만. `threads`, `memos`, `papers`, `surveys`는 publish-substack.py가 명시적 stderr 메시지(`✗ Substack 미지원: ...`)와 함께 skip한다 (2026-04-28 사고 D 후 명시화). 결과 요약에 반드시 `— substack: 미지원 (<type>)` 형태로 표시할 것 — silent skip 금지.

**글자수 초과 시 재발행**: 특정 플랫폼이 실패하면 해당 플랫폼만 기본 메시지로 재시도:
```bash
python scripts/publish-project-social.py --slug={slug} --platform=threads
```

---

## Step 5. 결과 요약 — silent fail 금지

각 플랫폼 게시 URL뿐 아니라 **OG/thumb 첨부 여부**까지 명시. 사용자가 결과만 봐도 어느 플랫폼에서 카드 깨졌는지 즉시 인지하도록.

```
─── /share 결과 ────────────────────────────────────
[Post] #11 260310-on-the-manifold-first-post

✓ facebook   — https://www.facebook.com/permalink/...     (OG: ✓)
✓ threads    — https://www.threads.net/@terry.artlab/post/...
✓ linkedin   — https://www.linkedin.com/feed/update/...
✓ x          — https://x.com/TerryUm_ML/status/...        (card: ✓)
⚠ bluesky    — https://bsky.app/profile/.../post/...     (게시 OK, thumb 미첨부 — OG fetch 실패)
✓ substack(en) — https://terryum.substack.com/p/...
✓ substack(ko) — https://taewoongum.substack.com/p/...
────────────────────────────────────────────────────
```

**검증 신호**:
- **`✓`**: 게시 성공 + OG/thumb 정상
- **`⚠`**: 게시 성공이지만 thumb/OG 누락 — publish-social.py가 stderr로 사고 알림 출력
- **`✗`**: 게시 실패 (원인 포함, 예: `CreditsDepleted`, `blob too big`, `unauthorized`)
- **`— 미지원 (<type>)`**: 해당 콘텐츠 타입을 스크립트가 지원 안 함 (예: `substack — 미지원 (threads)`)

**Bluesky thumb 누락 시 진단** (2026-04-28 사고 C 후 강화):
- publish-social.py가 stderr로 다음을 출력: `⚠ Bluesky thumb 업로드 실패 — 게시는 진행되나 link card에 이미지 없음`
- 원인 후보: (a) OG image 1MB 초과, (b) R2 dev URL access, (c) OG meta 부재
- 표준 4-asset spec(og.png ≤500 KB)을 따르면 (a) 사고 자체가 불가능. (b)는 자체도메인(www.terryum.ai)으로 fallback 필요. (c)는 발행 전 URL의 OG 메타 점검.

**Facebook OG 캐시 사고**:
- 처음 게시 직전 og.png가 너무 컸거나 라이브에 없으면 Facebook scraper가 빈 캐시를 저장 → 카드 깨짐
- 복구: https://developers.facebook.com/tools/debug/?q=<URL>에서 "Scrape Again"
- 영구 가드: 표준 spec(og.png ≤500 KB)으로 시작하면 발생 0
