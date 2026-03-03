# 00_READ_FIRST.md

## 목적
- 이 폴더 문서를 **전부 읽지 않고**, 작업에 필요한 문서만 골라 읽기 위한 안내 파일
- 이 파일은 짧게 유지한다 (문서 내용 요약/규칙 재서술 금지)

## 기본 읽기 순서 (항상)
1. `00_READ_FIRST.md`
2. `CURRENT_STATUS.md` (현재 스냅샷)
3. `CLAUDE_BUILD_RULES.md` (절대 규칙)
4. 작업 유형에 맞는 문서만 추가로 읽기

## 문서 중요도
### P0 (항상 우선)
- `CURRENT_STATUS.md`
- `CLAUDE_BUILD_RULES.md`
- `PRD.md`

### P1 (작업별 핵심)
- `SITEMAP_IA.md` (정보구조/경로)
- `PAGE_SPECS.md` (화면 요구사항)
- `I18N_ROUTING.md` (언어 라우팅)
- `CONTENT_MODEL.md` (콘텐츠 구조)
- `POSTING_WORKFLOW.md` (발행 절차)
- `TECH_ARCHITECTURE.md` (배포/인프라)
- `DESIGN_SYSTEM.md` (디자인 톤/규칙)
- `AUTO_GEN_GUIDELINES.md` (자동생성/이미지/커버)
- `DISCOVERABILITY_ANALYTICS.md` (SEO/OG/분석)

### P2 (검증/운영 참고)
- `QA_CHECKLIST.md`

## 작업 유형별 추천 읽기 순서
- UI/페이지 구현: `PRD` → `SITEMAP_IA` → `PAGE_SPECS` → `DESIGN_SYSTEM`
- 다국어 라우팅: `PRD` → `I18N_ROUTING` → `SITEMAP_IA` → `PAGE_SPECS`
- 콘텐츠 파이프라인: `CONTENT_MODEL` → `POSTING_WORKFLOW` → `AUTO_GEN_GUIDELINES` → `QA_CHECKLIST`
- 배포/CI/인프라: `TECH_ARCHITECTURE` → `CLAUDE_BUILD_RULES` → `QA_CHECKLIST`
- SEO/OG/분석: `DISCOVERABILITY_ANALYTICS` → `TECH_ARCHITECTURE` → `QA_CHECKLIST`

## 읽기 효율 팁
- 한 번에 모두 읽지 말고 **P0 + 현재 작업 P1만** 읽기
- 세부 구현 중 막힐 때만 추가 문서 열기
- 설계 원칙/규칙은 해당 문서 원문을 참조하고, 이 파일에 복붙/중복 기록하지 않기

## 세션 시작/종료 최소 루틴
- 시작: `CURRENT_STATUS.md` 최신 여부 확인 후 작업 문서만 선별
- 종료: `CURRENT_STATUS.md`만 짧게 갱신 (길어지면 즉시 축약)

## 메모
- v2 문서(예: 뉴스레터/Substack)는 가능하면 `docs/v2/`로 분리
- 이 파일은 문서가 늘어날 때 **목차/우선순위만** 갱신
