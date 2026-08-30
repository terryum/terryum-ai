# CURRENT_STATUS.md

> 목적: `/clear` 이후에도 이전 작업을 빠르게 재개하기 위한 짧은 스냅샷 (append 금지, 매번 덮어쓰기)

## 1) 세션 스냅샷

- 마지막 업데이트: 2026-08-30 (KST)
- 현재 브랜치: `feat/about-mission`
- 현재 단계: About / Mission & Principles 개편 구현 및 로컬 검증 완료, 사용자 시각 검수 대기
- 배포 상태: 승인 전 — 원격 push, `main` 병합, 배포 모두 미수행

## 2) 이번 작업의 핵심 결정

- 공식 브랜드 문구: **AI와 Robotics의 최전선을, 일상의 현실로.** / **Turning frontier AI & Robotics into everyday reality.**
- `/ko/about`, `/en/about`는 프로필·현재 역할·Featured Elsewhere·연락처를 빠르게 파악하는 허브로 유지
- 장문 미션과 원칙은 날짜 없는 영구 하위 페이지 `/ko/about/mission`, `/en/about/mission`으로 분리
- 프로필 사진·Short Bio·소셜 링크·로컬 내비게이션은 두 About 경로의 공통 셸로 유지하고 탭 아래 본문만 전환
- Purpose / Vision / Mission은 카드가 아닌 구분선 중심의 에디토리얼 정보 블록으로 표현
- Featured Elsewhere와 Contact 데이터·구조는 유지하고 `currently`는 코스맥스 AI & Robotics 총괄을 주업으로, 서울대 겸임교수와 AI미래포럼 공동의장을 보조 역할로 표현
- Bio 문체는 한국어 Home/About에서 무주어 `-이다/-한다` 평서체, 영어 Home에서 간결한 noun phrase, 영어 About에서 3인칭 professional bio를 사용
- Mission & Principles 장문은 개인의 신념을 직접 선언하는 문서이므로 1인칭을 유지

## 3) 구현 내용

- 한·영 Home bio와 About 소개를 제조 중심에서 상위 AI & Robotics 미션 중심으로 재작성
- About 로컬 내비게이션과 Mission CTA 추가
- About과 Mission이 같은 프로필 헤더를 공유하도록 컴포넌트화
- 한·영 Mission & Principles 장문 MDX, route, metadata, canonical, language alternates 추가
- Mission 콘텐츠 로더와 metadata용 plain-text 정리 추가
- sitemap, `SITEMAP_IA`, `PAGE_SPECS`, root description 갱신
- 브랜드 헌장과 수정된 개발 명세를 `docs/`에 저장
- 공식 연구자·창업가 Bio 관례를 검토해 Home/About의 1인칭 자기소개서 문체를 에디토리얼 Bio 문체로 수정

## 4) 검증 상태

- `npm run type-check`: PASS
- `npm run build`: PASS — 한·영 Mission route SSG 생성 확인
- `npm run lint`: 저장소에 ESLint 설정이 없어 `next lint`가 초기 설정 프롬프트에서 중단
- Home/About/Mission/Posts/Surveys 대상 로컬 HTTP 응답: 모두 200
- Mission canonical, KO/EN alternates, sitemap URL, Home description의 MDX 태그 제거 확인
- 연결 가능한 인앱 브라우저가 없어 자동 시각 검수는 미수행; 로컬 서버 `http://localhost:3040`에서 사용자 검수 대기

## 5) 승인 후 작업

- 사용자 피드백 반영 후 타입 검사와 빌드 재실행
- `gh context`에서 개인 `terryum` 계정과 owner 확인
- 최신 `origin/main` 위로 feature 브랜치 rebase 후 fast-forward merge
- `main` push, Cloudflare 자동 배포 완료 확인, 실제 한·영 About/Mission URL smoke test

## 6) 기존 운영 제약

- 인프라: Cloudflare Workers(OpenNext) + Pages + R2 + GitHub
- Canonical 도메인: `www.terryum.ai`
- 비공개 본문은 R2의 메타와 MDX가 모두 준비되어야 렌더링됨
- 외부 inbound의 옛 `memos`/`threads` 탭은 middleware의 308 호환 경로로만 유지
