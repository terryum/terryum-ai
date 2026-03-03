# CONTENT_MODEL.md

## 목적
- v1 사이트의 콘텐츠 저장 구조와 자동 생성 규칙을 정의한다.
- 라우팅/페이지 UI/운영 절차는 다른 문서에서 정의한다.

## 범위
- `posts/<slug>/` 폴더 구조
- `ko.mdx` / `en.mdx` 본문 규칙
- `cover.webp` 자동 생성 규칙
- `meta.json` 선택 규칙(v1 optional)
- 이미지/자산 파일명 정규화 규칙
- 초기 개발용 더미 콘텐츠 규칙

## 루트 구조 (v1)
- 사이트 루트에 `posts/` 폴더를 둔다.
- 포스트 1개당 `posts/<slug>/` 폴더 1개를 사용한다.
- `<slug>`는 영문 소문자/숫자/하이픈만 허용한다.

예시:
- `posts/robot-force-sensing-foundations/`
- `posts/vla-for-manufacturing-notes/`

## 포스트 폴더 표준 구조
- `posts/<slug>/`
  - `ko.mdx` (한국어 원문, 작성 기준)
  - `en.mdx` (영문 번역본, Claude Code 자동 생성/수정)
  - `cover.webp` (대표 썸네일, Claude Code 자동 생성)
  - `meta.json` (선택, v1 optional / 자동 생성)
  - `fig-*.png|jpg|jpeg|webp` (본문 이미지)
  - `assets/` (선택: PDF/원본자료 등 추가 자산)

## 본문 파일 규칙 (`ko.mdx`, `en.mdx`)
- 한/영 본문은 항상 같은 포스트 폴더에 둔다.
- 원문 작성 기준은 `ko.mdx`이다.
- `en.mdx`는 퍼블리시 시점에 Claude Code가 번역/보정하여 생성한다.
- 본문 내 이미지 경로는 포스트 폴더 기준 상대경로를 사용한다.
  - 예: `./fig-01-force-layout.png`
- 한/영 본문은 동일 이미지 파일을 공통 사용한다.

## MDX frontmatter 규칙 (기본 메타 저장소)
- v1의 기본 메타 소스는 `ko.mdx` / `en.mdx` frontmatter이다.
- 최소 권장 필드:
  - `id` (언어 공통 포스트 ID)
  - `slug` (폴더명과 동일)
  - `locale` (`ko` / `en`)
  - `title`, `summary`
  - `published_at`, `updated_at`
  - `tags` (문자열 배열)
  - `kind` (`write` | `read`)
  - `source_url` (없으면 null)
  - `cover_image` (`./cover.webp`)

## `meta.json` 규칙 (v1 optional)
- `meta.json`은 v1에서 **선택사항**이다. (필수 아님)
- 없으면 사이트/빌드/퍼블리시는 MDX frontmatter를 기준으로 동작해야 한다.
- 있으면 Claude Code가 자동 생성/업데이트하며, 공통 메타/파이프라인 상태 저장에 사용한다.
- v2 이상에서 자동화(커버 재생성, 번역 상태, Substack 이관 상태)가 늘어나면 활용을 확대한다.

## `cover.webp` 규칙 (자동 생성)
- `cover.webp`는 퍼블리시 시점에 Claude Code가 자동 생성한다.
- 생성 입력은 제목/요약/태그/본문 이미지(있으면)/`kind`를 활용한다.
- 파일명은 항상 `cover.webp`로 고정한다.
- 이미 존재하면 기본 정책은 덮어쓰기 금지(명시 요청 시 재생성).

## 이미지/자산 파일 규칙
- 권장 파일명 규칙: 영문 소문자 + 숫자 + 하이픈 + 확장자
  - 예: `fig-01-force-layout.png`, `chart-02-results.webp`
- 공백/한글/특수문자 파일명은 권장하지 않는다.
- 동일 포스트의 이미지/자산은 해당 포스트 폴더 내부에만 둔다.
- 본문 미사용 파일은 퍼블리시 전 제거를 원칙으로 한다.

## 이미지 파일명 자동 정규화 (퍼블리시 시 필수 처리)
- 사용자가 규칙에 맞지 않는 파일명을 첨부해도 퍼블리시는 실패시키지 않는다.
- Claude Code는 퍼블리시 단계에서 이미지/자산 파일명을 규칙에 맞게 자동 변경(리네임)한다.
- 리네임 시 해야 할 일:
  - 파일명 slugify (소문자/하이픈)
  - 순번 부여 (`fig-01`, `fig-02` 등) 필요 시 적용
  - 중복 파일명 충돌 방지
  - `ko.mdx`와 `en.mdx` 본문 내 경로를 함께 치환
  - 최종 파일 목록 기준으로 GitHub에 푸시
- 리네임 결과는 로그(커밋 메시지 또는 작업 출력)로 보여준다.

## 콘텐츠 타입 분류 (v1)
- `kind: write` = 직접 작성 글 (What I write)
- `kind: read` = 논문/리포트 요약 (What I read)

## 초기 개발용 더미 콘텐츠 규칙 (개발 단계 전용)
- 사이트 초기 개발 시 각 탭/리스트/상세 페이지 구현을 위해 더미 콘텐츠를 자동 생성한다.
- 더미 콘텐츠는 `posts/` 구조를 그대로 따르며 `kind: write/read`를 섞어 만든다.
- 더미 포스트에는 한국어/영어 본문, 썸네일(`cover.webp` 대체 이미지), 요약, 태그를 포함한다.
- 더미 콘텐츠는 실제 콘텐츠와 구분 가능하도록 제목/ID에 `sample` 또는 `demo` 표기를 포함한다.
- 실제 운영 시작 전 더미 콘텐츠는 일괄 삭제 또는 `draft` 처리 가능해야 한다.
