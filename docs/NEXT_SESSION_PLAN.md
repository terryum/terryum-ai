# NEXT_SESSION_PLAN.md

> Phase 1 (긴급 ISR card-stale fix + R2 cache GC 인프라) 완료. 자세한 내역은 `docs/CURRENT_STATUS.md`.
> 아래는 잔존 Phase 2 항목 — priority 순. 전 항목 완료 시 이 파일은 `git rm`.

**Git push 정책:** harness 가 main 직접 push 를 차단하므로 모든 commit 은 만들어주되 push 는 사용자가 `! git push origin main` 으로 직접 실행.

---

## 우선순위 #1: 비공개 본문 자동 R2 업로드 🟠 중간-높음

**문제:** 비공개 포스트 발행 시 4단계 수동 (terry-private push → index-private.json 갱신 → R2 본문 업로드 → 필요 시 redeploy). R2 업로드 누락 시 dynamicParams=true 로 on-demand 렌더 시도해도 본문 없어 404.

**작업 위치:** **terry-obsidian 워크스페이스** (`/post` 스킬 canonical).

**작업:**
- `/post --visibility=group/private` 발행 흐름 끝에 R2 업로드 단계 추가
  - 대상: `private/posts/<type>/<slug>/<lang>.mdx` (그리고 메타 필요 시 `meta.json` 도)
  - 이미 `scripts/upload-private-content.mjs` (gitignored) 있을 가능성 — 활용 검토
- 실패 시 명확한 에러 + retry 제안

**검증:**
- 더미 비공개 포스트 발행 → R2 에 객체 존재 (`wrangler r2 object get terryum-ai-assets/private/posts/<...>` 또는 fetch 200)
- 그룹 멤버 세션으로 페이지 접근 → 정상 렌더

**예상 소요:** 1-2시간.

---

## 우선순위 #2: SEO 404 (soft 404 → hard 404) 🟡 중간

**문제:** 미지의 슬러그가 HTTP 200 + Not Found 템플릿 반환. Google "soft 404" 페널티.

**작업:**
1. `app/[lang]/not-found.tsx` 와 `app/not-found.tsx` 에 `metadata.robots = { index: false, follow: false }` 추가 (즉시 부분 완화)
2. `notFound()` 가 OpenNext+Workers 에서 status 404 propagate 못하는 본질 원인 파악
   - Next.js 15 + App Router 표준 동작 확인
   - OpenNext GitHub issues 검색
   - 필요 시 middleware.ts 에서 라우트 매칭 실패 시 명시적 404 응답
3. `PostDetailPage` 에서 `notFound()` 호출 직전에 status 강제 옵션 검토

**검증:**
```bash
curl -sI "https://www.terryum.ai/en/posts/zzz-nonexistent" | head -1
# 기대: HTTP/2 404
```

**예상 소요:** 1-3시간 (OpenNext 디버깅 시간 변동성).

---

## 우선순위 #3: outputFileTracingIncludes 정리 🟢 낮음 (15분)

**문제:** `next.config.ts:6-15` 의 `outputFileTracingIncludes` 가 `posts/**/*.mdx`, `content/**/*.mdx` 를 worker 번들 추적에 포함. 이제 fs 안 읽고 ?raw 로 번들되니 불필요.

**작업:**
```ts
// next.config.ts
outputFileTracingIncludes: {
  '*': [
    './posts/**/*.json',         // 정적 import 로 이미 들어감 — 제거 가능
    // './posts/**/*.mdx',       // 제거: ?raw 로 번들됨
    // './posts/**/*.md',        // 제거: 사용처 검증 후
    './projects/**/*.json',
    // './content/**/*.mdx',     // 제거: about.tsx 가 ?raw 로 import
    // './content/**/*.md',      // 제거: 사용처 검증 후
    './content.config.json',
  ],
},
```

**검증:**
```bash
grep -rn "fs\.readFile\|fs\.access\|fs\.readdir" src/ scripts/ | grep -v node_modules
# posts.ts 의 fs 호출은 build-time fallback 만 — 번들 추적 불필요

# 빌드 + worker 사이즈 비교
du -sh .open-next/server-functions/default 2>/dev/null
# (전: ?MB) → (후: 더 작아져야)
```

**예상 소요:** 15분.

---

## 우선순위 #4: 번들 사이즈 모니터링 🟢 낮음 (트리거 도달 시)

**현재 상태:** 47 posts × 2 langs ≈ 1MB 인라인. Workers 한도 (압축 10MB) 여유.

**조치 트리거:** 포스트 100+ 또는 worker 압축 사이즈 5MB 초과.

**즉시 할 만한 일 (선택):**
- `scripts/check-bundle-size.mjs` 추가 — `.open-next/server-functions/default` 디렉토리 사이즈 측정 + 5MB 임계 시 경고. CI deploy step 후 실행 가능.

**트리거 도달 시 옵션:**
- a. R2 fetch 전환 (`posts/<type>/<slug>/<lang>.mdx` 업로드 + runtime fetch)
- b. Chunked imports (content_type 별 분리)
- c. Hybrid (최근 N 개만 인라인)

**예상 소요:** 0 (대기). 트리거 시 2-4시간.

---

## 진행 체크리스트

- [ ] **#1** `/post` 스킬 R2 업로드 (terry-obsidian)
- [ ] **#2** SEO hard 404
- [ ] **#3** outputFileTracingIncludes 정리
- [ ] **#4** (트리거 도달 시) 번들 사이즈 대응

전 항목 완료 시: `git rm docs/NEXT_SESSION_PLAN.md` + 마지막 커밋 메시지에 "completed plan" 언급.
