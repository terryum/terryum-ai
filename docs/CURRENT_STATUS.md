# CURRENT_STATUS.md

> 목적: `/clear` 이후에도 이전 작업을 빠르게 재개하기 위한 **짧은 스냅샷** (append 금지, 매번 덮어쓰기)

## 1) 세션 스냅샷
- 마지막 업데이트: 2026-04-07 (KST)
- 현재 단계: Inline visibility 기반 ACL 시스템 구현 완료. 포스트별 공개 범위(public/group) 지원.
- 전체 진행도(대략): 100%

## 2) 지금 기준 핵심 결정 (최대 5개)
- 인프라: Cloudflare(도메인/DNS/CDN) + Vercel(배포+SSL) + GitHub
- 스택: Next.js 15.5 (App Router) + TypeScript + Tailwind CSS v4 + next-mdx-remote v6
- AI Memory: `posts/index.json` + Supabase Graph DB (papers, graph_edges, node_layouts)
- ACL: Git 파일 기반 inline visibility — meta.json에 `visibility`/`allowed_groups` 필드, `/co/[group]`은 로그인 전용
- content_type: `papers`/`notes`/`memos`/`essays` = 탭 슬러그 = 디렉토리명

## 3) 완료됨
- [x] v1 전체 기능 + AI Memory 시스템 + Research 포스팅 자동화
- [x] Inline visibility ACL 시스템: 포스트별 group 접근 제어, filterByVisibility, /co/[group] 로그인→리다이렉트
- [x] #26 TacScale, #27 TacPlay 포스트 — visibility: group, allowed_groups: ["snu"]
- [x] Supabase private_content 별도 포털 → Git 파일 기반 inline 필터링으로 전환
- [x] /post 스킬: 가상 논문(Virtual Paper) 경로 + visibility 옵션 추가
- [x] sitemap에서 group 포스트 제외, noindex 적용

## 4) 진행 중 / 막힘
- (없음)

## 5) 다음 3개 작업 (우선순위)
1. **커밋/푸시**: ACL 시스템 + #26/#27 포스트 변경 커밋
2. **Admin Graph UI 검증**: `/admin/graph`에서 노드/엣지 확인 (Supabase 연결 필요)
3. **GA4 설정**: `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX` 환경변수 추가

## 6) 검증 상태 (요약)
- npm run build 성공 ✅
- 비인증 /ko/posts → #26, #27 카드 링크 미노출 ✅
- SNU 로그인 후 /ko/posts → #26, #27 카드 링크 노출 ✅
- 비인증 /ko/posts/2610-... → RSC redirect to /co/snu?redirect=... ✅
- /co/snu 인증 후 → /posts로 307 리다이렉트 ✅
- /co/snu?redirect=<url> → 해당 URL로 307 리다이렉트 ✅

## 7) 컨텍스트 메모 (다음 세션용)
- ACL 그룹 비밀번호: CO_SNU_PASSWORD 환경변수
- 포스트 목록/상세 모두 force-dynamic (쿠키 기반 세션 체크)
- Supabase private_content 테이블은 deprecated (데이터 남아있으나 미사용)
- dev 서버: Turbopack (`npm run dev`, 포트 3040)
