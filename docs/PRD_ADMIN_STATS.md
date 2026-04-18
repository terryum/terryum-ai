# PRD_Admin_Stats.md

## 0) 요약
- 관리자 탭 `Stats`를 구현한다.
- 데이터 소스는 **Google Analytics(GA4)**로 한다:
  - 사이트 트래킹: GA4 스크립트(또는 GTM) 설치
  - 대시보드 데이터: **Google Analytics Data API**로 서버에서 조회하여 `/admin/stats`에 표시

## 1) 목표
- 기간별(7d/30d/90d/커스텀) 방문자/조회수 확인
- 게시물(페이지)별 조회수 Top 리스트
- 게시물별 “추정 읽는 시간(estimated)” 표시 (콘텐츠 메타 기반)
- 운영자가 “무엇이 먹히는지” 빠르게 판단 가능

## 2) 비목표
- 일반 사용자에게 통계 공개
- 실시간 초정밀 BI(세그먼트/코호트/캠페인 자동화)
- 페이지별 ‘정확한’ 체류시간을 100% 보장 (GA 지표 제약/호환성 고려)

## 3) 구현 개요
### A. GA4 설치(수집)
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` 기반으로 프로덕션에서만 GA 스크립트 주입
- 관리자 페이지(/admin)도 추적할지 여부는 옵션 (기본은 제외 권장)

### B. Data API 조회(표시)
- `/api/admin/stats` 서버 라우트에서 GA Data API `runReport` 호출
- `/admin/stats`는 위 API를 호출해 KPI/차트/테이블 렌더링
- Data API 인증은 **서비스 계정** 사용:
  - 서비스 계정 이메일을 GA4 Property에 사용자로 추가
  - 자격증명(JSON)은 Cloudflare Worker secret으로 저장 (`wrangler secret put GA_SERVICE_ACCOUNT_JSON`, 서버에서만 사용)

참고: GA Data API는 GA4 리포트 데이터에 프로그램적으로 접근하는 API이며, `runReport`로 커스텀 리포트를 생성한다. citeturn1search1turn1search0

## 4) 지표 정의 (MVP)
- KPI 카드:
  - Visitors: `activeUsers`(권장) 또는 `totalUsers`
  - Pageviews: `screenPageViews`(웹의 pageview에 대응)
  - Engagement(가능하면): `userEngagementDuration` 등 호환 가능한 지표
- 시계열:
  - 일별 Visitors / Pageviews
- Top Posts 테이블(기간 내):
  - Path (권장 dimension: `pagePathPlusQueryString` 또는 호환 가능한 page path dimension)
  - Pageviews
  - Visitors(가능 시)
  - Estimated read time(콘텐츠 메타)
  - Published date(콘텐츠 메타)

주의: GA4 Data API는 차원/지표 조합 호환성 제약이 있으므로, “page path + duration” 같은 조합은 체크가 필요하다. (호환 불가 시 duration은 별도 카드/리포트로 분리) citeturn1search0turn0search10

## 5) UI/기능 요구사항
- 기간 필터: `7d`, `30d`, `90d`, `custom`
- 화면 구성:
  1) KPI 카드
  2) 시계열 차트
  3) Top Posts 테이블
  4) Referrers Top(선택, GA 차원 지원 시)
- 관리자 탭 바에서 `Stats` 활성 표시

## 6) 보안/성능
- GA 서비스계정 JSON/키는 **서버에서만** 사용 (클라이언트 노출 금지)
- `/api/admin/*`는 admin 세션 없으면 401
- 캐싱: 동일 기간 요청은 1~5분 캐시(관리자 UX 개선 + quota 보호)

Cloudflare Worker 환경변수는 `wrangler.jsonc`의 `vars`(공개)와 `wrangler secret put`(민감)로 분리 관리한다. 민감 값은 반드시 secret으로 저장.

## 7) 환경변수(키 이름만)
- Admin: `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`
- GA 수집: `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- GA 조회(Data API):
  - `GA_PROPERTY_ID`
  - `GA_SERVICE_ACCOUNT_JSON` (서비스 계정 JSON 문자열 또는 base64)
  - (대안) `GOOGLE_APPLICATION_CREDENTIALS` 파일 경로 방식은 Workers 런타임에서 파일 시스템 접근이 제한되므로 사용 불가 — JSON 문자열 방식만 지원

## 8) 검증 체크(MVP)
- 관리자 인증 후 `/admin/stats` 접근 가능
- 기간 선택에 따라 KPI/차트/Top Posts 갱신
- prod에서 GA 이벤트가 들어오고, Data API 조회가 성공
- 토큰/키가 브라우저로 노출되지 않음
