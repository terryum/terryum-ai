# DESIGN_SYSTEM.md

## 목적
- v1 개인 홈페이지의 시각 언어 정의 (Tom Tunguz 스타일의 단정한 에디토리얼 UI + 절제된 Teal 포인트)
- 원칙: 가독성 우선 / 여백 중심 / 무채색 기반 / 포인트 컬러 최소 사용 / 빠른 로딩

## 핵심 원칙
1. 배경은 순백색(`#FFFFFF`) 유지
2. 텍스트/라인은 검정 대신 짙은 회색 사용
3. 카드/그림자 최소화, 여백과 타이포 대비로 위계 구성
4. 포인트 컬러 `#0D9488`은 링크·활성 상태·강조선 중심으로만 사용
5. 단일 컬럼 중심(읽기 폭 제한), 한/영 혼용 가독성 최적화

## 색상 토큰
- `bg.base #FFFFFF`
- `text.primary #111827` / `text.secondary #374151` / `text.muted #6B7280`
- `line.default #E5E7EB` / `line.strong #D1D5DB` / `line.dark #9CA3AF`
- `accent.primary #0D9488` / `accent.hover #0F766E` / `accent.soft`(필요 시만)
- Teal 사용 범위: 링크, 현재 메뉴/탭, focus ring, blockquote 좌측선, 소수 CTA
- Teal 금지 범위: 큰 배경면, 카드 배경, 본문 기본 텍스트
- 화면 전체 Teal 면적 비중 5% 이하 목표

## 타이포그래피
### 폰트 전략 (빠른 로딩 우선)
- 웹폰트 기본 미사용, OS 내장/로컬 설치 폰트 우선
- 영문 스택: `"Helvetica Neue", "Inter", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`
- 한글 스택: `"NanumSquare Neo", "Pretendard Variable", "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif`
- 페이지 기본 `font-sans`: 한글 스택 우선 + 영문 스택 결합
- v2에서 Inter/Pretendard self-host는 성능 측정 후 검토

### 크기/행간/자간
- 본문 16~17px, 모바일 15~16px, `leading-relaxed`(약 1.7)
- 영문 제목 `tracking-tight`, 한글 제목 `tracking-normal`
- 영문 문단 자간 `0 ~ -0.01em`, 한글 문단 자간 `0 ~ 0.01em` 권장
- 문단 간격은 넉넉하게 유지 (여백이 위계 역할)

## 레이아웃/네비게이션
- 홈/목록 `max-w-3xl`, 상세 본문 `max-w-2xl ~ max-w-3xl`
- 단일 컬럼 중심, 패딩: 모바일 `px-4`, 태블릿 `px-6`, 데스크톱 `px-8`
- 섹션 간격: 기본 24px, 주요 섹션 40~56px
- 데스크톱 메뉴: `Home / What I write / What I read / About`
- 모바일 라벨: `What I write → Ideas`, `What I read → Research`
- 활성 메뉴: Teal 텍스트 + 얇은 밑줄(또는 상단선) 중 하나만 사용
- 소셜 아이콘은 헤더/About 상단 배치, 컬러 과장 금지

## 공통 템플릿 규칙 (중요)
- `What I write` / `What I read`는 동일한 목록/상세 템플릿 사용
- 차이는 메타 표시 필드만 허용 (`What I read`에만 원문 링크/arXiv 출처 배지)
- 본문 타이포/목차/이미지/구분선 스타일은 공통 유지

## 컴포넌트 스타일
### 링크
- 기본: 진한 회색 + underline(연회색 선)
- hover/focus: Teal + Teal underline
- 본문 링크는 underline 유지 (색만으로 구분 금지)

### 리스트 카드 (Write/Read 공용)
- 배경 흰색, 그림자 없음, `border-b` 구분선만 사용
- 구성: 제목 → 요약 → 메타(날짜/태그/읽는 시간/출처)
- 썸네일은 옵션, 없어도 레이아웃 유지

### 본문 상세
- 제목 아래 메타는 1~2줄로 간결하게
- `blockquote`: 좌측 3px Teal 라인, 배경 없음/아주 옅은 회색
- `hr`: 회색 1px 라인
- 코드블록: 연회색 배경 + 진회색 테두리, 그림자 없음

### 버튼/폼
- 기본은 텍스트형/아웃라인 우선
- Primary CTA만 Teal 사용 (한 화면 1~2개)
- 입력폼 테두리 회색, focus ring만 Teal

## 한/영 혼용 레이아웃 규칙
- 긴 영문 단어/URL 줄바꿈 허용 (`overflow-wrap:anywhere`)
- 한글 문단은 좌측 정렬 유지 (양쪽정렬 금지)
- 숫자/단위/영문 약어 혼용 시 자간 압축 금지
- 언어 전환 버튼 위치는 페이지 유형별로 고정해 일관성 유지

## 썸네일/커버 이미지 톤
- 깨끗하고 정보 중심, 과한 3D/네온/복잡한 배경 금지
- 흰색/연회색 바탕 + 짙은 회색 타이포 + Teal 포인트 소량
- 얇은 회색 라인 허용, 그림자 최소화/제거
- 텍스트 포함 시 짧은 제목/키워드 중심, 장식 폰트 금지
- 비율 권장: 썸네일 `16:9`, OG/커버 `1200x630`

## 접근성/구현 메모 (Claude Code용)
- 본문 대비 WCAG AA 이상, 키보드 포커스 명확, 색상만으로 상태 구분 금지
- `tailwind.config`에 색상/폰트 토큰 등록, `@layer base`에 `body/prose/link/blockquote/hr` 기본 스타일 지정
- Write/Read는 공용 템플릿 컴포넌트 + 필드 props 분기
- 기본 정책: `No heavy shadows / No colorful cards / No dense grids`
