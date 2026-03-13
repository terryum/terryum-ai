# Research Post 생성 파이프라인

입력: $ARGUMENTS (예: `https://arxiv.org/abs/2505.22159 [--tags=VLA,robotics] [--memo=메모] [--featured]`)

## 실행 순서 (모든 단계를 권한 요청 없이 완료할 것)

1. `docs/RESEARCH_SUMMARY_RULES.md` 읽기 (요약 규칙)
2. URL 파싱 → arXiv ID 추출, 슬러그 결정 (`YYMM-<short-name>`)
3. `https://export.arxiv.org/abs/<id>` API로 메타데이터 수집 (제목, 저자, 초록, v1 제출일)
4. PDF 다운로드 → `posts/research/<slug>/paper/<slug>.pdf`
   - URL: `https://arxiv.org/pdf/<id>`
5. arXiv HTML에서 Figure 추출 시도:
   - `GET https://arxiv.org/html/<id>v1/` → 200이면 img src 전수 추출 + 다운로드
   - **404이면 즉시 PDF fallback** (Semantic Scholar 등 외부 사이트 탐색 금지):
     a. `python scripts/extract-paper-pdf.py posts/research/<slug>/paper/<slug>.pdf posts/research/<slug>/`
     b. `extraction_report.json` 읽기 → figures/captions 자동 적용
     c. `suggested_cover`를 `cover.webp`로 PIL 변환
6. `docs/RESEARCH_SUMMARY_RULES.md` 기준으로 `ko.mdx` + `en.mdx` 생성
   - frontmatter: title, summary, card_summary, cover_caption, published_at (현재 ISO), source_type, source_url, source_date, display_tags, figures, tables, references
7. `meta.json` 생성 — **status 항상 `"published"`** (draft 옵션 없음), `--featured` 시 `featured: true`
   - `display_tags`: `--tags=` 값, `terrys_memo`: `--memo=` 값
8. `node scripts/generate-index.mjs` 실행
9. `npm run build` 검증 (실패 시 에러 수정 후 재실행)
10. `git add posts/ public/posts/ && git commit -m "feat(post): add <slug> (ko/en)" && git push`

## 플래그 파싱 규칙

- `--tags=VLA,robotics`: display_tags 배열로 변환
- `--memo=내용`: terrys_memo 필드로 저장
- `--featured`: meta.json에 `featured: true` 추가

## PDF fallback 상세 (`scripts/extract-paper-pdf.py`)

```
사용법: python scripts/extract-paper-pdf.py <pdf_path> <output_dir> [--max-pages=38]
출력:  output_dir/fig-N.{ext} 파일들 + extraction_report.json
```

`extraction_report.json` 구조:
```json
{
  "figures": [
    {"seq_num": 1, "file": "fig-1.png", "page": 5, "caption": "...", "is_cover_candidate": false},
    {"seq_num": 3, "file": "fig-3.png", "page": 12, "caption": "The overview...", "is_cover_candidate": true}
  ],
  "suggested_cover": "fig-3.png",
  "total_extracted": 5
}
```

**의존성**: `pymupdf` + `pypdf` (이미 설치됨). 미설치 시 `pip install pymupdf pypdf`

## 주의사항

- 허위 수치/사실 생성 절대 금지 — 결과 숫자는 표/본문/캡션 확인된 수치만
- Figure 캡션: 원문 전체 작성, 생략/축약 금지
- `cover.webp`가 없으면 가장 대표적인 figure를 cover.webp로 복사
- 이미지 리네임 후 본문 경로 미치환 상태로 커밋 금지
- `node scripts/copy-post-images.mjs` 실행 포함 (Step 8 후 또는 build 전)
