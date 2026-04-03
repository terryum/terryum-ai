---
name: memo
description: "Obsidian 비공개 메모 생성. /memo <제목> 으로 실행하면 Memos/ 폴더에 메타데이터가 채워진 메모 파일을 생성한다. '메모 생성', '잡생각 하나 쓰게', '메모 만들어줘' 등 요청 시 트리거."
argument-hint: "<제목>"
---

# /memo — Obsidian 비공개 메모 생성

## 용도
사용자가 Obsidian에서 편집할 비공개 메모를 생성한다. 메타데이터(doc_id, type, created_at 등)를 자동으로 채운다.

## 입력
```
/memo <제목>
```
예: `/memo 잡생각 하나 쓰게`, `/memo AI와 로보틱스의 접점`

## 실행 순서

### Step 1) 인덱싱 규칙 확인
- `docs/INDEXING.md` 읽기 — 비공개는 음수 ID

### Step 2) global-index.json에서 ID 할당
- `posts/global-index.json` 읽기
- `next_private_id` 값을 이 메모의 doc_id로 사용 (예: -1)
- `next_private_id`를 1 감소 (예: -1 → -2)

### Step 3) 파일명 결정
- `YYMMDD-<slugified-title>.md` (날짜 + 제목 slug)
- 예: `260403-ai-robotics-intersection.md`

### Step 4) 메모 파일 생성
경로: `~/Documents/Obsidian Vault/From Terry/Memos/<filename>.md`

```markdown
---
doc_id: -1
type: memo
visibility: private
created_at: 2026-04-03
tags: []
---

`#-1` · <제목>

## 생각



## 관련
- 

#memo
```

### Step 5) global-index.json 업데이트
```json
{
  "id": -1,
  "slug": "260403-ai-robotics-intersection",
  "type": "memo",
  "visibility": "private",
  "title": "AI와 로보틱스의 접점",
  "path": "~/Documents/Obsidian Vault/From Terry/Memos/260403-ai-robotics-intersection.md"
}
```

### Step 6) 결과 출력
- "Obsidian에서 Memos/<filename>.md를 열어 작성하세요"
- 인덱스 번호 안내: `#-1`

## 주의
- 메모 내용은 작성하지 않는다 — 빈 템플릿만 생성
- 사용자가 Obsidian에서 직접 편집
- Memos/ 폴더의 기존 파일은 절대 수정하지 않는다
