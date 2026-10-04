#!/usr/bin/env bash
# sync-skills.sh — homepage의 콘텐츠 스킬을 terry-obsidian에 심링크로 동기화
# 새 스킬이 추가되면 자동으로 심링크 생성, 삭제된 스킬은 깨진 심링크 제거

HP_SKILLS="/Users/terrytaewoongum/Codes/personal/terryum-ai/site/.claude/skills"
OB_SKILLS="/Users/terrytaewoongum/Codes/personal/knowledge/terry-obsidian/.claude/skills"

# Obsidian 자체 관리 스킬 (심링크 대상 아님)
OBSIDIAN_OWN="write draft memo tagging obsidian-cli obsidian-markdown obsidian-orchestrator paper-search"

[ -d "$OB_SKILLS" ] || exit 0

changed=0

# 1) homepage 스킬 중 Obsidian 자체 스킬이 아닌 것 → 심링크 생성
for skill_dir in "$HP_SKILLS"/*/; do
  skill=$(basename "$skill_dir")
  # Obsidian 자체 스킬이면 스킵
  echo "$OBSIDIAN_OWN" | grep -qw "$skill" && continue
  # 이미 존재하면 스킵
  [ -e "$OB_SKILLS/$skill" ] && continue
  # 심링크 생성
  ln -s "$skill_dir" "$OB_SKILLS/$skill"
  echo "symlinked: $skill"
  changed=1
done

# 2) terry-obsidian의 깨진 심링크 제거
for link in "$OB_SKILLS"/*; do
  [ -L "$link" ] && [ ! -e "$link" ] && {
    echo "removed broken: $(basename "$link")"
    rm "$link"
    changed=1
  }
done

[ $changed -eq 0 ] || echo "skill sync complete"
