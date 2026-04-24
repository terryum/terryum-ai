---
doc_id: -6
type: "draft"
visibility: "private"
content_type: "threads"
slug: "260424-claude-to-codex"
created_at: "2026-04-24"
source: "chatgpt"
source_url: "https://chatgpt.com/share/69eb557d-cbe8-83a3-b69e-d06b8495d550"
source_captured_at: "2026-04-24T11:35:25.827Z"
domain: ""
key_concepts: []
tags: []
taxonomy_primary: ""
taxonomy_secondary: []
relations: []
---

`#-6` · Claude → Codex

## 탐색 주제

- Claude Code와 Codex의 차이는 무엇인가 : 최근 2개월의 커뮤니티 반응
- GPT-5.5 발표 이후 두 도구의 위치는 어떻게 바뀌었는가
- 같은 repo를 Claude와 Codex가 번갈아 편집해도 안전한가
- 기존 Claude Code 프로젝트를 Codex로 옮기는 가장 빠른 길은 무엇인가
- 코드 양에 따라 어떤 전략(자동 마이그레이션 vs 재구현)을 골라야 하는가

## 레슨 요약

- Claude Code는 빠르고 대화형이며 `CLAUDE.md` + subagents + hooks + skills 같은 풍부한 하네스가 강점. Codex는 더 느리지만 규칙 준수가 강하고 `AGENTS.md` + `~/.codex/config.toml` + skills 중심의 단순·휴대성 있는 구조.
- GPT-5.5 발표 이후 Codex가 reasoning/long-task autonomy에서 한 단계 점프. Claude는 "AI를 어떻게 운영할 것인가(외부 하네스)", Codex+GPT-5.5는 "AI가 스스로 어떻게 일할 것인가(모델 내부화)"로 전략이 갈린다.
- 같은 파일시스템·git repo를 보는 한 Claude↔Codex 전환은 가능하다. 전제는 지식이 `CLAUDE.md` 내부나 subagent 메모리가 아니라 `AGENTS.md`·`HANDOFF.md`·`TASKS.md` 같은 평문으로 외부화되어 있을 것.
- 코드가 적당히 있는 기존 repo는 자동 변환 도구를 쓰기보다 Codex에게 기존 repo를 참고자료로 두고 새 브랜치에서 재구현/리팩터링시키는 편이 깔끔하다. 최소 `AGENTS.md` + `REFACTOR_PRD.md` + `HANDOFF.md` 세 파일과 단계적 프롬프트로 진행.
- 코드가 거의 없거나 `~/.claude` 환경 자체를 옮기는 경우엔 `claude2codex`(자동 CLI), `cc2codex`(Codex plugin 기반 safe preview)가 존재. 하지만 둘 모두 검증이 충분치 않은 초기 툴들이다.

## FAQ

### Q. 굳이 Codex를 선택하게 된 이유는?

- GPT-5.5 발표로 reasoning + 장기 작업 일관성에서 Claude를 일부 영역에서 추월
- 같은 시기 Opus 4.7 + Claude Code는 토큰 사용량 증가와 regression 보고로 backlash가 동시에 발생
- 운영 규약이 도구-중립적인 `AGENTS.md` + `config.toml`로 단순해서 멀티 에이전트 호환성이 좋다
- 단 "갈아탄다"보다는 Claude(설계·하네스)와 Codex(구현·리팩터링·검증)를 역할 분담하는 패턴이 커뮤니티에서 가장 자주 보인다

### Q. Claude로 만들던 프로젝트를 Codex로 갑자기 이어 편집해도 되나?

- 기술적으로는 가능. 두 도구 모두 결국 같은 파일시스템과 git을 본다
- 안전한 조건: 프로젝트 규칙이 평문에 있고, build/test/lint 명령이 문서화되어 있고, 현재 상태가 `HANDOFF.md`에 있고, 도구별 메모리에 의존하지 않을 것
- 위험한 조건: Claude 전용 규칙이 `CLAUDE.md`/subagent 내부에만, hook/plugin 의존, 대화 중간 맥락이 문서로 안 남음
- 결론: 전환 자체보다 "지식의 외부화"가 진짜 비용

### Q. 코드가 적당히 있는 repo는 어떻게 옮기나 (재구현 추천 시나리오)?

- 새 브랜치 또는 새 repo에서 시작. 기존 repo는 "참고 자료"로만 둔다
- 최소 3개 파일만 먼저 만든다: `AGENTS.md`(Codex가 따라야 할 작업 규칙), `REFACTOR_PRD.md`(무엇을 왜 다시 만들지·보존할 것/버릴 것), `HANDOFF.md`(현재 상태와 다음 작업)
- 첫 프롬프트는 수정 금지로: "기존 repo를 분석해서 `OLD_REPO_ANALYSIS.md`, `REFACTOR_PLAN.md`, `TASKS.md`만 만들어라"
- 두 번째 프롬프트로 skeleton만, 세 번째로 가장 작은 기능 1개만 구현. 단계적으로 끊어 진행

### Q. 멀티에이전트 하네스는 자동으로 옮겨지는가?

- 거의 모든 자동 변환 도구가 subagents·hooks를 lossy로 옮긴다고 명시
- `claude2codex`는 subagents를 `multi_agent=true` skill로 변환 — tool 권한과 세부 동작은 보존되지 않음. hooks는 대부분 dropped
- `cc2codex`도 team-style Claude agent workflow는 redesign 필요라고 명시
- 결국 하네스 부분은 `.codex/agents/*.toml`(TOML 정의), `.codex/skills/*/SKILL.md`(`name`/`description` 메타데이터), `AGENTS.md`(공용 규칙)로 수동 재설계가 정답

<!-- draft-only -->
## To-Do

- Codex CLI 설치 및 `~/.codex/config.toml`에 기본 모델 지정
- terry-papers 또는 terry-surveys 같은 멀티에이전트 하네스 1개를 골라 재구현 실험
- `AGENTS.md` / `REFACTOR_PRD.md` / `HANDOFF.md` 3종 템플릿을 ~/Codes/personal/templates/ 에 만들어두기
- 자주 쓰는 `/post`, `/paper`, `/write`를 `bin/` wrapper로 복원할지 결정

원문: [ChatGPT 대화](https://chatgpt.com/share/69eb557d-cbe8-83a3-b69e-d06b8495d550)
<!-- /draft-only -->
