# Skills 카탈로그

이 프로젝트(terry-artlab-homepage)에서 사용하는 Claude 스킬 목록. **새 스킬 추가 시 이 파일도 업데이트**.

터미널에서 `/<skill-name>` 형태로 호출되며, 각 스킬의 상세 명세는 `SKILL.md`의 frontmatter + 본문에 정의됨.

## 스킬 목록

| Skill | 한 줄 설명 | SKILL.md 경로 | 인프라 의존 |
|---|---|---|---|
| `/post` | 포스트 생성 파이프라인 — arXiv/블로그 URL → Research 포스트, `--type=blog` → Blog 포스트, `virtual`/`synthesis` → 가상/종합 포스트 | `post/SKILL.md` | Cloudflare Worker (재배포), Cloudflare R2 (이미지), Supabase (비공개 포스트) |
| `/survey` | Survey 추가 — Cloudflare Pages 배포된 survey 책을 Surveys 갤러리에 등록 (목차·소개글·커버 자동 생성) | `survey/SKILL.md` | Cloudflare Pages, Supabase (비공개 서베이) |
| `/project` | Project 갤러리 추가 — GitHub URL 또는 수동 입력으로 프로젝트 카드 생성, 다중 링크·커버 자동 생성 | `project/SKILL.md` | Cloudflare Pages (iframe embed), Supabase (비공개 프로젝트) |
| `/share` | 콘텐츠 소셜 공유 — Posts/Surveys/Projects를 Facebook/Threads/LinkedIn/X/Bluesky/Substack에 자동 발행 | `share/SKILL.md` | 독립 (각 플랫폼 API) |
| `/infra-optimize` | 코드베이스 리팩토링 + R2 마이그레이션 + 성능 최적화 + Git 히스토리 정리 (Architect → Engineer → QA 파이프라인) | `infra-optimize/SKILL.md` | Cloudflare R2, Git |
| `/del` | 포스트 삭제 파이프라인 — 인덱스, Supabase, 참조, Obsidian, 정적 에셋까지 모든 연관 시스템 정리 | `del/SKILL.md` | Supabase, Git, Obsidian Vault |
| `/paper-search` | 지식그래프 기반 논문 추천 — 사용자 관심사·기존 포스트 분석하여 읽어야 할 논문 Top 10 추천 | `paper-search/SKILL.md` | 독립 (arXiv API, 내부 index) |
| `/defuddle` | 웹페이지 본문 추출 — Defuddle CLI로 내비/광고/클러터를 제거한 깨끗한 마크다운 추출 (WebFetch 대비 토큰 절약) | `defuddle/SKILL.md` | 독립 (defuddle npm) |

## 스킬 추가 절차

1. `.claude/skills/<skill-name>/SKILL.md` 생성 (frontmatter: `name`, `description`, 선택적 `argument-hint`)
2. 이 파일 표에 한 줄 추가 — Skill / 설명 / 경로 / 인프라 의존 컬럼
3. 인프라 의존도: 해당 스킬이 배포·저장·외부 서비스에 의존하면 명시 (없으면 "독립")

## 관련 문서

- CLAUDE.md (repo root) — 프로젝트 전반 규칙
- `docs/POST_LOADING_ARXIV.md`, `docs/POST_LOADING_ETC.md`, `docs/POST_LOADING_BLOG.md` — `/post` 소스별 분기 규칙
- `docs/RESEARCH_SUMMARY_RULES.md` — `/post` Research 요약 규칙
- `docs/INDEXING.md` — post ID·index 관리

_마지막 Vercel 감사: 2026-04-18 — 스킬 3개(/post, /survey, /project)와 환경·스크립트에서 Vercel 참조 모두 제거. 현재 모든 스킬이 Cloudflare 기반으로 작동._
