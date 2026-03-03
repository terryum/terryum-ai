# PAGE_SPECS.md

## 목적
- v1 화면 구현용 페이지/컴포넌트 요구사항 정의
- 정책/라우팅/콘텐츠모델 상세는 다른 문서 참조

## 공통 규칙 (모든 페이지)
- 모바일 우선 반응형
- 상단 네비: Home / Ideas / Research / About (PC/모바일 동일)
- 언어 스위처: 원형 버튼 (KO / EN)
- 테마 토글: 원형 버튼 (라이트/다크 전환, localStorage 저장, 시스템 프리퍼런스 fallback)
- 외부 링크 새 탭 열기
- 더미 개발 모드 지원 (더미 카드/더미 상세)

## 핵심 구조 원칙 (중요)
- Ideas와 Research는 **동일한 정보 구조/레이아웃**을 사용한다.
- 목록/상세 화면은 **공용 템플릿**으로 구현하고, 차이는 표시 필드만 분기한다.
- 목적: 유지보수 단순화 + 독자 읽기 경험 일관성 확보

## 1) Home
### 섹션 구성 (위→아래)
1. Hero / Intro (이름, 소개, 프로필 사진, 소셜 아이콘)
2. Latest Ideas (카드 3개 + View all)
3. Latest Research (카드 3개 + View all)
4. Newsletter subscribe block (v1)
5. Footer

## 2) Content Index Template (공용)
> Ideas 목록 / Research 목록 공통

### 공용 레이아웃
- 페이지 제목
- 페이지 소개 문구(1~2줄)
- 카드 리스트(최신순)
- 페이지네이션 또는 Load more (v1 단순 리스트 가능)

### 공용 카드 필드 (기본)
- 썸네일(cover.webp)
- 제목
- 요약
- 발행일
- 태그(최대 3개)
- 카드 전체 클릭 가능

### 탭별 차이 (목록)
- Ideas: 기본 카드 사용
- Research: 기본 카드 + 출처 배지(arXiv 등) + 원문 링크 아이콘(선택)

## 3) Content Detail Template (공용)
> Ideas 상세 / Research 상세 공통

### 공용 레이아웃 (위→아래)
1. 헤더 메타 영역 (제목, 발행일, 태그, 언어 전환 링크)
2. 커버 이미지 (있을 때)
3. 본문(MDX 렌더링)
4. 본문 이미지/캡션
5. 하단 내비게이션 (이전/다음, 선택)
6. 하단 CTA (다른 탭/About 링크)

### 탭별 차이 (상세)
- Ideas: 공용 레이아웃 그대로 사용
- Research: 공용 레이아웃 + 상단 원문 정보 블록 추가
  - arXiv/원문 링크
  - 원문 제목(선택)
  - 저자/출처(선택)

## 4) About
### 섹션 구성
1. Bio (짧은 소개)
2. 상세 Bio / Career Highlights (선택)
3. Contact (이메일/소셜)
4. 프로필 사진
5. 

## 공통 컴포넌트 사양 (v1)
- Header/Nav
- ThemeToggle (다크/라이트 전환 원형 버튼)
- LanguageSwitcher (한/영 전환 원형 버튼)
- ProfileIntroBlock
- ContentIndexPage (공용 템플릿)
- ContentDetailPage (공용 템플릿)
- ContentCard (공용 카드 + source badge 옵션)
- SourceBadge / ExternalSourceLink (read 옵션)
- TagChip
- Footer

## 더미 콘텐츠 개발 규칙 (초기 개발용)
- write/read 각각 목록 더미 카드 최소 4개
- write/read 상세 더미 포스트 각각 1개
- 두 탭 모두 동일 템플릿에 더미 데이터만 연결해 UI 검증

## 비범위 (v1 제외)
- 사이트 내 검색
- 댓글 시스템
- Substack 직접 연동 UI
- 고급 태그/카테고리 페이지
- 유료 구독/멤버십
- Newsletter 구독 블록 
