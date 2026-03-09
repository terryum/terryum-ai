#!/usr/bin/env node

/**
 * generate-index.mjs
 * Reads all posts/meta.json files and generates posts/index.json
 * — a central index for AI memory / cross-referencing.
 *
 * Usage: node scripts/generate-index.mjs
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');
const CATEGORIES = ['research', 'idea', 'essay'];

async function readFrontmatter(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const match = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};
    const yaml = match[1];
    const result = {};
    for (const line of yaml.split('\n')) {
      const m = line.match(/^(\w+):\s*"?(.+?)"?\s*$/);
      if (m) result[m[1]] = m[2];
    }
    return result;
  } catch {
    return {};
  }
}

async function collectPosts() {
  const posts = [];

  for (const cat of CATEGORIES) {
    const catDir = path.join(POSTS_DIR, cat);
    let entries;
    try {
      entries = await fs.readdir(catDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const slug = entry.name;
      const metaPath = path.join(catDir, slug, 'meta.json');

      let meta;
      try {
        const raw = await fs.readFile(metaPath, 'utf-8');
        meta = JSON.parse(raw);
      } catch {
        continue;
      }

      // Read titles from frontmatter
      const koFm = await readFrontmatter(path.join(catDir, slug, 'ko.mdx'));
      const enFm = await readFrontmatter(path.join(catDir, slug, 'en.mdx'));

      posts.push({
        post_number: meta.post_number ?? null,
        slug: meta.slug || slug,
        content_type: meta.content_type || (cat === 'research' ? 'reading' : cat === 'essay' ? 'essay' : 'writing'),
        title_en: enFm.title || meta.source_title || slug,
        title_ko: koFm.title || meta.source_title || slug,
        domain: meta.domain || null,
        subfields: meta.subfields || [],
        key_concepts: meta.key_concepts || [],
        methodology: meta.methodology || [],
        contribution_type: meta.contribution_type || null,
        tags: meta.tags || [],
        source_author: meta.source_author || null,
        source_date: meta.source_date || null,
        published_at: meta.published_at || null,
        citation_count: meta.citation_count ?? null,
        ai_summary: meta.ai_summary || null,
        relations: meta.relations || [],
        idea_status: meta.idea_status || null,
        related_posts: meta.related_posts || null,
      });
    }
  }

  // Sort by post_number
  posts.sort((a, b) => (a.post_number ?? 9999) - (b.post_number ?? 9999));
  return posts;
}

function buildKnowledgeGraph(posts) {
  const edges = [];
  for (const post of posts) {
    for (const rel of post.relations || []) {
      edges.push({
        from: post.slug,
        to: rel.target,
        type: rel.type,
      });
    }
  }
  return { edges };
}

function buildConceptIndex(posts) {
  const index = {};
  for (const post of posts) {
    for (const concept of post.key_concepts || []) {
      if (!index[concept]) index[concept] = [];
      if (post.post_number != null) {
        index[concept].push(post.post_number);
      }
    }
  }
  // Sort arrays
  for (const key of Object.keys(index)) {
    index[key].sort((a, b) => a - b);
  }
  return index;
}

function buildDomainStats(posts) {
  const stats = {};
  for (const post of posts) {
    if (post.domain) {
      stats[post.domain] = (stats[post.domain] || 0) + 1;
    }
  }
  return stats;
}

async function main() {
  const posts = await collectPosts();

  const index = {
    generated_at: new Date().toISOString(),
    total_posts: posts.length,
    posts,
    knowledge_graph: buildKnowledgeGraph(posts),
    concept_index: buildConceptIndex(posts),
    domain_stats: buildDomainStats(posts),
  };

  const outPath = path.join(POSTS_DIR, 'index.json');
  await fs.writeFile(outPath, JSON.stringify(index, null, 2) + '\n', 'utf-8');
  console.log(`✓ Generated ${outPath} (${posts.length} posts)`);
}

main().catch((err) => {
  console.error('Failed to generate index:', err);
  process.exit(1);
});
