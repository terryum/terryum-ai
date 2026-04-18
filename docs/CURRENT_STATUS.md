# CURRENT_STATUS.md

> 목적: `/clear` 이후에도 이전 작업을 빠르게 재개하기 위한 **짧은 스냅샷** (append 금지, 매번 덮어쓰기)

## 1) 세션 스냅샷
- 마지막 업데이트: 2026-04-18 (KST)
- 현재 단계: Vercel → Cloudflare 이전 완료, Vercel 프로젝트 전량 삭제, Vercel 잔여 참조 문서 정리 중
- 전체 진행도(대략): v1 100% + 인프라 이전/최적화 완료

## 2) 지금 기준 핵심 결정 (최대 5개)
- 인프라: **Cloudflare Workers(OpenNext) + Pages + R2 + GitHub + Supabase**. Vercel 완전 제거 완료
- Canonical 도메인: **`www.terryum.ai`** (terryum.ai apex → www 308 redirect · 구 terry.artlab.ai → AWS CloudFront 301 redirect)
- 이미지 서빙: **Cloudflare R2 CDN** (포스트 이미지) + Worker 번들 (OG 이미지)
- Survey: 3개 모두 Cloudflare Pages (`survey-*.pages.dev`) — snu는 group-only (visibility='group', 메타공개+본문보호)
- 워크스페이스: terry-artlab-homepage (코드), terry-obsidian (콘텐츠), terry-surveys, terry-papers

## 3) 완료됨
- [x] 포스트 37개 이상 발행
- [x] Cloudflare R2 마이그레이션 (이미지 CDN)
- [x] Git 히스토리 정리 (filter-repo)
- [x] 코드 리팩토링 (auth-common 추출, scripts/lib/, 데드 코드 삭제)
- [x] Vercel → Cloudflare Workers 이전 (OpenNext)
- [x] terryum.ai 도메인 구매 + www.terryum.ai 바인딩
- [x] AWS CloudFront + S3로 terry.artlab.ai/* → www.terryum.ai/* 301
- [x] Vercel 프로젝트 4개 전량 삭제 (메인 + survey 3)
- [x] 스킬 문서 (post, survey, project) Vercel 참조 제거
- [x] 코드베이스 (.env.example, publish-social*.py, CLAUDE.md, 등) Vercel 참조 정리

## 4) 진행 중 / 막힘
- 없음

## 5) 다음 3개 작업 (우선순위)
1. **Vercel 레거시 문서 정리 마무리**: docs/TECH_ARCHITECTURE, PRD_*, IMAGE_LOADING_STRATEGY 등 잔여 설명 Cloudflare 기준으로 통일
2. **추가 리팩토링**: Card 컴포넌트 공통화, FilterablePostList 분할
3. **Obsidian 연동 업데이트**: sync-obsidian.mjs R2 URL 호환

## 6) 검증 상태 (요약)
- `https://www.terryum.ai/en` HTTP 200 ✅
- GA4 (`G-3KR4M92C3G`) production HTML에 임베드, `collect` 요청 정상 ✅
- R2 CDN 이미지 서빙: 모든 포스트 정상 ✅
- Survey 3개 iframe + snu auth gate 동작 ✅
- terryum.ai apex → www 308 ✅
- terry.artlab.ai/* → www.terryum.ai/* 301 (AWS CloudFront) ✅

## 7) 컨텍스트 메모 (다음 세션용)
- R2 버킷: `terry-artlab-homepage-cache` (incremental cache, Worker 바인딩), public assets CDN=`pub-b74efb4aaf3d47cfbbad2283798604f7.r2.dev`
- 빌드/배포: `npm run build:cf` → `npx opennextjs-cloudflare deploy`
- Cache populate: 새 빌드 시 `node /tmp/populate-r2.mjs` 수동 실행 (OpenNext populate 플로우 실패 시 대안)
- `.env.production`은 `NEXT_PUBLIC_*`만 commit (번들 인라인용), 민감값은 `wrangler secret put`
- 포트: 3040
- 월 비용: ~$3-5 (from $179)
