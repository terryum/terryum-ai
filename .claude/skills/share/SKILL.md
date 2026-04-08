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
  /share https://terry.artlab.ai/posts/...  → URL로 식별

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
- 미지정 → 전체: facebook,threads,linkedin,x,bluesky,substack

식별 완료 후 출력:
```
대상: [타입] [번호] slug (제목)
플랫폼: facebook, threads, linkedin, x, bluesky, substack
```

---

## Step 2. 콘텐츠 타입별 메시지 전략

### Posts (papers, essays, memos)
- **데이터 소스**: MDX frontmatter의 `summary` → `card_summary` → `ai_summary.one_liner`
- **papers**: AI가 쓴 논문 요약. 핵심 기여와 결과를 간결하게 전달
- **essays/memos**: Terry가 직접 쓴 글. 가장 강한 인사이트 1-2문장으로
- **공유 URL**: `https://terry.artlab.ai/posts/{slug}` (캐시버스팅: `?v={YYYYMMDD}`)
- **커버이미지**: `posts/{slug}/og.png` (OG 메타태그로 자동 전달)
- **papers 공유 시 확인**: content_type이 essays/memos가 아니면 사용자에게 확인 후 진행

### Surveys
- **데이터 소스**: `surveys.json`의 `description.ko` / `description.en`
- **1인칭 톤**: "저의 AI scientist들과 분석하였습니다" — 주체성 강조
- **규모감**: 논문 수, 챕터 수 등 구체적 숫자 포함
- **공유 URL**: `https://terry.artlab.ai/surveys/{slug}` (캐시버스팅: `?v={YYYYMMDD}`)
- **커버이미지**: `images/projects/{slug}-og.jpg` (OG 메타태그로 자동 전달)

### Projects
- **데이터 소스**: `projects.json`의 `description.ko` / `description.en`
- **1인칭 톤**: 내가 만든 결과물임을 강조
- **공유 URL**: `https://terry.artlab.ai/projects/{slug}` 또는 외부 링크
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

## Step 4. 발행

콘텐츠 타입에 따라 적절한 스크립트 사용:

```bash
# Posts
python scripts/publish-social.py --slug={slug} --platform={platforms}

# Surveys / Projects
python scripts/publish-project-social.py --slug={slug} --platform={platforms}
```

Substack이 포함된 경우:
```bash
python scripts/publish-substack.py --slug={slug}
```

---

## Step 5. 결과 요약

```
─── /share 결과 ────────────────────────────────────
[Post] #11 260310-on-the-manifold-first-post

✓ facebook   — https://www.facebook.com/permalink/...
✓ threads    — https://www.threads.net/@terry.artlab/post/...
✓ linkedin   — https://www.linkedin.com/feed/update/...
✓ x          — https://x.com/TerryUm_ML/status/...
✓ bluesky    — https://bsky.app/profile/.../post/...
✓ substack(en) — https://terryum.substack.com/p/...
✓ substack(ko) — https://taewoongum.substack.com/p/...
────────────────────────────────────────────────────
```

실패 시 원인 포함: `✗ x — 실패 (CreditsDepleted)`
