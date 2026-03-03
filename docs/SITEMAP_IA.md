# SITEMAP_IA.md

## 문서 목적
- v1 개인 홈페이지의 사이트맵과 정보구조(IA)를 정의한다.
- 메뉴, URL, 페이지별 핵심 섹션, 탐색 흐름만 다룬다.
- 제품 목표/성공기준/운영정책은 PRD.md에서 관리한다.

## 글로벌 내비게이션
- Home
- Ideas
- Research
- About
- Language Switcher (KO / EN)
- Social Links (icon)

## URL 구조 (언어별)
- `/` : 브라우저 언어 감지 후 `/ko` 또는 `/en`으로 라우팅
- `/ko`, `/en` : 각 언어 Home

### 페이지 경로
- Home: `/ko`, `/en`
- Ideas: `/ko/write`, `/en/write`
- Research: `/ko/read`, `/en/read`
- About: `/ko/about`, `/en/about`

### 상세 포스트 경로
- Write post: `/ko/write/[slug]`, `/en/write/[slug]`
- Read post: `/ko/read/[slug]`, `/en/read/[slug]`

## 사이트맵 (계층)
- `/`
  - `/{locale}` (Home)
    - `/{locale}/write`
      - `/{locale}/write/[slug]`
    - `/{locale}/read`
      - `/{locale}/read/[slug]`
    - `/{locale}/about`

## 페이지별 IA

### 1) Home
- Hero (이름, 한 줄 소개, 프로필 사진)
- Short Bio (요약 소개)
- Social Links
- Latest Ideas (최근 글)
- Latest Research (최근 논문/리포트 요약)
- Newsletter CTA 영역 (v1 폼 연동 예정)

### 2) Ideas (목록)
- 페이지 소개 문구
- 글 카드 리스트 (썸네일, 제목, 요약, 발행일, 태그)
- 기본 정렬: 최신순
- 페이지네이션 또는 Load More (구현 방식은 기술 문서에서 결정)

### 2-1) Ideas (상세)
- 제목 / 메타정보 (날짜, 태그)
- 본문(MDX/Markdown 렌더링)
- 언어 전환 링크 (KO/EN 대응 포스트)
- 이전/다음 글 링크 (옵션)

### 3) Research (목록)
- 페이지 소개 문구
- 글 카드 리스트 (썸네일, 제목, 요약, 발행일, 태그)
- 기본 정렬: 최신순
- 페이지네이션 또는 Load More (구현 방식은 기술 문서에서 결

### 3-1) Research (상세)
- 제목 / 메타정보 (날짜, 태그)
- 본문(MDX/Markdown 렌더링)
- 언어 전환 링크 (KO/EN 대응 포스트)
- 이전/다음 글 링크 (옵션)

### 4) About
- 프로필 사진
- 상세 Bio (마크다운 파일로 제공 예정)
- Contact (이메일/소셜 링크)
- (향후 v2에선) 뉴스레터 구독

## 공통 IA 규칙
- 모든 페이지에 동일한 상단 내비게이션 유지
- 모든 상세 포스트에 언어 전환 진입점 제공
- Write/Read 목록/상세는 공용 템플릿 기반으로 동일 구조를 사용하고, 차이는 출처 표시 등 최소 필드만 둔다.
- Home은 최신 콘텐츠 허브, 전체 탐색은 각 탭에서 수행
