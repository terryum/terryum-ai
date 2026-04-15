# CURRENT_STATUS.md

> 목적: `/clear` 이후에도 이전 작업을 빠르게 재개하기 위한 **짧은 스냅샷** (append 금지, 매번 덮어쓰기)

## 1) 세션 스냅샷
- 마지막 업데이트: 2026-04-15 (KST)
- 현재 단계: R2 마이그레이션 완료, 코드 리팩토링 1차 완료, 포스트 #28~#37 발행
- 전체 진행도(대략): v1 100% + 인프라 최적화 완료

## 2) 지금 기준 핵심 결정 (최대 5개)
- 인프라: Cloudflare(DNS/CDN/R2) + Vercel(배포) + GitHub + Supabase(DB)
- 이미지 서빙: **Cloudflare R2 CDN** (posts/ 이미지, public/posts는 OG만 유지)
- Git repo: 72MB (이전 824MB에서 91% 감소, filter-repo 완료)
- 참고문헌: Supabase graph_edges → sync-references.mjs → MDX 양방향 자동 동기화
- 워크스페이스: terry-artlab-homepage (코드), terry-obsidian (콘텐츠), terry-surveys (개발 중)

## 3) 완료됨
- [x] 포스트 37개 발행 (papers 32, essays 4, memos 1)
- [x] Cloudflare R2 마이그레이션 (439개 이미지)
- [x] Git 히스토리 정리 (filter-repo, 289MB → 53MB)
- [x] PDF/이미지 Git에서 제거 (posts/ 302MB → 1.5MB)
- [x] public/posts/ 이중 저장 제거 (245MB → 17MB OG만)
- [x] 참고문헌 시스템 전면 수정 (ReferenceCard, sync-references)
- [x] /post 스킬 확장 (Synthesis, PDF fallback, R2 통합)
- [x] 코드 리팩토링 (auth-common 추출, scripts/lib/, 데드 코드 삭제)
- [x] S2 Survey 500 에러 수정

## 4) 진행 중 / 막힘
- 없음

## 5) 다음 3개 작업 (우선순위)
1. **terry-papers 워크스페이스 분리**: 콘텐츠(MDX)를 별도 repo로 분리하여 코드 개발과 병렬화
2. **추가 리팩토링**: Card 컴포넌트 공통화, FilterablePostList 분할, scripts lib 전환
3. **Obsidian 연동 업데이트**: sync-obsidian.mjs R2 URL 호환

## 6) 검증 상태 (요약)
- R2 CDN 이미지 서빙: 모든 포스트 정상 ✅
- OG 이미지: Vercel에서 정상 서빙 ✅
- S2 Survey: 200 OK (snu/admin 그룹) ✅
- Build 성공 ✅
- Git repo 72MB ✅

## 7) 컨텍스트 메모 (다음 세션용)
- R2: bucket=terry-artlab-homepage-assets, URL=pub-b74efb4aaf3d47cfbbad2283798604f7.r2.dev
- Vercel env: NEXT_PUBLIC_R2_URL 설정됨
- build 명령: `npm run build` (copy-post-images 제거됨, build:full로 이동)
- 새 포스트 시: upload-to-r2.mjs --slug=<slug> 실행 필요
- 포트: 3040
