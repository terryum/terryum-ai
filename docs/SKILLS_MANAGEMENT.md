# SKILLS_MANAGEMENT.md

> 목적: Claude Code 스킬(`.claude/skills/`, `~/.claude/skills/`)이 여러 워크스페이스에 분산 존재하면서 **구버전 stale 복제본**이 로드되는 혼동을 방지한다.

## 1. Canonical 위치 = 도메인 소유 워크스페이스

| 도메인 | Canonical 위치 |
|-------|---------------|
| 홈페이지 공유 스킬 (`project`, `share`, `del`, `paper-search`, `defuddle`, `infra-optimize`) | `terryum-ai/.claude/skills/` |
| 직접 초안 발행 (`post`) + Obsidian 운영 (`obsidian-*`, `tagging`, `draft`, `create`, `write` 등) | `terry-obsidian/.claude/skills/` |
| 책·서베이 (`survey`, `cite-post`, `book-*`, `ieee-*` 등) | `terry-surveys/.claude/skills/` |
| 외부 논문·학술지·블로그 요약 (`paper`) + 관련 docs (`POST_LOADING_*`, `PAPERS_SUMMARY_RULES.md`, `POST_GENERATOR_PAPERS.md`) | `terry-papers/.claude/skills/` + `terry-papers/docs/` |
| 크로스 도메인·메타 (`harness`, `image-gen`, `pdf-update`) | `~/.claude/skills/` (전역) |

**원칙**: 한 스킬은 단 하나의 canonical 경로에만 실체(디렉토리)로 존재. 그 외 위치는 모두 심링크.

## 2. 심링크는 절대경로로

- ❌ `ln -s ../../../terry-artlab-homepage/.claude/skills/post post`
- ✅ `ln -s /Users/terrytaewoongum/Codes/personal/terryum-ai/site/.claude/skills/post post`

상대경로는 **워크스페이스 리네임 시 집단 붕괴**한다 (2026-04-21 실제 발생: terry-surveys 심링크 6개가 `terry-artlab-homepage` → `terryum-ai` 리네임으로 일제히 깨짐).

## 3. `~/.claude/skills/`는 심링크 또는 cross-domain 원본만

- 단일 워크스페이스 전용 스킬을 전역에 **실체 디렉토리**로 두지 말 것 → 그 워크스페이스에서 업데이트해도 전역은 stale하게 남음 (2026-04-21 `cite-post` 케이스)
- 전역이 필요한 단일 도메인 스킬은 canonical을 해당 워크스페이스에 두고 전역은 심링크

## 4. 백업은 반드시 스킬 디렉토리 밖

- `.bak`, `.old`, `_backup` 등 이름만 바꿔도 `~/.claude/skills/` 안이면 **SKILL.md가 그대로 로드된다** (실제 발생)
- 반드시 `~/.claude/_backups/` 등 스킬 로더가 스캔하지 않는 경로로 이동

## 5. 리네임 후 깨진 심링크 점검

워크스페이스 폴더명 변경, 스킬 디렉토리 재구성, 대규모 이동 직후 실행:

```bash
find ~/Codes/personal/*/.claude/skills ~/.claude/skills \
  -type l ! -exec test -e {} \; -print
```

출력이 비어있어야 정상. 나오면 해당 심링크를 절대경로로 재연결.

## 6. 중복·stale 감사 체크리스트

분기별 또는 스킬 이름 변경·이동 시:

- [ ] 같은 이름 스킬이 여러 곳에 **실체 디렉토리**로 중복 존재하는가? → canonical 하나만 남기고 나머지는 심링크
- [ ] 전역의 실체 스킬 중, 최근 수정일이 해당 워크스페이스보다 오래된 것은? → 전역이 stale
- [ ] 깨진 심링크는? (위 5번 명령)
- [ ] `~/.claude/skills/` 안에 `.bak`/`.old` 디렉토리는? → 밖으로 이동

## 참고: 2026-04-21 정리 사례

- `cite-post` 전역 stale → terry-surveys 심링크로 전환, 구버전은 `~/.claude/_backups/`
- terry-surveys 심링크 6개(defuddle, paper-search, post, project, share, survey) → 절대경로로 재연결
- `~/.claude/skills/harness/references/book-creation-playbook.md` 내부 artlab/vercel 참조 — 참조 문서라 시급하지 않으나 정리 대상
