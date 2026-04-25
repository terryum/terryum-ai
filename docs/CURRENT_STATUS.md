# CURRENT_STATUS.md

> 목적: `/clear` 이후에도 이전 작업을 빠르게 재개하기 위한 **짧은 스냅샷** (append 금지, 매번 덮어쓰기)

## 1) 세션 스냅샷
- 마지막 업데이트: 2026-04-25 (KST)
- 현재 단계: 카드 cover stale 회귀 수정 + R2 ISR cache GC 인프라 추가. Phase 1 (긴급 + 영구 처치) 완료. Phase 2 4건 잔존
- 전체 진행도: v1 100% + 인프라 완성 + 컴포넌트 리팩토링 2차 완료 + ISR cache 운영 자동화

## 2) 지금 기준 핵심 결정 (최대 5개)
- 인프라: **Cloudflare Workers(OpenNext) + Pages + R2 + GitHub**. Supabase 의존 제거 완료
- Canonical 도메인: **`www.terryum.ai`**
- posts/[slug] 데이터 경로: **3 단계 fallback** — (1) fs.readFile (build-time SSG, Node.js) → (2) `src/data/post-bodies.ts` 의 inline ?raw 임포트 (Workers runtime, fs-free) → (3) R2 `private/posts/<type>/<slug>/<lang>.mdx` (group/private 슬러그). dynamicParams=true 안전 활성화
- 카드 cover URL: index.json 의 `cover_image` / `cover_thumb` 가 단일 소스. 누락 시 `resolvePostCdnPath(slug, 'cover.webp')` fallback (legacy)
- R2 ISR cache GC: 매 deploy 후 `scripts/r2-cache-gc.mjs --apply --keep 3` 가 자동 실행 (deploy.yml `continue-on-error`)

## 3) 완료됨 (이번 세션)
- [x] **카드 cover stale 회귀 fix** — `generate-index.mjs` 가 meta.json 의 `cover_image`/`cover_thumb` 를 index.json 에 propagate. `posts.ts` 가 `resolvePostAssetPath` 로 `./cover-v2.webp` 같은 relative path 를 R2 CDN URL 로 resolve (commit `2b636bf`)
- [x] **`scripts/r2-cache-gc.mjs`** 추가 — `incremental-cache/<buildId>/` prefix 중 newest N (default 3) 만 보존, 나머지 DeleteObjects 1000-batch. 옵션: `--dry-run`, `--apply`, `--keep <N>`
- [x] 1회성 GC 적용: 54 prefix / 7878 객체 삭제 (28초)
- [x] `.github/workflows/deploy.yml` 에 GC step 추가 (deploy 성공 시만, `continue-on-error: true`)
- [x] OpenNext `1.11 → 1.19.4` 릴리즈 노트 스캔: 내장 stale buildId GC 옵션 없음 — 자체 스크립트 유지가 정답

## 4) 알려진 제약
- 비공개 슬러그 on-demand 렌더링: 메타 (index-private.json) + 본문 (R2 `private/posts/...`) 모두 R2 에 업로드돼야 동작. terry-private repo 의 본문이 R2 미업로드면 sync-obsidian 도 R2 fetch 가 빈 결과 반환
- 미지의 슬러그: `notFound()` 가 HTTP 200 + `<title>Not Found>` 템플릿 렌더 (OpenNext+Workers 동작). 깔끔한 HTTP 404 가 필요하면 후속 작업 필요
- Cloudflare CDN edge cache (`s-maxage=31536000`) 는 deploy 가 자동 갱신하지 않음. 카드 회귀 같은 사고 시 R2 ISR cache 만 비우면 부족할 수 있고, Cloudflare 대시보드에서 URL purge 필요할 수 있음

## 5) 다음 작업 후보 (Phase 2 — `docs/NEXT_SESSION_PLAN.md` 참조)
- **#1** 비공개 본문 자동 R2 업로드 (`/post --visibility=group/private` 흐름 끝에 R2 업로드 단계 추가) — terry-obsidian 워크스페이스에서 진행
- **#2** SEO 404 (soft 404 → hard 404): notFound() 가 HTTP 404 propagate 하도록 OpenNext 동작 점검
- **#3** `next.config.ts` `outputFileTracingIncludes` 에서 mdx/content 항목 제거 (?raw 번들로 대체됨, ~15분)
- **#4** 번들 사이즈 모니터링: `scripts/check-bundle-size.mjs` 추가, CI 후 임계 5MB 경고. 트리거 도달(100+ posts 또는 worker 압축 사이즈 5MB) 시 R2 fetch 또는 chunked 전환

## 6) 검증 상태 (이번 세션 마지막)
- 로컬 dev (`http://localhost:3041/en`): 6 회귀 슬러그 모두 카드에서 `cover-v2.webp` / `cover-thumb-v2.webp` 정상 표시 ✅
- 로컬 detail page: regression 없음 (`-v2` 그대로 유지) ✅
- `npx tsc --noEmit`: posts.ts / paths.ts / generate-index.mjs 타입 체크 통과 ✅
- R2 cache GC dry-run / apply / re-dry-run = 0 pending ✅
- prod push 완료 (`2b636bf`), CF Workers 자동 배포 진행 (확인 시점 build `CR75ROs6h5ukxY0k6sDT6` 라이브)

## 7) 컨텍스트 메모
- R2 버킷: `terryum-ai-cache` (incremental cache), `terryum-ai-assets` (public) = `pub-0c3a2ab4c1e34dd1b7abc088a943482d.r2.dev`
- 빌드/배포: GitHub push 시 CF Workers 자동 (~2분) + 그 직후 GC step 실행
- GitHub 계정: **`gh auth switch --user terryum`** — 기본 활성은 `terry-cosmax` 인 경우가 많음
- 포트: 3040~3049
- 월 비용: ~$3-5
- 심링크 복원: `terry-surveys` clone 후 `scripts/link-private.sh` 1회 실행
