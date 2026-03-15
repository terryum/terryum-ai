# CURRENT_STATUS.md

> 목적: `/clear` 이후에도 이전 작업을 빠르게 재개하기 위한 **짧은 스냅샷** (append 금지, 매번 덮어쓰기)

## 1) 세션 스냅샷
- 마지막 업데이트: 2026-03-15 (KST)
- 현재 단계: Substack 연동 v1 구현 완료 (`feature/knowledge-graph` 브랜치)
- 전체 진행도(대략): 100% (빌드/TypeScript 성공)

## 2) 지금 기준 핵심 결정 (최대 5개)
- 인프라: Cloudflare(도메인/DNS/CDN) + Vercel(배포+SSL) + GitHub
- 도메인: `terry.artlab.ai` (Namecheap CNAME → cname.vercel-dns.com)
- 스택: Next.js 15.5 (App Router) + TypeScript + Tailwind CSS v4 + next-mdx-remote v6
- AI Memory: 글번호(`post_number`) + `ai_summary` + `relations` + `concept_index` + `taxonomy` → `posts/index.json`
- content_type 완전 정렬: `papers`/`notes`/`tech`/`essays` = 탭 슬러그 = 디렉토리명

## 3) 완료됨
- [x] v1 전체 기능 (스캐폴딩~ForceVLA 포스팅~UI 개선)
- [x] AI Memory 시스템: `PostMeta` 타입 확장, `generate-index.mjs` 스크립트
- [x] Research #6~#11 포스팅 (arXiv + Nature Communications)
- [x] 포스팅 자동화: `.claude/commands/post.md` 슬래시 커맨드 + `scripts/extract-paper-pdf.py`
- [x] 리팩토링: 웹 포스팅 UI/API 제거, Container 컴포넌트, display.ts 헬퍼, TagItem 단일화
- [x] Knowledge Graph Phase 1~3 (taxonomy, clusters, RelatedPapers, TaxonomyFilter)
- [x] 탭명·디렉토리·content_type 완전 정렬
- [x] **Substack 연동 v1**:
  - `SubstackSubscribe.tsx` 컴포넌트 (article/footer 2가지 variant)
  - `ContentDetailPage.tsx` — essays/tech 글 끝에 구독 CTA 삽입
  - `Footer.tsx` — 전체 페이지 footer에 구독 링크 삽입
  - `scripts/publish-substack.py` — 자동 티저 포스팅 (EN/KO)
  - `.github/workflows/substack-publish.yml` — posts/index.json 변경 시 자동 트리거

## 4) 진행 중 / 막힘
- `feature/knowledge-graph` 브랜치 작업 중 (main에 미병합)

## 5) 다음 3개 작업 (우선순위)
1. **Substack 사전 조건 완료** (사용자 직접):
   - EN/KO Substack URL 확인 후 `.env.local`에 `NEXT_PUBLIC_SUBSTACK_EN_URL`, `NEXT_PUBLIC_SUBSTACK_KO_URL` 등록
   - Substack Account Settings → Password → 비밀번호 생성 (Google 로그인과 병행)
   - GitHub Secrets에 `SUBSTACK_EMAIL`, `SUBSTACK_PASSWORD`, `SUBSTACK_EN_URL`, `SUBSTACK_KO_URL` 등록
2. `feature/knowledge-graph` → main PR 생성 + 병합
3. 첫 번째 Substack 발행 테스트: `python scripts/publish-substack.py --dry-run`

## 6) 검증 상태 (요약)
- 빌드: 성공 (TypeScript OK, 2026-03-15)
- `posts/index.json`: 11개 포스트, 3 clusters, 3 bridge papers, 1 outlier

## 7) 컨텍스트 메모 (다음 세션용)
- Substack 구독 URL 환경변수: `NEXT_PUBLIC_SUBSTACK_EN_URL`, `NEXT_PUBLIC_SUBSTACK_KO_URL`
- SubstackSubscribe는 URL 미설정 시 자동으로 `null` 반환 (렌더링 안 함)
- 발행 캐시: `.substack-published.json` (gitignore됨, CI에서 매번 재생성)
- python-substack: `pip install substack-api` 필요
- dev 서버: Turbopack 사용 중 — `⚠ Webpack is configured` 경고는 무해함
- Container 컴포넌트: `src/components/ui/Container.tsx`
- 공유 헬퍼: `src/lib/display.ts`
