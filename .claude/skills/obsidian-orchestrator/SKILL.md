---
name: obsidian-orchestrator
description: "Obsidian 지식베이스 통합 빌드 오케스트레이터. 4개 에이전트 팀(data-architect, vault-engineer, homepage-ops, integration-qa)을 조율하여 Obsidian 연동을 구현한다. 이 스킬은 내부 빌드용이며 사용자가 직접 호출하지 않는다."
---

# Obsidian Integration Orchestrator

## 개요
Obsidian 지식베이스 통합을 위한 에이전트 팀 빌드 오케스트레이터.
상세 계획: `.claude/plans/foamy-beaming-wave.md`

## 에이전트 팀 구성

| 에이전트 | 정의 파일 | 타입 | 역할 |
|---|---|---|---|
| data-architect | `.claude/agents/data-architect.md` | general-purpose | sync-obsidian.mjs, global-index.json |
| vault-engineer | `.claude/agents/vault-engineer.md` | general-purpose | vault 구조, /write 스킬, Dashboard |
| homepage-ops | `.claude/agents/homepage-ops.md` | general-purpose | /post 수정, README, 보안 |
| integration-qa | `.claude/agents/integration-qa.md` | general-purpose | 교차 검증, 빌드, 보안 |

## 실행 파이프라인

### Phase A: 데이터 레이어 (data-architect)
1. 기존 `export-knowledge.mjs`, `generate-index.mjs` 분석
2. `scripts/sync-obsidian.mjs` 구현
   - CLI 인터페이스 (--init, --slug, --dry-run, --vault)
   - meta.json + ko.mdx → Obsidian 마크다운 변환
   - sync_hash 기반 변경 감지
   - 사용자 wikilink 보존 로직
   - Meta/ 자동 생성 (Taxonomy.md, Concept Index.md)
3. `posts/global-index.json` 스키마 설계 + 초기 생성
4. `_workspace/note-format-spec.md` 작성 (vault-engineer 참조용)
5. → **integration-qa에게 Phase A 검증 요청**

### Phase B: Vault + Skills (vault-engineer, homepage-ops 병렬)

**vault-engineer:**
1. vault 폴더 구조 생성
2. `AGENTS.md` 작성 (vault 스키마 규칙)
3. `Meta/Dashboard.md` Dataview 쿼리 작성
4. `Templates/Memo Template.md` 작성
5. `.claude/skills/write/SKILL.md` 최종 검토/보강

**homepage-ops (동시 진행):**
1. `.claude/skills/post/SKILL.md` 수정
   - `--from=<path>` 옵션 추가
   - Obsidian sync 스텝 (R12.6 / B10.6) 추가
   - content_type 결정 로직 업데이트
2. `package.json` 수정 (sync-obsidian 스크립트)
3. `.gitignore` 업데이트
4. `README.md` 작성

5. → **integration-qa에게 Phase B 검증 요청**

### Phase C: 초기 동기화 실행
1. `node scripts/sync-obsidian.mjs --init` 실행
2. Obsidian vault에 22개 papers + essays + tech 노트 생성 확인
3. global-index.json에 전체 포스트 등록 확인
4. → **integration-qa에게 최종 E2E 검증 요청**

### Phase D: 최종 QA (integration-qa)
1. 데이터 정합성 교차 비교
2. 보안 리뷰 (gitignore, README, 경로 누출)
3. `npm run build` 빌드 확인
4. 사용자 wikilink 보존 테스트
5. QA 리포트 작성 → `_workspace/qa-report.md`

## 데이터 전달

| From | To | 매체 | 내용 |
|---|---|---|---|
| data-architect | vault-engineer | 파일 | `_workspace/note-format-spec.md` |
| data-architect | homepage-ops | 파일 | global-index.json 스키마 |
| data-architect | integration-qa | 메시지 | Phase A 완료 알림 |
| vault-engineer | integration-qa | 메시지 | Phase B vault 완료 알림 |
| homepage-ops | integration-qa | 메시지 | Phase B homepage 완료 알림 |
| integration-qa | 각 에이전트 | 메시지 | 버그 리포트 |
| integration-qa | 오케스트레이터 | 파일 | `_workspace/qa-report.md` |

## 에러 핸들링
- Phase A 실패 → Phase B 진행 불가 (의존성)
- Phase B 개별 에이전트 실패 → 해당 에이전트만 재실행
- Phase C sync 실패 → data-architect에게 수정 요청
- Phase D QA 실패 → 해당 에이전트에게 수정 요청 후 재검증

## 테스트 시나리오

### 정상 흐름
1. data-architect가 sync-obsidian.mjs 완성
2. vault-engineer + homepage-ops가 병렬로 vault/homepage 작업
3. --init 실행으로 전체 동기화
4. QA 통과 → 완료

### 에러 흐름
1. sync-obsidian.mjs에서 특정 meta.json 파싱 실패
2. QA가 해당 포스트 누락 감지
3. data-architect에게 수정 요청
4. 수정 후 재sync → QA 재검증 → 통과
