# CURRENT_STATUS.md

> 목적: `/clear` 이후에도 이전 작업을 빠르게 재개하기 위한 **짧은 스냅샷** (append 금지, 매번 덮어쓰기)

## 1) 세션 스냅샷
- 마지막 업데이트: 2026-04-25 (KST)
- 현재 단계: 비공개 콘텐츠 아키텍처 통합 완료. posts/surveys/projects 가 같은 `requireReadAccess` 게이트 + `visibility` 플래그로 관리됨
- 전체 진행도(대략): v1 100% + 인프라 이전/최적화 완료 + 비공개 콘텐츠 통합 완료

## 2) 지금 기준 핵심 결정 (최대 5개)
- 인프라: **Cloudflare Workers(OpenNext) + Pages + R2 + GitHub**. Supabase 의존 제거(Vercel 완전 제거도 완료)
- Canonical 도메인: **`www.terryum.ai`** (terryum.ai apex → www 308 · 구 terry.artlab.ai → AWS CloudFront 301)
- 이미지 서빙: **Cloudflare R2 CDN**. 커버 이미지 전부 R2, Supabase `private-covers` bucket 은퇴
- Survey: 3개 모두 Cloudflare Pages. snu-tactile-hand 는 group-only (`visibility='group'`), 본체 소스는 `terry-private` private repo 로 이관 (`terry-surveys/surveys/snu-tactile-hand` 심링크)
- 비공개 콘텐츠 게이트: `src/lib/access-guard.ts::requireReadAccess` 가 3 도메인 공통. admin(Google OAuth) 또는 `allowed_groups ∩ session.group` 일치 시 통과, 아니면 `/login?redirect=…` 서버 리다이렉트

## 3) 완료됨 (이번 세션)
- [x] Survey 언어 토글 시 chapter+scrollY 보존 (terry-surveys embed-bridge + ProjectEmbed.tsx)
- [x] visibility 타입 `'public' | 'private' | 'group'` 로 확장, `body_source?: 'repo' | 'r2'` 추가 (posts/projects)
- [x] `src/lib/r2-private.ts` 신규 — private MDX/meta R2 fetch 헬퍼
- [x] `src/lib/access-guard.ts` 신규 — 3 도메인 공통 게이트
- [x] Supabase `private_content` + `private-covers` 완전 퇴역 + 코드/데이터 정리
- [x] `/post` 스킬 `--visibility` 확장 (terry-obsidian canonical, B10.x 단계)
- [x] `terry-private` 신규 private repo 생성 + snu-tactile-hand 이관 + `scripts/link-private.sh` 심링크 헬퍼
- [x] 카드 컴포넌트 🔒 배지 (비공개 콘텐츠 표시)
- [x] snu virtual paper 2건 (TacScale/TacPlay) 아카이브: `terry-private/posts/papers/` 커밋 + R2 고아 객체 삭제

## 4) 알려진 제약 (다음 세션 주의)
- **OpenNext + Next 15 + Workers 는 hybrid SSG + `dynamicParams=true` 경로에서 500 이 난다** (슬러그가 `posts/index.json` 에 있으나 prerender manifest 엔 없는 경우). 현재 `src/app/[lang]/posts/[slug]/page.tsx` 는 이를 회피하려고 `dynamic='force-dynamic'` 로 고정
- `ci-verify-prerender.mjs` 는 page.tsx 소스에서 `force-dynamic` 를 감지해 스킵하는 구조로 변경됨
- 비공개 virtual paper 재출판 시: index.json 한 줄 추가만으로 복원되지만 실제 500 재발 가능. 재시도 전에 prerender manifest 동작을 먼저 검증할 것

## 5) 다음 3개 작업 (우선순위)
1. **R2 URL 상수화** — `pub-0c3a2ab4c1e34dd1b7abc088a943482d.r2.dev` 여기저기 하드코딩된 것들 `R2_PUBLIC_URL` 한 군데로 모으기
2. **추가 리팩토링**: Card 컴포넌트 공통화, FilterablePostList 분할
3. **Obsidian 연동 업데이트**: sync-obsidian.mjs R2 URL 호환

## 6) 검증 상태 (요약)
- `https://www.terryum.ai/en` HTTP 200 ✅
- GA4 (`G-3KR4M92C3G`) production HTML 에 임베드, `collect` 요청 정상 ✅
- R2 CDN 이미지 서빙 정상 ✅
- Survey 3개 iframe + snu auth gate + 언어 토글 위치 보존 동작 ✅
- terryum.ai apex → www 308 ✅
- terry.artlab.ai/* → www.terryum.ai/* 301 ✅
- 삭제된 snu 슬러그 200 + `<title>Not Found</title>` (App Router notFound 렌더) ✅

## 7) 컨텍스트 메모 (다음 세션용)
- R2 버킷: `terryum-ai-cache` (incremental cache), `terryum-ai-assets` (public) = `pub-0c3a2ab4c1e34dd1b7abc088a943482d.r2.dev`
- 빌드/배포: `npm run build:cf` → `npx opennextjs-cloudflare deploy` (GitHub push 시 자동)
- GitHub 계정: **`gh auth switch --user terryum`** — 기본 활성은 `terry-cosmax` 인 경우가 많음, push 전에 확인
- `.env.production` 은 `NEXT_PUBLIC_*` 만 commit (번들 인라인), 민감값은 `wrangler secret put`
- 포트: 3040
- 월 비용: ~$3-5
- 심링크 복원: `terry-surveys` clone 후 `scripts/link-private.sh` 1회 실행
