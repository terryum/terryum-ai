# 인덱싱 규칙

## 체계
- **공개 포스트** (papers, essays, tech): 양수 ID (#1, #2, #3, ...)
- **비공개 콘텐츠** (memo, draft, qa): 음수 ID (#-1, #-2, #-3, ...)

## global-index.json 스키마
```json
{
  "next_public_id": 26,
  "next_private_id": -1,
  "entries": [
    { "id": 1, "slug": "...", "type": "papers", "visibility": "public", ... },
    { "id": -1, "slug": "...", "type": "memo", "visibility": "private", ... }
  ]
}
```

## 삭제 규칙
- **마지막 번호 삭제**: next_id를 되돌림 (번호 재사용)
  - 예: 공개 #25가 마지막이고 삭제하면 → next_public_id = 25
  - 예: 비공개 #-7이 마지막이고 삭제하면 → next_private_id = -7
- **중간 번호 삭제**: 빈칸으로 남김 (번호 재할당 안 함)

## 자동 인덱싱
- `/post`: 공개 포스트 생성 시 양수 ID 자동 부여
- `/write`: 초안(Draft) 생성 시 음수 ID 자동 부여
- `/memo`: 메모 생성 시 음수 ID 자동 부여
- `sync-obsidian.mjs`: 미등록 Obsidian 파일 스캔 시 음수 ID 자동 부여

## Draft → Post 전환
- `/write`로 Drafts/에 생성: 음수 ID (비공개)
- `/post --from=<draft>`로 발행: 양수 ID 부여 (공개), Drafts/ 파일 삭제, 음수 entry 제거

## Obsidian 표시
- frontmatter: `doc_id: N` 또는 `doc_id: -N`
- 본문 첫 줄: `` `#N` · 제목 `` 또는 `` `#-N` · 제목 ``

## 참조 방법
Claude Code에서 `#5` 또는 `#-3`으로 멘션하면 global-index.json에서 경로를 조회한다.
