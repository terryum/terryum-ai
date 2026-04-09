---
name: del
description: "포스트 삭제 파이프라인. 인덱스, Supabase, 참조, Obsidian, 정적 에셋 등 모든 연관 시스템을 정리하며 포스트를 안전하게 삭제한다."
argument-hint: "<slug 또는 #번호> [--force]"
---

# 포스트 삭제 파이프라인

입력: $ARGUMENTS

## 호출 형식

```
/del <slug 또는 #번호> [--force]
/del 2505-forcevla-force-aware-moe
/del #26
/del #26 --force
```

- `#N` → `posts/global-index.json` entries에서 해당 번호의 slug 조회
- slug 직접 지정 가능
- `--force` 없으면 **반드시 삭제 전 영향 요약 + 사용자 확인** 후 진행

---

## Step D0) 포스트 조회 + 영향 분석

### 0-a) 포스트 찾기

1. `#N` 형식이면 `posts/global-index.json`에서 매칭되는 entry의 slug 추출
2. slug로 포스트 위치 확인:
   - **공개 포스트**: `posts/{papers,memos,essays,notes}/<slug>/` 디렉토리 존재 확인
   - **비공개 포스트**: Supabase `private_content` 테이블에서 slug 조회
3. 찾지 못하면 에러 출력 후 중단

### 0-b) 영향 분석

1. **이 포스트를 참조하는 다른 포스트 목록**:
   - 모든 `meta.json`의 `relations[]`에서 `target === slug` 검색
   - 모든 `{ko,en}.mdx` frontmatter의 `references[].post_slug === slug` 검색
   - 비공개 포스트: Supabase `private_content`의 `content_ko`/`content_en`에서 slug 검색

2. **Supabase 영향**:
   ```sql
   SELECT COUNT(*) FROM graph_edges WHERE source_slug = '<slug>' OR target_slug = '<slug>';
   SELECT COUNT(*) FROM node_layouts WHERE slug = '<slug>';
   SELECT COUNT(*) FROM papers WHERE slug = '<slug>';
   SELECT COUNT(*) FROM private_content WHERE slug = '<slug>';
   ```

3. **영향 요약 출력**:
   ```
   🗑️ 삭제 대상: #26 2610-tactile-stretchable-glove-data-engine
   📦 타입: papers (비공개, group: snu)
   
   📊 영향 분석:
   - 이 포스트를 참조하는 포스트: 2건
     • #27 2611-tactile-play-cross-embodiment (builds_on)
     • #5 2505-dexumi (reference post_slug)
   - Supabase graph_edges: 3건 삭제 예정
   - Supabase node_layouts: 1건 삭제 예정
   - Obsidian 노트: From AI/Papers/2610-tactile-stretchable-glove-data-engine.md
   
   ⚠️ 삭제하시겠습니까? (y/n)
   ```

4. `--force` 없으면 사용자 확인 대기. 거부 시 중단.

---

## Step D1) 다른 포스트의 참조 정리

**가장 중요한 단계** — 삭제 후 다른 포스트에 댕글링 참조가 남지 않도록 한다.

### 1-a) meta.json relations 정리 (공개 포스트)

모든 `posts/{type}/{other_slug}/meta.json` 파일을 스캔:
- `relations[]` 배열에서 `target === <삭제할 slug>` 인 항목 **제거**
- 변경이 있으면 파일 저장

### 1-b) MDX frontmatter references 정리 (공개 포스트)

모든 `posts/{type}/{other_slug}/{ko,en}.mdx` 파일을 스캔:
- frontmatter `references[]` 배열 내 `post_slug: "<삭제할 slug>"` → **해당 `post_slug` 필드만 제거**
- reference 항목 자체는 유지 (외부 논문 정보이므로)
- 본문에 `../삭제할-slug` 상대 링크가 있으면 텍스트로 치환

### 1-c) 비공개 포스트의 참조 정리

Supabase `private_content`의 모든 row에서:
- `content_ko`, `content_en` 내 frontmatter의 `references[].post_slug === slug` → `post_slug` 필드 제거
- `meta_json`의 `relations[]`에서 `target === slug` 항목 제거
- 변경이 있으면 UPDATE

---

## Step D2) Supabase 정리

Supabase MCP의 `execute_sql`로 실행:

