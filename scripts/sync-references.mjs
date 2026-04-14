#!/usr/bin/env node

/**
 * sync-references.mjs
 * Syncs Supabase graph_edges (confirmed) → MDX frontmatter references (bidirectional).
 *
 * When edge A→B exists, ensures B's MDX references contain A (and vice versa).
 * Source of truth: Supabase graph_edges with status='confirmed'.
 *
 * Usage:
 *   node scripts/sync-references.mjs              # sync all posts
 *   node scripts/sync-references.mjs --slug=xxx   # sync edges involving xxx
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');

// Content type directories to scan
const CONTENT_DIRS = ['papers', 'essays', 'memos'];

// ── Supabase client ──
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

// ── CLI args ──
const args = process.argv.slice(2);
const slugArg = args.find(a => a.startsWith('--slug='))?.split('=')[1];
const dryRun = args.includes('--dry-run');

// ── Load all meta.json files ──
async function loadAllMeta() {
  const metas = new Map(); // slug → meta object
  for (const dir of CONTENT_DIRS) {
    const dirPath = path.join(POSTS_DIR, dir);
    let entries;
    try { entries = await fs.readdir(dirPath); } catch { continue; }
    for (const slug of entries) {
      const metaPath = path.join(dirPath, slug, 'meta.json');
      try {
        const raw = await fs.readFile(metaPath, 'utf8');
        const meta = JSON.parse(raw);
        meta._dir = dir;
        meta._path = path.join(dirPath, slug);
        metas.set(slug, meta);
      } catch { /* skip */ }
    }
  }
  return metas;
}

// ── Load confirmed edges from Supabase ──
async function loadConfirmedEdges() {
  const { data, error } = await supabase
    .from('graph_edges')
    .select('source_slug, target_slug, edge_type')
    .eq('status', 'confirmed');

  if (error) {
    console.error('❌ Failed to load graph_edges:', error.message);
    process.exit(1);
  }
  return data || [];
}

// ── Parse MDX frontmatter ──
async function parseMdx(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return matter(raw);
  } catch {
    return null;
  }
}

// ── Write updated frontmatter back to MDX ──
async function writeMdx(filePath, parsed) {
  const output = matter.stringify(parsed.content, parsed.data);
  await fs.writeFile(filePath, output, 'utf8');
}

// ── Check if a reference with given post_slug already exists ──
function hasReference(references, postSlug) {
  if (!references || !Array.isArray(references)) return false;
  return references.some(r => r.post_slug === postSlug);
}

// ── Generate reference entry from meta.json ──
function generateReference(meta, locale, edgeType) {
  const title = meta.source_title || meta.slug;
  const author = meta.source_author || 'Unknown';
  const oneLiner = meta.ai_summary?.one_liner || '';

  // Determine the best URL for this reference
  const arxivUrl = meta.source_type === 'arXiv' ? meta.source_url : '';
  const projectUrl = meta.source_type !== 'arXiv' ? (meta.source_url || '') : '';

  const ref = {
    title,
    author,
    description: locale === 'ko'
      ? oneLiner || `관련 연구 (${edgeType})`
      : oneLiner || `Related work (${edgeType})`,
    post_slug: meta.slug,
    category: 'recent',
  };

  // Add URL fields — only non-empty ones
  if (arxivUrl) ref.arxiv_url = arxivUrl;
  if (projectUrl) ref.project_url = projectUrl;
  // Only add scholar_url for academic sources
  if (meta.source_type === 'arXiv' || meta.source_type?.startsWith('Nature') || meta.source_type === 'IEEE') {
    const scholarUrl = meta.google_scholar_url;
    if (scholarUrl) ref.scholar_url = scholarUrl;
  }

  return ref;
}

// ── Main ──
async function main() {
  console.log('🔄 Syncing references from Supabase graph_edges...');

  const [metas, edges] = await Promise.all([loadAllMeta(), loadConfirmedEdges()]);

  console.log(`  Posts: ${metas.size}, Confirmed edges: ${edges.length}`);

  // Filter edges if --slug specified
  const relevantEdges = slugArg
    ? edges.filter(e => e.source_slug === slugArg || e.target_slug === slugArg)
    : edges;

  if (slugArg) {
    console.log(`  Filtering to edges involving: ${slugArg} (${relevantEdges.length} edges)`);
  }

  // Build set of needed references: for each edge A→B, B needs A in references
  // We check BOTH directions: A→B means B should reference A, AND A should reference B
  const neededRefs = new Map(); // slug → Set of {fromSlug, edgeType}

  for (const edge of relevantEdges) {
    const { source_slug, target_slug, edge_type } = edge;

    // B should reference A (reverse direction)
    if (metas.has(target_slug) && metas.has(source_slug)) {
      if (!neededRefs.has(target_slug)) neededRefs.set(target_slug, []);
      neededRefs.get(target_slug).push({ fromSlug: source_slug, edgeType: edge_type });
    }

    // A should reference B (forward direction)
    if (metas.has(source_slug) && metas.has(target_slug)) {
      if (!neededRefs.has(source_slug)) neededRefs.set(source_slug, []);
      neededRefs.get(source_slug).push({ fromSlug: target_slug, edgeType: edge_type });
    }
  }

  let totalAdded = 0;
  let postsModified = 0;

  for (const [slug, refs] of neededRefs) {
    const meta = metas.get(slug);
    const postDir = meta._path;
    let modified = false;

    for (const locale of ['ko', 'en']) {
      const mdxPath = path.join(postDir, `${locale}.mdx`);
      const parsed = await parseMdx(mdxPath);
      if (!parsed) continue;

      const existingRefs = parsed.data.references || [];
      let added = 0;

      for (const { fromSlug, edgeType } of refs) {
        if (hasReference(existingRefs, fromSlug)) continue;

        const fromMeta = metas.get(fromSlug);
        if (!fromMeta) continue;

        const newRef = generateReference(fromMeta, locale, edgeType);
        existingRefs.push(newRef);
        added++;
      }

      if (added > 0) {
        parsed.data.references = existingRefs;
        if (!dryRun) {
          await writeMdx(mdxPath, parsed);
        }
        totalAdded += added;
        modified = true;
        console.log(`  ${dryRun ? '[dry-run] ' : ''}${slug}/${locale}.mdx: +${added} reference(s)`);
      }
    }

    if (modified) postsModified++;
  }

  console.log(`\n✅ Sync complete: ${totalAdded} references added across ${postsModified} posts${dryRun ? ' (dry-run)' : ''}`);
}

main().catch(err => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
