# TECH_ARCHITECTURE.md

## 목적
v1 개인 웹사이트의 기술 구성과 시스템 경계를 정의한다.
(세부 라우팅 규칙은 `I18N_ROUTING.md`, 콘텐츠/발행 절차는 `POSTING_WORKFLOW.md` 참고)

## v1 핵심 결정사항 (확정)
- 도메인 구매/관리: **Cloudflare Registrar** (`terryum.ai`)
- DNS/CDN: **Cloudflare DNS + CDN**
- 배포: **Cloudflare Workers (OpenNext)** — 메인 사이트
- 보조 배포: **Cloudflare Pages** — survey book 3종
- 저장소/협업: **GitHub**
- 초기 자동화: **Claude Code가 설정 파일/CI 초안 자동 생성**
- v1 범위: **자체 사이트만 운영 (Substack 연동 없음)**

## 아키텍처 원칙
- `posts/` 파일 구조가 콘텐츠의 단일 소스 오브 트루스
- 한국어/영어 동시 게시를 기본 전제로 설계
- 정적 생성(SSG) 우선 + R2 incremental cache로 서빙
- 자동화는 Claude Code가 담당하고, 최종 결과는 Git에 기록
- 단순성/운영 안정성을 우선하고 확장은 v2로 미룸

## 권장 스택 (v1)
- 프론트엔드: **Next.js 15 (App Router) + TypeScript**
- 스타일링: Tailwind CSS v4
- 콘텐츠 렌더링: MDX (`ko.mdx`, `en.mdx`)
- 저장소: GitHub 단일 repo
- 배포: Cloudflare Workers (OpenNext 어댑터로 Next.js 빌드를 Worker 번들로 변환)
- 도메인/네트워크: Cloudflare (Registrar/DNS/CDN/Workers/Pages/R2)

## 시스템 구성도 (개념)
1. 사용자가 VS Code에서 한국어 원고 + 이미지 준비
2. Claude Code가 번역/메타/커버/리네임 처리 후 GitHub push
3. 개발자가 로컬에서 `npm run build:cf` → `opennextjs-cloudflare deploy` 수행
4. 사용자 접속 시 Cloudflare DNS → Worker 실행 (R2 incremental cache 경유)

## 역할 분담
### Cloudflare
- 도메인 구매/갱신 (Registrar — `terryum.ai`)
- DNS 레코드 관리 (`www.terryum.ai` A/AAAA, apex `terryum.ai` A)
- CDN 캐싱/전달
- **Workers**: 메인 사이트 런타임 (OpenNext로 컴파일된 Next.js 번들 실행)
- **Pages**: survey book 정적 사이트 3종 (`survey-*.pages.dev`)
- **R2**: incremental cache 버킷 (`terry-artlab-homepage-cache`) + 에셋 public CDN 버킷 (`pub-b74efb4aaf3d47cfbbad2283798604f7.r2.dev`)
- Bot Fight Mode 활성으로 봇 트래픽 차단

### AWS (레거시 도메인 리다이렉트 전용)
- Route 53: `artlab.ai` zone 유지 (16개 Cosmax 프로덕션 서비스)
- S3 static website + CloudFront + ACM으로 `terry.artlab.ai/*` → `https://www.terryum.ai/*` 301 리다이렉트
- Vercel 거치지 않고 AWS 레벨에서 직접 리다이렉트

### GitHub
- 사이트 코드 + `posts/` 콘텐츠 저장
- 브랜치/PR 기반 변경 관리
- 변경 이력 추적
- (선택) Actions 기반 보조 CI 작업

### Claude Code
- 포스팅 퍼블리시 자동화 (번역/cover/meta/이미지 정리)
- 프로젝트 설정 및 코드 변경

## 렌더링/빌드 전략
- **SSG 우선**: 포스트 페이지는 빌드 시점 정적 생성 (`dynamicParams = false`)
- 새 포스트 반영 시 전체 빌드 + `opennextjs-cloudflare deploy`
- 언어 분기: 미들웨어에서 처리 (`src/middleware.ts`) — apex `terryum.ai` → `www` 308 리다이렉트도 미들웨어 담당
- R2 incremental cache: Worker가 빌드 시 생성된 `.cache` 파일을 R2에서 조회 (populate-r2.mjs 스크립트로 업로드)
- 검색: v1 제외 (목록 필터 정도만 허용)

## 캐싱 전략

### 페이지 (HTML)
- SSG로 빌드 시점에 정적 HTML 생성
- Worker에서 R2 incremental cache 조회 → Cloudflare CDN 캐싱
- 새 빌드 시 해시 기반 새 R2 키로 저장, 이전 캐시는 유효하지 않게 됨

### 이미지
| 대상 | 캐시 정책 | 설정 위치 |
|------|-----------|-----------|
| `/images/*`, `/fonts/*`, `/_next/static/*` | `public, max-age=31536000, immutable` (1년) | `public/_headers` |
| Next.js 최적화 이미지 | `minimumCacheTTL: 86400` (24시간) | `next.config.ts` images |
| 포스트 커버/figure | R2 public CDN (`pub-b74efb...r2.dev`) | R2 버킷 설정 |

### 기타
- DNS Prefetch: 전역 활성화 (`X-DNS-Prefetch-Control: on`)
- 폰트: Next.js `next/font`로 자동 최적화 + 캐싱

## 최소 백엔드 범위 (v1)
- 대부분의 페이지는 SSG
- Admin API 라우트(`/api/admin/stats` 등)만 Worker 런타임에서 실행
- 뉴스레터/구독 기능은 v2 이후

## 환경 구성
- Local: 더미 콘텐츠 포함 개발 환경 (`npm run dev`, port 3040)
- Production: `main` 브랜치 기준 수동 `opennextjs-cloudflare deploy`
- 환경변수는 `wrangler.jsonc` `vars`(공개) + `wrangler secret put`(민감) + GitHub Actions secrets(소셜 퍼블리싱)로 관리

## v2 확장 포인트 (참고)
- Substack 연동/이관
- arXiv 링크 기반 자동 요약 포스팅 (현재 수동 `/post`)
- 검색/태그 고도화
- 운영자용 검수 도구
