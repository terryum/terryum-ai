# CURRENT_STATUS.md

> 목적: `/clear` 이후에도 이전 작업을 빠르게 재개하기 위한 **짧은 스냅샷** (append 금지, 매번 덮어쓰기)

## 1) 세션 스냅샷
- 마지막 업데이트: 2026-03-17 (KST)
- 현재 단계: GA4 Analytics 대시보드 확장 완료 (빌드 검증 완료)
- 전체 진행도(대략): 100%

## 2) 지금 기준 핵심 결정 (최대 5개)
- 인프라: Cloudflare(도메인/DNS/CDN) + Vercel(배포+SSL) + GitHub
- 도메인: `terry.artlab.ai` (Namecheap CNAME → cname.vercel-dns.com)
- 스택: Next.js 15.5 (App Router) + TypeScript + Tailwind CSS v4 + next-mdx-remote v6
- AI Memory: 글번호(`post_number`) + `ai_summary` + `relations` + `concept_index` + `taxonomy` → `posts/index.json`
- content_type 완전 정렬: `papers`/`notes`/`tech`/`essays` = 탭 슬러그 = 디렉토리명

## 3) 완료됨
- [x] v1 전체 기능 (스캐폴딩~ForceVLA 포스팅~UI 개선)
- [x] AI Memory 시스템, Research 포스팅 자동화, Social Media v2
- [x] OG 이미지 수정 + 소셜봇 허용 (robots.ts, /posts/[slug] AutoRedirect)
- [x] **GA4 Analytics 대시보드 확장**:
  - `src/components/GoogleAnalytics.tsx` — gtag.js 삽입 (신규)
  - `src/app/layout.tsx` — GoogleAnalytics 컴포넌트 추가
  - `src/app/api/admin/stats/route.ts` — 5개 병렬 쿼리 (KPI/트렌드/유입경로/국가/포스팅별)
  - `src/app/admin/stats/page.tsx` — recharts 기반 시각화 대시보드
  - `src/app/admin/stats/TrendChart.tsx` — 일별 방문자 LineChart (신규)
  - `src/app/admin/stats/SourcesChart.tsx` — 유입경로 가로 BarChart (신규)
  - `src/app/admin/stats/CountriesChart.tsx` — 국가별 방문자 가로 BarChart (신규)

## 4) 진행 중 / 막힘
- 없음 (코드 구현 완료)

## 5) 다음 3개 작업 (우선순위)
1. **사용자 직접 수행**: GA4 측정 ID 취득 → `.env.local` + Vercel 환경변수에 `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX` 추가
2. **배포 및 GA4 실시간 확인**: analytics.google.com 실시간 보고서에서 접속자 확인
3. **Admin Stats 대시보드 검증**: `/admin` 로그인 → Stats → 7d/30d/90d 전환 + KO/EN 탭 확인

## 6) 검증 상태 (요약)
- 빌드: TypeScript OK (2026-03-17 기준)
- recharts 설치 완료 (39 packages)
- `npm run build` 성공 확인

## 7) 컨텍스트 메모 (다음 세션용)
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` 미설정 시 gtag.js 코드가 삽입되지 않음 → 데이터 수집 없음
- recharts 차트 컴포넌트는 `dynamic import + ssr: false`로 브라우저에서만 로드
- UTM 파라미터: 미들웨어(Facebook), publish-social.py(Threads)에서 이미 자동 삽입 → gtag.js 설치만으로 GA4에서 자동 추적됨
- dev 서버: Turbopack 사용 중 (`npm run dev`, 포트 3040)