```sql
-- 그래프 엣지 삭제
DELETE FROM graph_edges WHERE source_slug = '<slug>' OR target_slug = '<slug>';

-- 노드 레이아웃 삭제
DELETE FROM node_layouts WHERE slug = '<slug>';

-- papers 테이블에서 삭제
DELETE FROM papers WHERE slug = '<slug>';

-- 비공개 포스트인 경우 private_content 삭제
DELETE FROM private_content WHERE slug = '<slug>';
```

비공개 포스트의 경우 Storage 정리:
- `private-covers/{slug}/` 버킷 내 모든 파일 삭제 (cover.webp, cover-thumb.webp, og.png)
- Supabase Storage MCP 또는 `scripts/upload-private-content.mjs` 참조

---

## Step D3) 로컬 파일 삭제 (공개 포스트만)

비공개 포스트는 이 단계를 **건너뛴다** (파일이 Git에 없음).

```bash
# 포스트 소스 삭제
rm -rf posts/{content_type}/<slug>/

# 정적 에셋 삭제
rm -rf public/posts/<slug>/
```

---

## Step D4) 인덱스 재생성

### 4-a) generate-index.mjs 실행
```bash
node scripts/generate-index.mjs
```
- `posts/index.json` 자동 재생성 (삭제된 포스트 제외)
- `posts/index-private.json` 자동 재생성

### 4-b) global-index.json 수동 업데이트
- `posts/global-index.json`의 `entries[]`에서 해당 slug 엔트리 제거
- `next_public_id`, `next_private_id`는 **변경하지 않음** (ID 갭 허용)

---

## Step D5) Obsidian 정리

### 5-a) 노트 파일 삭제

content_type → vault 폴더 매핑:
- `papers` → `From AI/Papers/`
- `notes` → `From AI/Notes/`
- `memos` → `From Terry/Memos/`
- `essays` → `From Terry/Essays/`

```bash
rm -f "$HOME/Documents/Obsidian Vault/{vault_folder}/<slug>.md"
```

### 5-b) 다른 노트의 wikilink 정리

나머지 Obsidian 노트들에서 `[[<slug>]]` wikilink를:
- `<slug> (삭제됨)` 텍스트로 치환 (한국어)
- `<slug> (deleted)` 텍스트로 치환 (영어 노트에서)

`## 관계` 섹션의 `- [[<slug>]]` 라인은 제거.

Grep으로 검색:
```bash
grep -rl "[[<slug>]]" "$HOME/Documents/Obsidian Vault/" 2>/dev/null
```

---

## Step D6) Knowledge Base 업데이트

```bash
# KB 레포가 있으면 업데이트
if [ -d /tmp/terry-research-kb ]; then
  node scripts/export-knowledge.mjs --out=/tmp/terry-research-kb
  cd /tmp/terry-research-kb && git add -A && git commit -m "remove: <slug>" && git push && cd -
fi
```

실패 시 경고만 출력, 계속 진행.

---

## Step D7) Git 커밋 + 푸시 (공개 포스트만)

비공개 포스트는 이 단계를 **건너뛴다**.

```bash
git add posts/ public/posts/
git commit -m "chore: delete post <slug>"
git push
```

변경된 다른 포스트의 meta.json/MDX도 포함하여 커밋.

---

## Step D8) 요약 출력

```
✅ 포스트 삭제 완료: #26 2610-tactile-stretchable-glove-data-engine

정리 항목:
- [x] 포스트 파일 삭제
- [x] 정적 에셋 삭제
- [x] 인덱스 재생성
- [x] Supabase: papers, graph_edges, node_layouts 삭제
- [x] 참조 정리: 2건 (meta.json relations, MDX references)
- [x] Obsidian 노트 삭제 + wikilink 정리
- [x] Git 커밋 + 푸시

영향받은 포스트:
- #27 2611-tactile-play-cross-embodiment: relations에서 builds_on 제거
- #5 2505-dexumi: references에서 post_slug 제거
```

---

## 주의사항

- **ID 재사용 안함**: 삭제된 post_number는 갭으로 남김, 새 포스트에 재사용하지 않음
- **references 항목 자체는 유지**: 외부 논문 정보이므로, `post_slug` 필드만 제거
- **비공개 포스트 주의**: Supabase에만 존재하므로 Git 관련 단계는 건너뜀
- **되돌리기 불가**: `--force` 없이 반드시 확인 후 진행. 삭제 전 영향 요약을 꼼꼼히 확인
- **대량 삭제 금지**: 한 번에 하나의 포스트만 삭제. 여러 포스트 삭제 시 각각 `/del` 실행
