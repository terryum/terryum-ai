# TECH_ARCHITECTURE.md

## 목적
v1 개인 웹사이트의 기술 구성과 시스템 경계를 정의한다.
(세부 라우팅 규칙은 `I18N_ROUTING.md`, 콘텐츠 구조는 `CONTENT_MODEL.md`, 운영 절차는 `POSTING_WORKFLOW.md` 참고)

## v1 핵심 결정사항 (확정)
- 도메인 구매/관리: **Cloudflare Registrar**
- DNS/CDN: **Cloudflare DNS + CDN**
- 배포: **Vercel**
- 저장소/협업: **GitHub**
- 초기 자동화: **Claude Code가 설정 파일/CI 초안 자동 생성**
- v1 범위: **자체 사이트만 운영 (Substack 연동 없음)**

## 아키텍처 원칙
- `posts/` 파일 구조가 콘텐츠의 단일 소스 오브 트루스
- 한국어/영어 동시 게시를 기본 전제로 설계
- 정적 생성(SSG) 우선, 최소 서버 기능만 사용
- 자동화는 Claude Code가 담당하고, 최종 결과는 Git에 기록
- 단순성/운영 안정성을 우선하고 확장은 v2로 미룸

## 권장 스택 (v1)
- 프론트엔드: **Next.js (App Router) + TypeScript**
- 스타일링: Tailwind CSS
- 콘텐츠 렌더링: MDX (`ko.mdx`, `en.mdx`)
- 저장소: GitHub 단일 repo
- 배포: Vercel (GitHub 연동 자동 배포)
- 도메인/네트워크: Cloudflare (Registrar/DNS/CDN)

## 시스템 구성도 (개념)
1. 사용자가 VS Code에서 한국어 원고 + 이미지 준비
2. Claude Code가 번역/메타/커버/리네임 처리 후 GitHub push
3. GitHub 변경 감지 → Vercel 자동 빌드/배포
4. 사용자 접속 시 Cloudflare DNS/CDN 경유 후 Vercel 앱 응답

## 역할 분담
### Cloudflare
- 도메인 구매/갱신
- DNS 레코드 관리
- CDN 캐싱/전달
- (선택) 기본 보안/성능 설정

### Vercel
- GitHub 연동 배포
- Preview/Production 환경 제공
- 빌드/호스팅 실행
- (필요 시) 서버리스 함수 실행 (v2에서 뉴스레터 폼 등)

### GitHub
- 사이트 코드 + `posts/` 콘텐츠 저장
- 브랜치/PR 기반 변경 관리
- 변경 이력 추적
- (선택) Actions 기반 보조 CI 작업

### Claude Code
- 포스팅 퍼블리시 자동화 (번역/cover/meta/이미지 정리)
- 프로젝트 설정 파일 초안 생성 (`package.json`, lint, formatter, env 예시 등)
- CI/CD 관련 설정 초안 생성 (예: GitHub Actions, Vercel 설정 보조 파일)
- 초기 개발용 더미 콘텐츠 생성

## 렌더링/빌드 전략 (요약)
- Home/목록/상세: SSG 우선
- 언어 분기: 미들웨어 또는 진입 라우트에서 처리
- 검색: v1 제외 (목록 필터 정도만 허용)
- 콘텐츠 처리 세부 규칙: `CONTENT_MODEL.md`, `POSTING_WORKFLOW.md` 준수

## 최소 백엔드 범위 (v1)
Substack 이전 단계이므로 뉴스레터는 **최소 구독 폼 처리**만 고려한다.
- 허용 기능: 이메일/언어선호/관심사 제출 및 검증
- 구현 위치: Vercel 서버리스(Route Handler) 또는 외부 이메일 서비스 API 연동
- 제외 기능: 자체 발송 시스템, 관리자 CMS, 결제/멤버십

## 환경 구성
- Local: 더미 콘텐츠 포함 개발 환경
- Preview: PR/브랜치 기반 미리보기 (Vercel)
- Production: 메인 브랜치 배포
- 환경변수는 Vercel/GitHub 시크릿으로 관리 (비밀키 클라이언트 노출 금지)

## v1 구현 산출물 (Claude Code 자동 생성 대상)
- 프로젝트 기본 설정 파일 (TS/Next/Tailwind/Lint/Format)
- 배포/실행 문서 초안
- CI 설정 초안 (필요 시)
- 더미 포스트/더미 섹션 데이터

## v2 확장 포인트 (참고)
- Substack 연동/이관
- arXiv 링크 기반 자동 요약 포스팅
- 검색/태그 고도화
- 운영자용 검수 도구
