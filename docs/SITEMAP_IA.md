# SITEMAP_IA.md

## 문서 목적
- v1 개인 홈페이지의 사이트맵과 정보구조(IA)를 정의한다.
- 메뉴, URL, 페이지별 핵심 섹션, 탐색 흐름만 다룬다.
- 제품 목표/성공기준/운영정책은 PRD.md에서 관리한다.

## 글로벌 내비게이션
- Home
- Essays
- Surveys
- Papers
- Notes
- About
- Language Switcher (KO / EN)
- Social Links (icon)

## URL 구조 (언어별)
- `/` : 브라우저 언어 감지 후 `/ko` 또는 `/en`으로 라우팅
- `/ko`, `/en` : 각 언어 Home

### 페이지 경로
- Home: `/ko`, `/en`
- Essays: `/ko/posts?tab=essays`, `/en/posts?tab=essays`
- Papers: `/ko/posts?tab=papers`, `/en/posts?tab=papers`
- Notes: `/ko/posts?tab=notes`, `/en/posts?tab=notes` (`content_type: "notes"`)
- Surveys: `/ko/surveys`, `/en/surveys`
- About: `/ko/about`, `/en/about`
- Mission & Principles: `/ko/about/mission`, `/en/about/mission`

### 상세 포스트 경로
- 모든 포스트 공통: `/ko/posts/[slug]`, `/en/posts/[slug]`
- Surveys 상세: `/ko/surveys/[slug]`, `/en/surveys/[slug]`

## 사이트맵 (계층)
- `/`
  - `/{locale}` (Home)
    - `/{locale}/posts` (전체 목록 — 탭으로 필터)
      - `/{locale}/posts?tab=essays`
      - `/{locale}/posts?tab=papers`
      - `/{locale}/posts?tab=notes`
      - `/{locale}/posts/[slug]`
    - `/{locale}/surveys`
      - `/{locale}/surveys/[slug]`
    - `/{locale}/about`
      - `/{locale}/about/mission`

## 페이지별 IA

### 1) Home
- Hero (이름, 한 줄 소개, 프로필 사진)
- Short Bio (요약 소개)
- Social Links
- Latest Essays
- Recent Papers
- Latest Notes

### 2) Posts (탭 목록 — Essays / Papers / Notes)
- 탭 헤더 (Essays · Papers · Notes)
- 글 카드 리스트 (썸네일, 제목, 요약, 발행일, 태그)
- 기본 정렬: 최신순
- 페이지네이션 또는 Load More (구현 방식은 기술 문서에서 결정)
- Notes 탭은 `content_type: "notes"` 인 포스트를 보여준다 (`site-config.ts` `TAB_CONFIG`). 짧은 메모와 ChatGPT 대화 요약이 함께 들어가며, 후자는 `source: "chatgpt"` 메타 필드로 식별되어 ThreadSourceLine 라벨이 자동 노출된다.

### 2-1) Posts (상세 — 단일 템플릿)
- 제목 / 메타정보 (날짜, 태그)
- 본문(MDX/Markdown 렌더링)
- 언어 전환 링크 (KO/EN 대응 포스트)
- 이전/다음 글 링크 (옵션)
- Papers 한정: 원문(arXiv 등) 출처 배지/링크
- Notes (ChatGPT 요약, `source: "chatgpt"`): ChatGPT source line

### 3) Surveys (목록)
- 페이지 소개 문구
- Survey 카드 리스트
- 기본 정렬: 최신순

### 3-1) Surveys (상세)
- Survey 제목 / 메타
- 외부 책 링크 (terry-surveys 모노레포에서 빌드된 책)
- 언어 전환 링크 (KO/EN)

### 4) About
- 프로필 사진
- 상세 Bio
- About 로컬 내비게이션 (`소개` / `미션과 원칙`)
- Mission & Principles 페이지 CTA
- Contact (이메일/소셜 링크)
- Around the Web (Books, Papers 대표작, Code 등)
- (향후 v2에서) 뉴스레터 구독

### 4-1) Mission & Principles
- About 로컬 내비게이션
- 브랜드 미션 Hero
- Purpose / Vision / Mission 요약
- Frontier-to-Life Loop, 활동 현장, 핵심 가치, Authored Impact와 개인 규율을 담은 영구 본문
- About 복귀 링크

## 공통 IA 규칙
- 모든 페이지에 동일한 상단 내비게이션 유지
- 모든 상세 포스트에 언어 전환 진입점 제공
- 모든 포스트 상세는 `/posts/[slug]` 단일 템플릿을 사용하고, 차이는 출처/source 표시 등 메타 필드 차이로만 둔다.
- Home은 최신 콘텐츠 허브, 전체 탐색은 각 탭에서 수행

## 레거시 호환
- 외부 inbound 링크 호환: `?tab=memos`, `?tab=threads`, `?author=terry|ai` 는 `middleware.ts` 에서 308 → `?tab=notes` 로 자동 리다이렉트 (옛 카테고리 이름이 코드에 남는 유일한 합법적 위치).
- `/projects/*` 는 308 → `/about` 로 리다이렉트 (Projects → About 의 "Code" 큐레이션으로 통합).
