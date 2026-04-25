---
name: del
description: "포스트 삭제 파이프라인. 인덱스, R2, Supabase 그래프, 참조, Obsidian, 정적 에셋 등 모든 연관 시스템을 정리하며 포스트를 안전하게 삭제한다."
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
   - **공개 포스트**: `posts/{papers,memos,essays,notes,threads}/<slug>/` 디렉토리 존재 확인
   - **비공개 포스트 (visibility=private/group)**: `posts/index-private.json` entry 확인 + terry-private repo 의 `posts/<type>/<slug>/` 디렉토리 확인 + R2 `private/posts/<type>/<slug>/` 객체 확인
3. 찾지 못하면 에러 출력 후 중단

### 0-b) 영향 분석

1. **이 포스트를 참조하는 다른 포스트 목록**:
   - 모든 `meta.json`의 `relations[]`에서 `target === slug` 검색
   - 모든 `{ko,en}.mdx` frontmatter의 `references[].post_slug === slug` 검색
   - 비공개 포스트: Supabase `private_content`의 `content_ko`/`content_en`에서 slug 검색

2. **Supabase 영향** (그래프만 — `private_content` / `papers` 테이블은 retired):
   ```sql
   SELECT COUNT(*) FROM graph_edges WHERE source_slug = '<slug>' OR target_slug = '<slug>';
   SELECT COUNT(*) FROM node_layouts WHERE slug = '<slug>';
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

terry-private repo (`~/Codes/personal/terry-private/posts/<type>/<other_slug>/`) 의 모든 비공개 포스트에서:
- `meta.json` `relations[]` 배열에서 `target === <삭제할 slug>` 항목 제거
- `{ko,en}.mdx` frontmatter의 `references[].post_slug === slug` → `post_slug` 필드만 제거
- 변경이 있으면 파일 저장 (terry-private 측 git commit 은 D7 단계에서 처리)

---

## Step D2) Supabase 그래프 + R2 정리

### 2-a) Supabase 그래프 (공개·비공개 모두)

Supabase MCP의 `execute_sql`로 실행:

```sql
-- 그래프 엣지 삭제
DELETE FROM graph_edges WHERE source_slug = '<slug>' OR target_slug = '<slug>';

-- 노드 레이아웃 삭제
DELETE FROM node_layouts WHERE slug = '<slug>';
```

`private_content` / `papers` 테이블은 retired (R2 + index-private.json 으로 대체) — 더 이상 SQL DELETE 불필요.

### 2-b) R2 비공개 본문 삭제 (visibility=private/group 만)

```bash
node scripts/delete-private-mdx.mjs --type=<type> --slug=<slug>
# --dry-run 으로 먼저 어떤 객체가 삭제될지 확인 가능
```

대상 prefix: `private/posts/<type>/<slug>/` — `ko.mdx`, `en.mdx`, `meta.json`, 레거시 `og.png` 등 prefix 아래 모든 객체를 list 후 DeleteObjects 일괄 처리. 0 객체여도 정상 종료.

공개 커버 (`posts/<slug>/cover*.webp`) 는 D3 의 `rm -rf public/posts/<slug>/` 로 로컬에서 정리되며, R2 의 `posts/<slug>/...` 는 별도 정리하지 않는다 (orphan 으로 남음 — 비용 미미, 추후 일괄 GC 검토).

---

## Step D3) 로컬 파일 삭제

### 3-a) 공개 포스트
```bash
# 포스트 소스 삭제
rm -rf posts/{content_type}/<slug>/

# 정적 에셋 삭제
rm -rf public/posts/<slug>/
```

### 3-b) 비공개 포스트 (visibility=private/group)
terryum-ai 측은 메타만 들고 있으므로 위 `posts/{type}/<slug>/` 가 보통 비어있음 — 있으면 동일하게 `rm -rf`. 본문은 terry-private repo 에 있다:

```bash
rm -rf ~/Codes/personal/terry-private/posts/<type>/<slug>/
```

terry-private 의 git commit/push 는 D7 에서 처리.

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

## Step D6) Knowledge Base 업데이트 (terry-papers)

```bash
node scripts/export-knowledge.mjs   # 기본 출력: ~/Codes/personal/terry-papers
cd ~/Codes/personal/terry-papers && git add papers/ knowledge-index.json \
  && git commit -m "kb: remove <slug>" && git push && cd -
```

별도 KB 레포는 없다 — `papers/<slug>.json`과 `knowledge-index.json`은 `terry-papers` 레포에 직접 커밋된다. 실패 시 경고만 출력하고 계속 진행.

---

## Step D7) Git 커밋 + 푸시

### 7-a) terryum-ai (공개·비공개 모두)
```bash
cd ~/Codes/personal/terryum-ai
git add posts/ public/posts/
git commit -m "chore: delete post <slug>"
# push 는 사용자가 직접 (harness 가 main 직접 push 차단)
```

비공개 포스트도 메타 (index.json / index-private.json) 갱신 + 다른 포스트의 relations 정리가 발생하므로 commit 필요. 변경된 다른 포스트의 meta.json/MDX도 포함하여 커밋.

### 7-b) terry-private (비공개 포스트만)
```bash
cd ~/Codes/personal/terry-private
git add posts/
git commit -m "chore: delete post <slug>"
# push 는 사용자가 직접
```

---

## Step D8) 요약 출력

```
✅ 포스트 삭제 완료: #26 2610-tactile-stretchable-glove-data-engine

정리 항목:
- [x] 포스트 파일 삭제 (terryum-ai + terry-private)
- [x] 정적 에셋 삭제
- [x] R2 비공개 본문 삭제 (visibility=private/group)
- [x] 인덱스 재생성
- [x] Supabase 그래프: graph_edges, node_layouts 삭제
- [x] 참조 정리: 2건 (meta.json relations, MDX references)
- [x] Obsidian 노트 삭제 + wikilink 정리
- [x] Git 커밋 (push 는 사용자)

영향받은 포스트:
- #27 2611-tactile-play-cross-embodiment: relations에서 builds_on 제거
- #5 2505-dexumi: references에서 post_slug 제거
```

---

## 주의사항

- **ID 재사용 안함**: 삭제된 post_number는 갭으로 남김, 새 포스트에 재사용하지 않음
- **references 항목 자체는 유지**: 외부 논문 정보이므로, `post_slug` 필드만 제거
- **비공개 포스트**: terryum-ai 메타 + terry-private 본문 + R2 본문 세 곳을 모두 정리. 어느 하나만 빠지면 좀비 데이터 / 댕글링 fetch 발생
- **되돌리기 불가**: `--force` 없이 반드시 확인 후 진행. 삭제 전 영향 요약을 꼼꼼히 확인
- **대량 삭제 금지**: 한 번에 하나의 포스트만 삭제. 여러 포스트 삭제 시 각각 `/del` 실행
