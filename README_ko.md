# On the Manifold — Terry's External Brain

**한국어** | [English](README.md)

> 로보틱스 & AI 연구를 위한 개인 홈페이지이자 AI가 운영하는 지식 관리 시스템.

**사이트**: [terry.artlab.ai](https://terry.artlab.ai)

---

## 소개

[On the Manifold](https://terry.artlab.ai)은 한국어/영어 이중 언어 연구 블로그이자 지식 그래프, 개인 홈페이지입니다. [Andrej Karpathy의 외부 두뇌 방식](https://x.com/karpathy/status/1911080111710109960)에 영감을 받아, Claude Code가 AI 에이전트로서 논문 요약, 인덱싱, 관계 연결, 발행을 자연어 명령으로 수행합니다.

현재 27개 이상의 논문 요약, 테크 에세이, 메모, 인터랙티브 논문 관계 그래프를 AI 파이프라인으로 관리하고 있습니다. 이 프로젝트는 두 개의 워크스페이스로 운영됩니다: 이 레포는 사이트 개발용, `terry-obsidian`은 Obsidian 볼트 관리와 콘텐츠 발행용입니다.

## 아키텍처

```
┌───────────────────────────────────────────┐
│         Claude Code (AI 에이전트)         │
│       /post  /project  /post-share        │
└──────┬──────────────┬──────────────┬──────┘
       v              v              v
  posts/ (MDX)    Supabase     Obsidian Vault
  index.json    (그래프 DB)  (로컬 지식베이스)
       |              |              |
       v              v              v
  ┌────────┐    ┌──────────┐  ┌────────────┐
  │ Vercel │    │  Paper   │  │ 위키링크   │
  │  배포  │    │  Map UI  │  │ + Dataview │
  └────────┘    └──────────┘  └────────────┘
```

| 레이어 | 스택 |
|--------|------|
| **프론트엔드** | Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 |
| **콘텐츠** | 이중 언어 MDX (ko.mdx / en.mdx) + 프론트매터 메타데이터 |
| **배포** | Cloudflare (DNS/CDN) + Vercel |
| **데이터베이스** | Supabase (논문 관계, 지식 그래프, 비공개 콘텐츠) |
| **접근 제어** | 그룹별 비밀번호 인증 (`/co/[group]`) + Admin |
| **지식 베이스** | Obsidian (로컬) + 동기화 스크립트 + Claude Code |

## 스킬 (Claude Code 명령어)

스킬은 두 워크스페이스에 분산되어 있습니다:

**이 레포** (`terry-artlab-homepage`) — 사이트 개발 + 콘텐츠 파이프라인:

| 스킬 | 설명 | 예시 |
|------|------|------|
| `/post` | arXiv, 블로그, 저널 URL로 논문 포스트 발행 | `/post https://arxiv.org/abs/2505.22159` |
| `/post virtual` | 가상 논문(Research Proposal) 포스트 생성 | `/post virtual --group=snu 촉각 잔차 학습` |
| `/share` | 소셜 미디어 발행 (Facebook, X, LinkedIn, Bluesky) | `/share #5 facebook,x` |
| `/project` | 프로젝트 갤러리에 추가 | `/project https://github.com/user/repo` |
| `/survey` | 배포된 서베이 책 사이트 등록 | `/survey https://survey.example.com` |
| `/del` | 포스트를 안전하게 삭제하고 모든 참조 정리 | `/del #26` 또는 `/del 2505-forcevla --force` |
| `/paper-search` | 지식 그래프 + 외부 검색으로 논문 추천 | `/paper-search #16 리타게팅 한계` |

**`terry-obsidian`** — Obsidian 볼트 관리 + 콘텐츠 발행:

| 스킬 | 설명 | 예시 |
|------|------|------|
| `/write` | Obsidian 메모를 스타일 가이드 기반 초안으로 변환 | `/write #-1 #-3 --type=tech` |
| `/draft` | Obsidian Drafts 폴더에 발행용 초안 생성 | `/draft essays 제목은 이렇게...` |
| `/memo` | 자동 인덱싱된 Obsidian 메모 생성 | `/memo AI와 로보틱스의 접점` |
| `/tagging` | 콘텐츠 분석 기반 자동 태깅 | `/tagging` |
| `/post` | *(심링크)* 동일 발행 파이프라인, Obsidian 워크스페이스에서 사용 | `/post https://arxiv.org/abs/...` |
| `/paper-search` | *(심링크)* 지식 그래프 기반 논문 추천 | `/paper-search #16 리타게팅 한계` |

---

## 비슷한 시스템을 만들고 싶은 분들을 위한 가이드

이 레포지토리는 개인 프로젝트이지만, MIT 라이선스로 공개되어 있으므로 구조를 참고하고 적용하실 수 있습니다. 아래는 클론으로 얻을 수 있는 것, 직접 설정해야 하는 것, 각 부분이 어떻게 연결되는지를 정리한 가이드입니다.

### 클론하면 얻을 수 있는 것

- Next.js 15 사이트 전체 소스 (App Router, i18n 라우팅, MDX 렌더링)
- 콘텐츠 파이프라인: `posts/{papers,essays,memos,notes}/` 폴더 구조
- 논문 관계 그래프 UI (React Flow + Supabase)
- 어드민 대시보드 (통계, 그래프 편집기 — 비밀번호 보호)
- 그룹별 접근 제어 시스템 (`/co/[group]`)
- Claude Code 하네스 (`.claude/agents/`, `.claude/skills/`) — 사이트 개발 스킬; Obsidian 스킬은 `terry-obsidian`에 위치
- Obsidian 동기화 스크립트 (`scripts/sync-obsidian.mjs`)
- 소셜 미디어 발행 스크립트 (`scripts/publish-social.py`)
- 발행된 포스트 전체 콘텐츠 (MDX + 이미지)

### 직접 설정해야 하는 것

| 구성 요소 | 미포함 이유 | 설정 난이도 |
|-----------|------------|------------|
| **환경 변수** | API 키, 시크릿 | `.env.example` → `.env.local` 복사 후 키 입력 |
| **Supabase 프로젝트** | 논문 그래프 DB | 프로젝트 생성 후 `supabase/migrations/` 마이그레이션 실행 |
| **Obsidian 볼트** | 로컬 지식 베이스 | Obsidian 설치 + 볼트 경로 설정 |
| **Vercel 계정** | 배포 | 레포 연결 |
| **Cloudflare** | DNS/CDN (선택) | 커스텀 도메인 + CDN 사용 시에만 |
| **소셜 미디어 토큰** | 발행 자동화 | 플랫폼별 OAuth 설정 |
| **Claude Code** | AI 에이전트 운영 | Claude Code CLI 설치 |

---

### 단계별 설정 가이드

#### 1. 클론 및 설치

```bash
git clone https://github.com/terryum/terry-artlab-homepage.git
cd terry-artlab-homepage
npm install
cp .env.example .env.local
```

#### 2. 환경 변수 (`.env.local`)

최소 필수 설정:

```env
# 사이트
NEXT_PUBLIC_SITE_URL=http://localhost:3040

# 어드민 (원하는 비밀번호 설정)
ADMIN_PASSWORD=your-password
ADMIN_SESSION_SECRET=64자-hex-문자열-생성

# Supabase (선택 — 없어도 사이트는 동작하나 Paper Map 불가)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

전체 목록은 `.env.example` 참고.

#### 3. Supabase (논문 그래프 데이터베이스)

논문 관계 그래프에 3개 테이블이 필요합니다:

```bash
# 방법 A: Supabase CLI
supabase db push

# 방법 B: Supabase 대시보드에서 SQL 직접 실행
# supabase/migrations/001_initial_schema.sql 내용 복사
```

생성되는 테이블:
- `papers` — 논문 메타데이터 (slug, 제목, 도메인, 개념)
- `graph_edges` — 논문 간 관계 (builds_on, extends 등)
- `node_layouts` — React Flow 캔버스 위치

이 단계를 건너뛰어도 사이트 자체는 동작합니다. Paper Map 페이지만 폴백 메시지를 표시합니다.

추가로 `002_acl_schema.sql`이 레거시 그룹 접근 제어 테이블을 생성합니다 (deprecated — 접근 제어는 현재 `meta.json`의 인라인 `visibility` 필드로 동작).

#### 4. 로컬 실행

```bash
npm run dev  # localhost:3040에서 시작
```

#### 5. Vercel 배포

```bash
npm run build   # 빌드 성공 확인
vercel          # 연결 및 배포
```

Vercel 프로젝트 설정에서 동일한 환경 변수를 설정하세요.

---

### 접근 제어 (인라인 Visibility)

포스트별 공개 범위 설정으로 특정 공동연구자 그룹에게만 콘텐츠를 공유할 수 있습니다.

```
공개 포스트                  그룹 전용 포스트
visibility: "public"        visibility: "group", allowed_groups: ["snu"]
누구나 열람                  /co/snu 로그인 후 열람
동일한 posts/ 디렉토리       동일한 posts/ 디렉토리
```

**작동 방식:**

1. 각 그룹에 환경변수로 비밀번호를 설정합니다:
   ```env
   CO_SNU_PASSWORD=your-password
   CO_KAIST_PASSWORD=another-password
   ```

2. 그룹 전용 포스트는 공개 포스트와 함께 Git에 저장되며, `meta.json`의 `visibility`와 `allowed_groups` 필드로 구분됩니다

3. 공동연구자가 `/co/snu`에서 비밀번호를 입력하면 메인 사이트로 리다이렉트되고, 그룹 전용 포스트가 함께 표시됩니다

4. 비인증 사용자가 그룹 포스트 URL에 직접 접근하면 로그인 페이지로 리다이렉트됩니다

5. Admin 세션은 모든 그룹에 접근 가능

**주요 기능:**
- HMAC-SHA256 서명 세션 토큰 (24시간 유효)
- Rate limiting (15분 5회)
- 그룹 포스트는 sitemap 제외 + `noindex` 처리
- 그룹 간 격리 — co-snu 세션으로 co-kaist 콘텐츠 접근 불가

---

### Obsidian 연동 가이드

Obsidian 볼트는 로컬 머신에 존재하므로 레포에 포함되지 않습니다. 이 부분이 가장 수동 설정이 많이 필요합니다.

#### Obsidian 연동이 하는 일

```
홈페이지 (posts/)  ──sync-obsidian.mjs──►  Obsidian Vault
                                            ├── From AI/Papers/    ← 논문 요약
                                            ├── From AI/Notes/     ← 기술 노트
                                            ├── From Terry/Essays/ ← 에세이
                                            ├── From Terry/Memos/  ← 개인 메모
                                            └── Ops/Meta/          ← 분류 체계, 개념 인덱스
```

- 발행된 포스트가 위키링크와 프론트매터를 가진 Obsidian 노트로 동기화됩니다
- Obsidian에서 직접 만든 메모는 음수 ID (`#-1`, `#-2`, ...)를 받아 Claude Code 명령에서 참조할 수 있습니다
- 동기화는 발행 콘텐츠에 대해 **단방향** (홈페이지 → Obsidian)이지만, Obsidian 메모는 `/write`로 다시 가져올 수 있습니다

#### Obsidian 설정 방법

1. **Obsidian 설치**: [obsidian.md](https://obsidian.md)에서 다운로드

2. **볼트 생성**: 원하는 위치에 볼트를 생성하거나 열기 (예: `~/Documents/Obsidian Vault`)

3. **볼트 구조 초기화**:
   ```bash
   # 필요한 폴더 계층 구조를 생성합니다
   node scripts/sync-obsidian.mjs --init --vault="/path/to/your/vault"
   ```

   생성되는 구조:
   ```
   Your Vault/
   ├── From AI/
   │   ├── Papers/
   │   └── Notes/
   ├── From Terry/
   │   ├── Memos/
   │   ├── Essays/
   │   └── Drafts/
   └── Ops/
       ├── Meta/
       └── Templates/
   ```

4. **포스트를 Obsidian에 동기화**:
   ```bash
   node scripts/sync-obsidian.mjs --vault="/path/to/your/vault"
   ```

5. **추천 Obsidian 플러그인**:
   - **Dataview** — 프론트매터 필드로 노트 쿼리/필터링
   - **Graph View** (내장) — 위키링크 연결 시각화
   - **Templates** — `Ops/Templates/`의 템플릿 활용

#### 동기화된 노트의 형태

각 노트에는 다음과 같은 프론트매터가 생성됩니다:

```yaml
---
doc_id: 5
slug: 2505-forcevla-force-aware-moe
content_type: papers
domain: robotics
tags: [VLA, force-control, MoE]
sync_hash: a1b2c3d4
synced_at: 2026-04-07T12:00:00Z
---
```

본문에는 관련 논문으로의 위키링크가 포함된 `## 관계` 섹션이 있으며, 재동기화 시에도 수동으로 추가한 링크는 보존됩니다.

---

### 콘텐츠 구조

포스트는 일관된 디렉토리 패턴을 따릅니다:

```
posts/
├── index.json                           # 전체 포스트 마스터 인덱스
├── papers/
│   └── 2505-forcevla-force-aware-moe/
│       ├── meta.json                    # 전체 메타데이터
│       ├── ko.mdx                       # 한국어 콘텐츠
│       ├── en.mdx                       # 영어 콘텐츠
│       └── cover.webp                   # 커버 이미지
├── essays/
│   └── 260310-brain-augmentation/
│       └── [동일 구조]
├── memos/
│   └── 260310-on-the-manifold-first-post/
│       └── [동일 구조]
└── notes/
    └── [동일 구조]
```

- `content_type` = 폴더명 = URL 탭 슬러그
- 모든 포스트에 `ko.mdx`와 `en.mdx` 모두 필요 (이중 언어)
- `index.json`이 포스트 순서와 메타데이터의 기준
- 포스트별 `meta.json`은 선택 사항 (MDX 프론트매터가 폴백)

### ID 시스템

- **공개 포스트**: 양수 ID (`#1`, `#2`, ...) — 웹사이트에 표시
- **비공개 메모**: 음수 ID (`#-1`, `#-2`, ...) — Obsidian 전용, 발행 안 됨
- 모든 문서는 Claude Code 명령에서 `#번호`로 참조 가능

---

### 자신만의 버전 만들기

포크보다 처음부터 만드는 것을 추천합니다:

1. **사이트부터 시작**: Next.js 앱은 독립적으로 동작합니다. 제 포스트를 삭제하고 `src/lib/site-config.ts`를 수정하세요
2. **콘텐츠 추가**: `posts/{type}/{slug}/`에 `ko.mdx`, `en.mdx`, `cover.webp`로 포스트 생성
3. **Supabase 설정** (선택): Paper Map 기능에만 필요
4. **Obsidian 설정** (선택): 로컬 지식 그래프 관리가 필요한 경우에만
5. **Claude Code 설정** (선택): `.claude/` 하네스는 제 워크플로우에 맞춰져 있으므로 필요에 따라 수정하거나 제거하세요

## 라이선스

MIT
