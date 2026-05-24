# CURRENT_STATUS.md

> 목적: `/clear` 이후에도 이전 작업을 빠르게 재개하기 위한 **짧은 스냅샷** (append 금지, 매번 덮어쓰기)

## 1) 세션 스냅샷
- 마지막 업데이트: 2026-05-01 (KST)
- 현재 단계: 옛 콘텐츠 카테고리 잔재(`memos`, `threads`) 완전 제거 — 메뉴는 이미 단일 `Notes`로 통합됐지만 폴더/스크립트/문서/스킬에 남아 있던 호환 레이어를 모두 정리하여 `notes`로 단일화
- 전체 진행도: v1 100% + 인프라 완성 + 카테고리 완전 단일화

## 2) 지금 기준 핵심 결정 (최대 5개)
- 인프라: **Cloudflare Workers(OpenNext) + Pages + R2 + GitHub**. Supabase 는 댓글/좋아요/그래프 등 데이터 레이어로만 유지
- Canonical 도메인: **`www.terryum.ai`**
- 사용자 노출 카테고리: **Essays / Surveys / Papers / Notes** — 단일 `notes` content_type, 폴더 `posts/notes/`. `memos`/`threads` 두 옛 카테고리는 모두 `notes`로 흡수. ChatGPT 요약 노트는 `meta.source === "chatgpt"` 필드로만 식별되어 `ThreadSourceLine` 라벨이 자동 노출
- 발행 파이프라인: `posts/{essays,papers,notes}/<slug>/` 폴더 구조 + `content_type: "essays|papers|notes"` 메타. canonical: `terry-obsidian/.claude/skills/post/SKILL.md` (`--type=essays|notes` 단일 인자)
- 외부 inbound 링크 호환: `?tab=memos`, `?tab=threads`, `?author=terry|ai` → `?tab=notes` 308 redirect는 `middleware.ts` 한 곳에만 유지 (옛 카테고리 이름이 코드에 남는 유일한 합법적 위치)

## 3) 완료됨 (이번 세션)
- [x] **content.config.json 단일화** — `activeTabs: ["papers", "essays", "notes"]`, `publishableTypes: ["essays", "notes"]`. ContentType union이 자동 파생.
- [x] **파일시스템 마이그레이션** — `posts/memos/*` (3개) + `posts/threads/*` (2개) → `posts/notes/*` (5개) git mv. meta.json 5개의 `content_type` + tags 첫 항목 `Memos`/`Threads` → `Notes`.
- [x] **인덱스 3종 갱신** — `posts/index.json`, `posts/global-index.json`, `posts/index-private.json`의 `content_type`/`type`/`path` 모두 정규화. `generate-index.mjs --include-private` 재실행 후 잔재 0.
- [x] **코드 갱신** — `src/lib/site-config.ts` (TAB_CONFIG matchTags), `src/lib/posts.ts` (contentTypeTagMap, CONTENT_TYPE_TAG, 주석), `src/components/ContentDetailPage.tsx` (`content_type === 'threads'` → `meta.source === 'chatgpt'` 분기), `src/data/tags.json` (`Memos` 탭 태그 제거). `post-bodies.ts`는 generate가 자동.
- [x] **middleware.ts 정리** — 308 redirect 유지 + 주석을 "외부 inbound URL 호환 게이트웨이"로 명확화.
- [x] **scripts 갱신** — `sync-obsidian.mjs` (TYPE_TO_FOLDER, isTerryAuthored 분기), `upload-private-mdx.mjs` / `delete-private-mdx.mjs` (VALID_TYPES + usage), `process-content-images.mjs` (findPostDir).
- [x] **terry-obsidian /post SKILL.md 동기화** — `--type=essays|notes` 단일화. ChatGPT 요약 노트는 draft frontmatter `source: "chatgpt"` 필드로 자동 식별 (별도 인자 없음). 폴더 매핑/visibility 표/frontmatter 형식/예시 모두 갱신.
- [x] **docs 갱신** — PRD, SITEMAP_IA, POST_GENERATOR_BLOG, POSTING_WORKFLOW, QA_CHECKLIST, PAGE_SPECS, DESIGN_SYSTEM, IMAGE_LOADING_STRATEGY, DISCOVERABILITY_ANALYTICS, README, README_ko, CLAUDE.md 모두 정리. middleware redirect 호환 게이트웨이 외 옛 이름 잔재 0.

## 4) 알려진 제약
- 비공개 슬러그 on-demand 렌더링: 메타 (index-private.json) + 본문 (R2 `private/posts/...`) 모두 R2 에 업로드돼야 동작
- 미지의 dynamic 슬러그 (`/en/posts/zzz`): noindex 적용되지만 HTTP status 200 (Next.js 15 + dynamicParams 한계)
- Cloudflare CDN edge cache (`s-maxage=31536000`) 는 deploy 자동 갱신 X — 사고 시 R2 ISR cache + CF dashboard URL purge 모두 필요할 수 있음
- vault 안의 `write_style_memos.md` / `write_style_threads.md` 두 스타일 가이드는 그대로 유지 — 짧은 메모 톤과 ChatGPT 요약 톤이 서로 달라 분리. `/post` Step B10.8이 source 필드로 자동 분기하여 적절한 가이드 갱신.

## 5) 다음 작업 후보
- **#1** 비공개 본문 자동 R2 업로드 (`/post --visibility=group/private` 흐름 끝에 R2 업로드 단계 추가) — terry-obsidian 워크스페이스
- **Hard HTTP 404**: middleware 에서 known-slug 검증 후 rewrite 또는 Next.js issue 진척 확인
- **5-repo 코드베이스 정리**: C2 (vitest 도입) → C1 (큰 파일 분리) 순. 백로그: `~/.claude/plans/terryum-ai-terry-surveys-toasty-zephyr.md` § C
- (장기) write_style_memos / write_style_threads 두 가이드를 단일 write_style_notes로 통합할지 검토 — 현재는 source 분기로 유지

## 6) 검증 상태 (이번 세션 마지막)
- `node scripts/generate-index.mjs --include-private` 재실행 → 옛 카테고리 잔재 0건 ✅
- (예정) `npx tsc --noEmit`, `npm run dev` 스모크 테스트
- 외부 inbound 링크 호환: `?tab=memos|threads` → 308 → `?tab=notes` (middleware 보존)

## 7) 컨텍스트 메모
- R2 버킷: `terryum-ai-cache` (incremental cache), `terryum-ai-assets` (public) = `pub-0c3a2ab4c1e34dd1b7abc088a943482d.r2.dev`
- 빌드/배포: GitHub push 시 CF Workers 자동 (~2분) + 그 직후 GC step 실행
- GitHub 계정: `terryum` 단일 계정 사용
- 포트: 3040~3049
- 월 비용: ~$3-5
- 심링크 복원: `terry-surveys` clone 후 `scripts/link-private.sh` 1회 실행
- 이번 마이그레이션: 두 repo 동시 변경 (terryum-ai 본 변경 + terry-obsidian /post SKILL.md 동기화). 둘 다 commit/push 후 다음 sync에서 메타 일관성 확인.
