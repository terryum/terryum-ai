# 소셜미디어 공유 가이드

`/post-share`와 `/project-share` 스킬에서 참조하는 플랫폼별 규칙.

---

## 1. 플랫폼별 메시지 포맷

| 플랫폼 | 언어 | 스타일 | CTA | URL 전달 방식 |
|--------|------|--------|-----|---------------|
| Facebook | KO | 컴팩트 (빈 줄 없음) | 없음 | `link` 파라미터 (API) |
| Threads | KO | 설명 + `\n\nRead more ↓` | Read more ↓ | `link_attachment` (API) |
| LinkedIn | EN | 컴팩트 (빈 줄 없음) | 없음 | ARTICLE 카드 (`originalUrl`) |
| X | EN | 설명 + `\n\nRead more ↓\n{url}` | Read more ↓ | 텍스트 인라인 (t.co 23자) |
| Bluesky | EN | 설명 + `\n\nRead more ↓` | Read more ↓ | external embed |
| Substack | 각각 | 커버이미지 + 설명 + CTA 링크 | 자세히 보기 / Check it out | 본문 내 링크 |

### 절대 규칙
- **제목 반복 금지** — 링크 카드에 제목이 이미 표시되므로 본문에서 반복하지 않는다
- **해시태그 넣지 않음**
- **이모지 금지** — 손가락(👉), 로켓 등 장난스러운 이모지 사용 금지
- **화살표는 ↓** — `→`나 `👉` 대신 `↓` 사용 (Read more ↓)
- **Facebook/LinkedIn은 짧게** — 글줄임표(...)가 나오지 않도록 빈 줄 없이 1~2문장

### 글자 수 제한
- X: 280자 (URL은 t.co로 23자 고정)
- Threads: 500자
- Bluesky: 300 grapheme
- LinkedIn: 3000자 (but 첫 3줄만 노출되므로 실질적으로 짧게)
- Facebook: 제한 없음 (but 첫 3줄만 노출)

---

## 2. 커버이미지 (OG 링크 프리뷰)

### 핵심 원칙
> **이미지를 직접 업로드하면 안 된다.** 이미지 직접 업로드 시 클릭하면 이미지가 확대될 뿐 링크로 이동하지 않는다.
> 반드시 **OG 메타태그 기반 링크 프리뷰**를 사용하여, 카드를 클릭하면 링크로 이동하게 한다.

### OG 이미지 요건
| 항목 | 요건 |
|------|------|
| **포맷** | **JPG 또는 PNG 필수** — X(Twitter) 크롤러가 webp를 처리하지 못함 |
| **크기** | 최소 300x157px (summary_large_image), 권장 1200x630px |
| **용량** | 5MB 이하 |
| **경로** | Posts: `public/posts/{slug}/og.png`, Projects: `public/images/projects/{slug}-og.jpg` |

### 프로젝트 커버이미지 처리
1. `/project` 스킬로 프로젝트 추가 시 `cover.webp`와 함께 **`og.jpg` 변환본을 반드시 생성**
   ```bash
   sips -s format jpeg public/images/projects/{slug}-cover.webp \
        --out public/images/projects/{slug}-og.jpg
   ```
2. `generateMetadata`에서 `cover_image` 경로의 `-cover.webp`를 `-og.jpg`로 치환하여 OG 태그에 사용
3. 페이지 내 표시용은 원본 `cover.webp`를 그대로 사용

### Posts 커버이미지 처리
- `og.png`가 `public/posts/{slug}/` 디렉토리에 존재 (이미 JPG/PNG)
- `generateMetadata`에서 직접 참조

---

## 3. URL 규칙

### 로캘 포함 필수
> URL에 로캘(`/en/`, `/ko/`)을 반드시 포함해야 한다. 로캘 없는 URL(`/projects/slug`)은 302 리다이렉트되는데, **LinkedIn과 X 크롤러가 리다이렉트를 따라가지 못해** OG 태그를 읽지 못한다.

| 플랫폼 | 로캘 | 베이스 URL | 이유 |
|--------|------|-----------|------|
| Facebook | `/ko/` | `terry-artlab.vercel.app` | vercel.app 도메인이 Facebook OG 크롤링에 유리 |
| Threads | `/ko/` | `terry-artlab.vercel.app` | Facebook과 동일 |
| LinkedIn | `/en/` | `terry.artlab.ai` | 영어 OG 태그 직접 접근 |
| X | `/en/` | `terry.artlab.ai` | 영어 OG 태그 직접 접근 |
| Bluesky | `/en/` | `terry.artlab.ai` | 영어 OG 태그 직접 접근 |

### X 캐시 버스팅
- X 크롤러는 URL별로 카드를 공격적으로 캐싱함
- OG 태그가 없던 시점에 캐싱되면 이후 수정해도 반영 안 됨
- **해결**: URL에 `?v={unix_timestamp}` 쿼리 추가 (매 발행마다 새 타임스탬프)
- Card Validator가 폐지되어 강제 재크롤링 불가 → 캐시 버스팅이 유일한 방법

---

## 4. 토큰 만료 관리

| 플랫폼 | 만료 | 갱신 방법 |
|--------|------|----------|
| Facebook | 없음 (Page Access Token) | — |
| Threads | 60일 | `th_refresh_token` 또는 OAuth 재인증 |
| LinkedIn | 60일 | Developer Portal에서 재발급 |
| X | 없음 (OAuth 1.0a) | — |
| Bluesky | 없음 (App Password) | — |

- `.env.local`의 `THREADS_TOKEN_CREATED`, `LINKEDIN_TOKEN_CREATED`로 만료일 추적
- 잔여 14일 이하: 경고 출력
- 만료: 해당 플랫폼 건너뜀

---

## 5. 체크리스트

발행 전 확인:
- [ ] OG 이미지가 **JPG/PNG**인가? (webp면 X에서 실패)
- [ ] URL에 **로캘 포함**되어 있는가? (없으면 LinkedIn/X에서 OG 미표시)
- [ ] 사이트 **배포 완료** 후 발행하는가? (OG 태그가 라이브에 반영되어야 크롤러가 읽음)
- [ ] X URL에 **캐시 버스팅** 쿼리가 있는가?
- [ ] 메시지에 **제목 반복, 해시태그, 이모지**가 없는가?
- [ ] Facebook/LinkedIn 메시지가 **3줄 이내로 짧은가**?
