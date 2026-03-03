# AUTO_GEN_GUIDELINES.md
## 목적
- 콘텐츠 퍼블리시 시 Claude Code가 수행하는 **자동 생성/정규화 작업 기준**을 정의한다.
- 범위: `cover.webp`, 이미지 파일명 정규화, frontmatter 보완, `meta.json`(optional), 요약/태그 생성.
- 원칙: **반복 가능 / 예측 가능 / 원문 보존 / 안전한 변경 / 검증 후 푸시**.

## 입력물 기준 (작성자 → Claude Code)
- 기본 입력: `posts/<slug>/ko.mdx` + 첨부 이미지들
- 선택 입력: `en.mdx`(이미 수동 작성한 경우), 추가 메모(제목/태그 힌트)
- 작성자가 파일명 규칙을 지키지 않아도 됨 (퍼블리시 시 자동 정규화 수행)

## 자동 생성/정규화 작업 순서 (권장)
1. 입력 구조 검사 (필수 파일/이미지 존재 여부)
2. 슬러그 확인/생성 (필요 시)
3. 이미지 파일명 정규화(리네임) + 본문 경로 치환
4. `cover.webp` 생성 (없거나 재생성 요청 시)
5. `en.mdx` 생성/갱신 (한글 원문 기준 번역)
6. frontmatter 생성/보완 (`ko.mdx`, `en.mdx`)
7. `meta.json` 생성/갱신 (optional, v1 선택)
8. 검증(링크/이미지/필수 메타/빌드)
9. Git commit/push

## 이미지/자산 파일 규칙
### 목표 파일명 규칙
- 소문자 영문/숫자/하이픈만 사용: `a-z`, `0-9`, `-`
- 공백/한글/특수문자 제거 또는 치환
- 권장 형식:
  - `cover.webp`
  - `fig-01-<keyword>.png`
  - `fig-02-<keyword>.jpg`

### 자동 정규화 규칙 (중요)
- 작성자가 규칙에 맞지 않는 파일명을 넣어도 퍼블리시 시 자동 리네임한다.
- 리네임 후 **본문 내 이미지 경로를 모두 새 파일명으로 치환**한다.
- 동일 이름 충돌 시 순번을 추가한다 (`fig-02`, `fig-03` ...)
- 리네임 결과는 commit 전에 검증한다(깨진 링크 금지).

## 커버 이미지(`cover.webp`) 자동 생성 규칙
- 입력: 글 제목/요약/태그 + 본문 이미지(있으면 참고)
- 톤: `DESIGN_SYSTEM.md` 준수 (흰/연회색 바탕 + 진회색 타이포 + Teal 포인트 최소)
- 과한 3D/네온/복잡한 배경 금지
- 출력: `cover.webp` (포스트 폴더 내 저장)
- 이미 `cover.webp`가 있고 재생성 지시가 없으면 기본적으로 유지

## 본문(frontmatter) 자동 생성/보완 규칙
### v1 필수 (권장) 필드
- `post_id` (ko/en 공통 ID)
- `locale` (`ko` | `en`)
- `title`
- `summary`
- `published_at`
- `updated_at`
- `tags`
- `cover_image` (`./cover.webp`)
- `status` (`draft` | `published`)

### 생성 원칙
- `ko.mdx`가 기준(source of truth)
- `en.mdx`는 `ko.mdx` 기준 번역/동기화
- `published_at`은 최초 퍼블리시 시 고정, 수정 시 `updated_at`만 변경
- `tags`는 허용 목록 중심으로 3~7개 생성 (과다 생성 금지)

## `meta.json` 규칙 (optional, v1 선택)
- v1에서는 필수가 아님 (frontmatter만으로 운영 가능)
- 사용 시 목적: 파이프라인/운영 메타 저장 (렌더링용 주 데이터 아님)
- 예시 필드:
  - `post_id`
  - `source_locale`
  - `translation_status`
  - `cover_generated_at`
  - `asset_renamed` (true/false)
  - `pipeline_processed_at`

## 텍스트 자동 생성 규칙 (요약/태그/번역)
- 요약:
  - ko/en 각각 1~3문장, 과장/클릭베이트 금지
- 태그:
  - 허용 태그 체계 우선 사용, 의미 중복 태그 금지
- 번역:
  - 의미 보존 우선, 한국어 고유명사/제품명/인명 표기 일관성 유지
  - 코드/링크/인용/수식/파일경로는 임의 변형 금지

## 개발 초기 더미 콘텐츠 규칙
- 실제 콘텐츠가 부족한 초기 개발 단계에서는 더미 포스트/이미지/커버를 자동 생성 가능
- 더미 데이터는 `DUMMY` 표시 또는 명확한 제목 접두어를 사용
- 실서비스 전 더미 콘텐츠 삭제/비노출 여부를 체크리스트로 확인

## 검증 규칙 (푸시 전 필수)
- 모든 이미지 경로 유효성 확인 (`ko.mdx`, `en.mdx`)
- `cover.webp` 존재 확인 (정책상 필수인 경우)
- frontmatter 필수 필드 존재 확인
- `ko`/`en` `post_id` 일치 확인
- 빌드/정적 생성 오류 없음 확인
- 대량 리네임/삭제 발생 시 중단 후 확인 (콘텐츠 안전)

## 금지사항
- 원문(`ko.mdx`) 의미를 바꾸는 자동 요약/번역 보정
- 이미지 리네임 후 본문 경로 미치환 상태로 푸시
- `published_at` 임의 재설정
- `meta.json`만 업데이트하고 frontmatter 동기화 누락
