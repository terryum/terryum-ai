# Terry's Art Lab --- terryum.io

Personal homepage and AI-powered knowledge management system for robotics & AI research.

## Overview

This is the source code for [terryum.io](https://terryum.io), a bilingual (Korean/English) research blog and knowledge management platform. It serves as both a public-facing homepage and a private knowledge graph backend, where arXiv papers are automatically summarized, indexed, and connected into a growing web of research insights.

The site currently hosts 22+ research paper summaries with AI-generated insights, tech essays, and an interactive paper relationship graph -- all managed through an AI-powered publishing pipeline.

## Architecture

| Layer | Stack |
|-------|-------|
| **Frontend** | Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 |
| **Deployment** | Cloudflare (DNS / CDN) + Vercel |
| **Database** | Supabase (paper relationships, knowledge graph) |
| **Knowledge Base** | Obsidian (local graph frontend) + Claude Code (operating agent) |
| **Content** | Bilingual (Korean / English) MDX posts |
| **Image Pipeline** | Sharp (thumbnails) + Gemini 3 (cover generation) + OG image generation |

## AI-Powered Workflow

Inspired by Andrej Karpathy's approach to knowledge management -- treating every paper, memo, and conversation as a node in a personal knowledge graph, operated by an AI agent.

### `/post` -- Research Paper Pipeline
An arXiv URL goes in; a fully formatted bilingual summary comes out. The pipeline downloads the PDF, extracts figures, generates structured summaries following editorial rules, builds taxonomy relationships to existing papers, creates cover images, and publishes -- all in a single command.

```
/post https://arxiv.org/abs/2505.22159 --tags=VLA,robotics --memo="Interesting approach to..."
```

### `/write` -- Obsidian Memo to Published Draft
Personal memos written in Obsidian are transformed into styled tech essays or personal essays, following a learned writing style guide that evolves with editorial feedback.

```
/post --type=blog --from="~/Vault/Drafts/my-idea.md" 260403-my-idea
```

### Knowledge Graph Integration
- Papers are connected via concept overlap, taxonomy placement, and relationship types (`builds_on`, `extends`, `compares_with`, `fills_gap_of`)
- Every published post syncs to a private Obsidian vault with Dataview-queryable metadata
- Conversations and Q&A sessions become knowledge base entries via a unified global index
- Any document can be referenced by `#number` across the entire system

## Key Features

- **Bilingual Content**: Every post exists in both Korean and English with proper i18n routing
- **Research Summaries**: Structured paper breakdowns with extracted figures, tables, and editorial memos
- **Interactive Paper Graph**: Visual exploration of paper relationships powered by React Flow
- **Automated Publishing**: One-command pipeline from arXiv URL to live post with social media sharing
- **Obsidian Integration**: Local knowledge graph with bidirectional sync to the homepage
- **Style Guide Learning**: The system learns from editorial corrections to improve future drafts
- **Cover Image Generation**: AI-generated covers via Gemini 3 when paper figures are unavailable

## Project Structure

```
app/                    # Next.js App Router pages & layouts
posts/
  papers/               # Research paper summaries (MDX + figures)
  tech/                 # Tech essays
  essays/               # Personal essays
scripts/                # Build & automation scripts
.claude/
  skills/               # Claude Code skill definitions (/post, /write, etc.)
  agents/               # Specialized agent configurations
docs/                   # Internal documentation & rules
```

## Note

This repository is Terry's personal project, not a general-purpose template or starter kit.

It requires specific environment variables, API keys, Supabase configurations, and Obsidian vault paths that are not included in this repository. The Claude Code skills and automation pipelines are tailored to a specific workflow and knowledge management philosophy.

Cloning this repo will not produce a working application without the full infrastructure setup. If you find the architecture or workflow ideas interesting, feel free to draw inspiration from the approach -- but please build your own from scratch rather than forking this.

## License

MIT
