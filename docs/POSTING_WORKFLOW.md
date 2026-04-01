# POSTING_WORKFLOW.md

> 포스트 퍼블리시 흐름 요약. 실행은 `/post` 커맨드(`.claude/commands/post.md`) 사용.

## 실행 방법

- **Research (arXiv)**: `/post https://arxiv.org/abs/...`
- **Blog (Tech/Essays)**: `/post --type=blog <slug>`
- **소셜 공유**: `/post-share <slug>`

상세 스펙: `docs/POST_GENERATOR_RESEARCH.md` (Research), `docs/POST_GENERATOR_BLOG.md` (Blog)

## 공통 규칙

- **slug**: `YYMM-<short-name>` (Research: arXiv 제출일, Blog: 작성일)
- **파일**: `posts/<type>/<slug>/ko.mdx`, `en.mdx`, `cover.webp`
- **meta.json**: 언어 무관 필드의 single source of truth
- **커밋**: `feat(post): add <slug> (ko/en)` — 콘텐츠와 기능 변경을 같은 커밋에 섞지 않음
- **검증**: `node scripts/validate-post.mjs <slug>` → 에러 0일 때까지 수정
