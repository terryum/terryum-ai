# On the Manifold — Terry's External Brain

[한국어](README_ko.md) | **English**

> A personal homepage and AI-operated knowledge base for robotics & AI research.

**Live**: [www.terryum.ai](https://www.terryum.ai)

---

## What This Is

[On the Manifold](https://www.terryum.ai) is a bilingual (Korean/English) research blog, knowledge graph, and personal homepage. Inspired by [Andrej Karpathy's approach](https://x.com/karpathy/status/1911080111710109960) to external-brain knowledge management, the entire content pipeline is operated by Claude Code — papers are summarized, indexed, connected, and published through natural language commands.

The site hosts 40+ research paper summaries, tech essays, memos, and an interactive paper relationship graph. The project uses a multi-workspace setup:

| Workspace | Role | Repository |
|-----------|------|------------|
| **terryum-ai** (this repo) | Site code + infrastructure | [terryum/terryum-ai](https://github.com/terryum/terryum-ai) |
| **terry-papers** | Paper posting + knowledge graph | [terryum/terry-papers](https://github.com/terryum/terry-papers) |
| **terry-surveys** | Survey book creation + management | [terryum/terry-surveys](https://github.com/terryum/terry-surveys) |
| **terry-obsidian** | Obsidian vault + content publishing | (private) |

## Architecture

```
┌───────────────────────────────────────────┐
│          Claude Code (AI Agent)           │
│       /post  /project  /post-share        │
└──────┬──────────────┬──────────────┬──────┘
       v              v              v
  posts/ (MDX)    Supabase     Obsidian Vault
  index.json      (Graph DB)   (Local Knowledge)
       |              |              |
       v              v              v
  ┌──────────┐  ┌──────────┐   ┌────────────┐
  │CF Worker │  │  Paper   │   │ Wikilinks  │
  │ (OpenNxt)│  │  Map UI  │   │ + Dataview │
  └──────────┘  └──────────┘   └────────────┘
```

| Layer | Stack |
|-------|-------|
| **Frontend** | Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 |
| **Content** | Bilingual MDX (ko.mdx / en.mdx) + frontmatter metadata |
| **Images** | Cloudflare R2 CDN (all post images served globally) |
| **Deployment** | Cloudflare Workers (OpenNext) + Pages + R2 |
| **Database** | Supabase (paper relationships, knowledge graph, private content) |
| **Access Control** | Group-based password auth (`/co/[group]`) + Admin |
| **Knowledge Base** | Obsidian (local) + sync script + Claude Code |

## Skills (Claude Code Commands)

Skills are split across two workspaces:

**This repo** (`terryum-ai`) — site development + content pipeline:

| Skill | Description | Example |
|-------|-------------|---------|
| `/post` | Publish a research post from arXiv, blog, or journal URL | `/post https://arxiv.org/abs/2505.22159` |
| `/post virtual` | Create a virtual paper (research proposal) post | `/post virtual --group=snu tactile residual learning` |
| `/share` | Share content to social media (Facebook, X, LinkedIn, Bluesky) | `/share #5 facebook,x` |
| `/project` | Add a project to the gallery | `/project https://github.com/user/repo` |
| `/survey` | Register a deployed survey book site | `/survey https://survey.example.com` |
| `/del` | Safely delete a post and clean all references | `/del #26` or `/del 2505-forcevla --force` |
| `/paper-search` | Recommend papers via knowledge graph + external search | `/paper-search #16 retargeting limitations` |

**`terry-obsidian`** — Obsidian vault management + content publishing:

| Skill | Description | Example |
|-------|-------------|---------|
| `/write` | Generate a styled draft from Obsidian memos | `/write #-1 #-3 --type=tech` |
| `/draft` | Create a publishable draft in Obsidian Drafts folder | `/draft essays This is the title...` |
| `/memo` | Create an Obsidian memo with auto-indexed metadata | `/memo AI and robotics intersection` |
| `/tagging` | Auto-tag posts based on content analysis | `/tagging` |
| `/post` | *(symlink)* Same publishing pipeline, usable from Obsidian workspace | `/post https://arxiv.org/abs/...` |
| `/paper-search` | *(symlink)* Paper recommendations from knowledge graph | `/paper-search #16 retargeting limitations` |

---

## For Those Who Want to Build Something Similar

This is a personal project, not a plug-and-play template. However, since the repository is public and MIT-licensed, you're welcome to study the structure and adapt it. Below is a guide covering what you get by cloning, what you need to set up yourself, and how the pieces connect.

### What You Get by Cloning

- Full Next.js 15 site source code (App Router, i18n routing, MDX rendering)
- Content pipeline: `posts/{papers,essays,memos,notes}/` folder structure
- Paper relationship graph UI (React Flow + Supabase)
- Admin dashboard (stats, graph editor — behind password)
- Group-based access control for private content (`/co/[group]`)
- Claude Code harness (`.claude/agents/`, `.claude/skills/`) — site dev skills; Obsidian skills live in `terry-obsidian`
- Obsidian sync script (`scripts/sync-obsidian.mjs`)
- Social media publishing script (`scripts/publish-social.py`)
- All published post content (MDX + images)

### What You Need to Set Up Yourself

| Component | Why it's not included | Setup effort |
|-----------|----------------------|-------------|
| **Environment variables** | API keys, secrets | Copy `.env.example` → `.env.local`, fill in your keys |
| **Supabase project** | Database for paper graph | Create project, run migration in `supabase/migrations/` |
| **Obsidian vault** | Local knowledge base | Install Obsidian, configure vault path |
| **Cloudflare account** | Deployment (Workers + Pages + R2) + DNS/CDN | Free plan is enough; set up wrangler CLI with API token |
| **Social media tokens** | Publishing automation | Platform-specific OAuth setup |
| **Claude Code** | AI agent operation | Install Claude Code CLI |

---

### Step-by-Step Setup

#### 1. Clone and Install

```bash
git clone https://github.com/terryum/terryum-ai.git
cd terryum-ai
npm install
cp .env.example .env.local
```

#### 2. Environment Variables (`.env.local`)

At minimum, you need:

```env
# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3040

# Identity / Session (HMAC cookie key + admin email)
SESSION_SECRET=generate-a-64-char-hex-string
ADMIN_EMAIL=you@example.com

# Google OAuth (register redirect URI at Google Cloud Console)
GOOGLE_OAUTH_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-xxxxx

# Supabase (optional — site works without it, but Paper Map won't)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

For the full list, see `.env.example`.

#### 3. Supabase (Paper Graph Database)

The paper relationship graph requires three tables. Apply the migration:

```bash
# Option A: Supabase CLI
supabase db push

# Option B: Run SQL manually in Supabase Dashboard
# Copy contents of supabase/migrations/001_initial_schema.sql
```

Tables created:
- `papers` — paper metadata (slug, title, domain, concepts)
- `graph_edges` — relationships between papers (builds_on, extends, etc.)
- `node_layouts` — React Flow canvas positions

If you skip this step, the site still works — the Paper Map page will show a fallback message.

Additionally, `002_acl_schema.sql` creates tables for legacy group-based access control (deprecated — access control now uses inline `visibility` fields in `meta.json` instead of Supabase).

#### 4. Run Locally

```bash
npm run dev  # Starts on localhost:3040
```

#### 5. Deploy to Cloudflare Workers

```bash
npm run build:cf          # OpenNext build for Workers
npx opennextjs-cloudflare deploy   # Deploy via wrangler
```

Runtime env vars go in `wrangler.jsonc` (`vars` for public, `secrets` via `wrangler secret put` for sensitive). See `.env.production` for the set of `NEXT_PUBLIC_*` vars that Next.js inlines into the bundle at build time.

---

### Access Control (Inline Visibility)

The site supports per-post visibility scoping for sharing private content with specific collaborator groups.

```
Public posts              Group-scoped posts
visibility: "public"      visibility: "group", allowed_groups: ["snu"]
Visible to everyone       Visible after /co/snu login
Same posts/ directory     Same posts/ directory
```

**How it works:**

1. Each group has a password set via environment variable:
   ```env
   CO_SNU_PASSWORD=your-password
   CO_KAIST_PASSWORD=another-password
   ```

2. Group-scoped posts are stored in Git alongside public posts, with `visibility` and `allowed_groups` fields in `meta.json`

3. Collaborators visit `/co/snu`, enter the password, then get redirected to the main site where group-scoped posts become visible

4. Unauthenticated users accessing a group post URL are redirected to the login page

5. Admin session grants access to all groups

**Key features:**
- HMAC-SHA256 signed session tokens (24-hour validity)
- Rate limiting (5 attempts per 15 minutes)
- Group posts excluded from sitemap and marked `noindex`
- Groups are isolated — `co-snu` session cannot see `co-kaist` content

---

### Obsidian Integration Guide

This is the part that requires the most manual setup, since the Obsidian vault lives on your local machine and is not included in the repository.

#### What the Obsidian Integration Does

```
Homepage (posts/)  ──sync-obsidian.mjs──►  Obsidian Vault
                                            ├── From AI/Papers/    ← research summaries
                                            ├── From AI/Notes/     ← tech notes
                                            ├── From Terry/Essays/ ← essays
                                            ├── From Terry/Memos/  ← personal memos
                                            └── Ops/Meta/          ← taxonomy, concept index
```

- Published posts are synced as Obsidian notes with wikilinks and frontmatter
- Manual notes created in Obsidian get negative IDs (`#-1`, `#-2`, ...) and can be referenced in Claude Code commands
- The sync is **one-directional** (homepage → Obsidian) for published content, but Obsidian memos can be pulled back via `/write`

#### Setting Up Obsidian

1. **Install Obsidian**: Download from [obsidian.md](https://obsidian.md)

2. **Create a vault**: Create or open a vault at your preferred location (e.g., `~/Documents/Obsidian Vault`)

3. **Initialize vault structure**:
   ```bash
   # Creates the required folder hierarchy
   node scripts/sync-obsidian.mjs --init --vault="/path/to/your/vault"
   ```

   This creates:
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

4. **Sync posts to Obsidian**:
   ```bash
   node scripts/sync-obsidian.mjs --vault="/path/to/your/vault"
   ```

5. **Recommended Obsidian plugins**:
   - **Dataview** — query and filter notes by frontmatter fields
   - **Graph View** (built-in) — visualize wikilink connections
   - **Templates** — use templates in `Ops/Templates/`

#### How Posts Become Obsidian Notes

Each synced note gets frontmatter like:

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

And the body includes a `## Relations` section with wikilinks to related papers — these are preserved even when re-syncing.

---

### Content Structure

Posts follow a consistent directory pattern:

```
posts/
├── index.json                           # Master index of all posts
├── papers/
│   └── 2505-forcevla-force-aware-moe/
│       ├── meta.json                    # Full metadata
│       ├── ko.mdx                       # Korean content
│       ├── en.mdx                       # English content
│       └── cover.webp                   # Cover image
├── essays/
│   └── 260310-brain-augmentation/
│       └── [same structure]
├── memos/
│   └── 260310-on-the-manifold-first-post/
│       └── [same structure]
└── notes/
    └── [same structure]
```

- `content_type` = folder name = URL tab slug
- Every post has both `ko.mdx` and `en.mdx` (bilingual)
- `index.json` is the source of truth for post ordering and metadata
- `meta.json` per post is optional (frontmatter in MDX is the fallback)

### ID System

- **Public posts**: positive IDs (`#1`, `#2`, ...) — visible on the website
- **Private memos**: negative IDs (`#-1`, `#-2`, ...) — Obsidian only, never published
- Any document is referenceable by `#number` in Claude Code commands

---

### Adapting for Your Own Use

If you want to build your own version rather than forking:

1. **Start with the site**: The Next.js app works standalone. Remove my posts, update `src/lib/site-config.ts` with your info
2. **Add your content**: Create posts in `posts/{type}/{slug}/` with `ko.mdx`, `en.mdx`, `cover.webp`
3. **Set up Supabase** (optional): Only needed for the Paper Map feature
4. **Set up Obsidian** (optional): Only needed if you want local knowledge graph management
5. **Configure Claude Code** (optional): The `.claude/` harness is designed for my workflow — modify or remove as needed

## License

MIT
