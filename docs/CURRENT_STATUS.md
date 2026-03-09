# CURRENT_STATUS.md

> 목적: `/clear` 이후에도 이전 작업을 빠르게 재개하기 위한 **짧은 스냅샷** (append 금지, 매번 덮어쓰기)

## 1) 세션 스냅샷
- 마지막 업데이트: 2026-03-10 (KST)
- 현재 단계: AI Memory 시스템 구현 완료 (글번호 + 메타데이터 강화 + 중앙 인덱스)
- 전체 진행도(대략): 100% (v1 기능 완료 + 지속 개선)

## 2) 지금 기준 핵심 결정 (최대 5개)
- 인프라: Cloudflare(도메인/DNS/CDN) + Vercel(배포+SSL) + GitHub
- 도메인: `terry.artlab.ai` (Namecheap CNAME → cname.vercel-dns.com)
- 스택: Next.js 15.5 (App Router) + TypeScript + Tailwind CSS v4 + next-mdx-remote v6
- AI Memory: 글번호(`post_number`) + `ai_summary` + `relations` + `concept_index` → `posts/index.json`
- 새 포스트 생성 시 `node scripts/generate-index.mjs` 실행 필수

## 3) 완료됨
- [x] v1 전체 기능 (스캐폴딩~ForceVLA 포스팅~UI 개선)
- [x] 리팩토링: 유틸 추출, 라우트 통합, 컴포넌트 분리, 설정 중앙화, 문서 정리
- [x] Ideas 탭 첫 포스트: `260310-on-the-manifold-frist-post` 생성
- [x] AI Memory 시스템: `PostMeta` 타입 확장, 5개 meta.json 마이그레이션, UI #N 표시, `generate-index.mjs` 스크립트, POST_GENERATOR 문서 업데이트

## 4) 진행 중 / 막힘
- 막힘/리스크: 없음

## 5) 다음 3개 작업 (우선순위)
1. 다음 Research 논문 포스팅 추가 (post_number: 6)
2. Essays 탭 첫 포스트 작성
3. 커밋 후 Vercel 배포 확인

## 6) 검증 상태 (요약)
- 빌드: 성공 (네트워크 TLS 이슈로 Google Fonts fetch 실패 시 `NODE_TLS_REJECT_UNAUTHORIZED=0` 필요 — 로컬 환경 문제)
- `posts/index.json`: 5개 포스트, 5개 knowledge graph edges, 17개 concept entries

## 7) 컨텍스트 메모 (다음 세션용)
- AI Memory 필드: `post_number`, `domain`, `subfields`, `key_concepts`, `methodology`, `contribution_type`, `relations`, `ai_summary`, `idea_status`, `related_posts`
- 인덱스 스크립트: `scripts/generate-index.mjs` — 모든 meta.json → `posts/index.json` (knowledge_graph, concept_index, domain_stats)
- `.next` 캐시: `npm run build`에서 자동 정리 (scripts/clean-next.mjs)
- dev 서버: Turbopack 사용 중 — `⚠ Webpack is configured` 경고는 무해함
