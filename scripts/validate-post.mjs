#!/usr/bin/env node

/**
 * validate-post.mjs
 * Validates a published post for completeness and correctness.
 *
 * Usage:
 *   node scripts/validate-post.mjs <slug>          # validate specific post
 *   node scripts/validate-post.mjs --all           # validate all posts
 *   node scripts/validate-post.mjs --all --fix     # auto-fix what's possible
 *
 * Exit code: 0 = pass, 1 = errors found
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');
const PUBLIC_POSTS_DIR = path.join(ROOT, 'public', 'posts');
const CATEGORIES = ['papers', 'notes', 'tech', 'essays'];

// ── Required fields by content type ──────────────────────────────────

const META_REQUIRED_ALL = [
  'post_id', 'slug', 'post_number', 'published_at', 'updated_at',
  'status', 'content_type', 'cover_image', 'reading_time_min', 'tags',
];

const META_REQUIRED_PAPERS = [
  'source_url', 'source_type', 'source_date', 'source_author',
  'source_title', 'google_scholar_url',
  'domain', 'subfields', 'key_concepts', 'ai_summary',
  'taxonomy_primary', 'contribution_type',
];

const META_RECOMMENDED_PAPERS = [
  'source_authors_full', 'source_project_url', 'cover_caption',
  'cover_figure_number', 'methodology', 'relations',
];

const AI_SUMMARY_FIELDS = ['one_liner', 'problem', 'solution', 'key_result', 'limitations'];

const FRONTMATTER_REQUIRED = ['locale', 'title', 'summary', 'card_summary'];

// ── Helpers ──────────────────────────────────────────────────────────

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const yaml = match[1];
  const result = {};
  for (const line of yaml.split('\n')) {
    const m = line.match(/^(\w+):\s*"?(.+?)"?\s*$/);
    if (m) result[m[1]] = m[2];
  }
  return result;
}

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

// ── Core validator ───────────────────────────────────────────────────

async function validatePost(category, slug) {
  const postDir = path.join(POSTS_DIR, category, slug);
  const publicDir = path.join(PUBLIC_POSTS_DIR, slug);
  const errors = [];
  const warnings = [];

  const err = (msg) => errors.push(`❌ ${msg}`);
  const warn = (msg) => warnings.push(`⚠️  ${msg}`);
  const ok = (msg) => {}; // silent on success

  // ── 1. File existence ──────────────────────────────────────────

  const metaPath = path.join(postDir, 'meta.json');
  if (!(await fileExists(metaPath))) {
    err('meta.json missing');
    return { slug, category, errors, warnings };
  }

  const koPath = path.join(postDir, 'ko.mdx');
  const enPath = path.join(postDir, 'en.mdx');
  if (!(await fileExists(koPath))) err('ko.mdx missing');
  if (!(await fileExists(enPath))) err('en.mdx missing');

  const coverPath = path.join(postDir, 'cover.webp');
  if (!(await fileExists(coverPath))) warn('cover.webp missing');

  // ── 2. meta.json validation ────────────────────────────────────

  let meta;
  try {
    meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
  } catch (e) {
    err(`meta.json parse error: ${e.message}`);
    return { slug, category, errors, warnings };
  }

  // Required fields (all types)
  for (const field of META_REQUIRED_ALL) {
    if (meta[field] === undefined || meta[field] === null || meta[field] === '') {
      err(`meta.json missing required field: ${field}`);
    }
  }

  // Papers-specific required fields
  if (category === 'papers') {
    for (const field of META_REQUIRED_PAPERS) {
      if (meta[field] === undefined || meta[field] === null || meta[field] === '') {
        err(`meta.json missing papers-required field: ${field}`);
      }
    }
    for (const field of META_RECOMMENDED_PAPERS) {
      if (meta[field] === undefined || meta[field] === null || meta[field] === '') {
        warn(`meta.json missing recommended field: ${field}`);
      }
    }
  }

  // ai_summary sub-fields
  if (meta.ai_summary && typeof meta.ai_summary === 'object') {
    for (const f of AI_SUMMARY_FIELDS) {
      if (!meta.ai_summary[f]) {
        err(`meta.json ai_summary missing sub-field: ${f}`);
      }
    }
  }

  // Legacy field check
  if (meta.first_author_scholar_url !== undefined) {
    err('meta.json uses deprecated field "first_author_scholar_url" — rename to "google_scholar_url"');
  }

  // ── 3. Figures validation ──────────────────────────────────────

  if (Array.isArray(meta.figures)) {
    for (const fig of meta.figures) {
      if (!fig.number && fig.number !== 0) err(`Figure missing "number" field: ${JSON.stringify(fig.src)}`);
      if (!fig.src) err(`Figure missing "src" field`);
      if (!fig.caption) err(`Figure ${fig.number ?? '?'} missing "caption"`);
      if (!fig.caption_ko) err(`Figure ${fig.number ?? '?'} missing "caption_ko"`);

      // Check file exists
      if (fig.src) {
        const figPath = path.join(postDir, fig.src.replace('./', ''));
        if (!(await fileExists(figPath))) {
          err(`Figure file not found: ${fig.src}`);
        }
      }
    }
  } else if (category === 'papers') {
    warn('meta.json has no figures array');
  }

  // ── 4. Public assets check ─────────────────────────────────────

  if (!(await fileExists(publicDir))) {
    err(`public/posts/${slug}/ directory missing — images won't load`);
  } else {
    // Check cover-thumb exists
    const thumbPath = path.join(publicDir, 'cover-thumb.webp');
    if (!(await fileExists(thumbPath))) {
      warn(`cover-thumb.webp missing in public/posts/${slug}/ — run generate-thumbnails.mjs`);
    }

    // Check figure images exist in public
    if (Array.isArray(meta.figures)) {
      for (const fig of meta.figures) {
        if (!fig.src) continue;
        const fname = fig.src.replace('./', '');
        const publicFigPath = path.join(publicDir, fname);
        if (!(await fileExists(publicFigPath))) {
          err(`Figure not in public: public/posts/${slug}/${fname}`);
        }
      }
    }
  }

  // ── 5. MDX frontmatter validation ──────────────────────────────

  for (const [mdxPath, expectedLocale] of [[koPath, 'ko'], [enPath, 'en']]) {
    if (!(await fileExists(mdxPath))) continue;

    const raw = await fs.readFile(mdxPath, 'utf-8');
    const fm = parseFrontmatter(raw);

    if (!fm) {
      err(`${expectedLocale}.mdx has no valid frontmatter`);
      continue;
    }

    for (const field of FRONTMATTER_REQUIRED) {
      if (!fm[field]) {
        err(`${expectedLocale}.mdx frontmatter missing: ${field}`);
      }
    }

    if (fm.locale && fm.locale !== expectedLocale) {
      err(`${expectedLocale}.mdx has wrong locale: "${fm.locale}"`);
    }

    // Title format check — should contain colon for keyword:description pattern
    if (fm.title && category === 'papers') {
      // Allow π₀ style (already concise) or check for colon
      const hasColon = fm.title.includes(':');
      const isShort = fm.title.length < 40;
      if (!hasColon && !isShort) {
        warn(`${expectedLocale}.mdx title may be raw paper title (no "keyword: description" format): "${fm.title}"`);
      }
    }
  }

  // ── 6. index.json presence ─────────────────────────────────────

  try {
    const index = JSON.parse(await fs.readFile(path.join(POSTS_DIR, 'index.json'), 'utf-8'));
    const entry = index.posts.find(p => p.slug === slug);
    if (!entry) {
      err('Post not found in index.json — run generate-index.mjs');
    } else {
      if (entry.title_en === slug) warn('index.json title_en is slug (source_title may be missing)');
      if (entry.title_ko === slug) warn('index.json title_ko is slug (source_title may be missing)');
    }
  } catch {
    warn('Could not read index.json');
  }

  return { slug, category, errors, warnings };
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const isAll = args.includes('--all');
  const slugArg = args.find(a => !a.startsWith('--'));

  if (!isAll && !slugArg) {
    console.error('Usage: node scripts/validate-post.mjs <slug> | --all');
    process.exit(1);
  }

  const targets = [];

  if (isAll) {
    for (const cat of CATEGORIES) {
      const catDir = path.join(POSTS_DIR, cat);
      try {
        const entries = await fs.readdir(catDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            targets.push({ category: cat, slug: entry.name });
          }
        }
      } catch { /* category doesn't exist */ }
    }
  } else {
    // Find which category the slug belongs to
    let found = false;
    for (const cat of CATEGORIES) {
      const postDir = path.join(POSTS_DIR, cat, slugArg);
      if (await fileExists(postDir)) {
        targets.push({ category: cat, slug: slugArg });
        found = true;
        break;
      }
    }
    if (!found) {
      console.error(`Post "${slugArg}" not found in any category.`);
      process.exit(1);
    }
  }

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const { category, slug } of targets) {
    const result = await validatePost(category, slug);
    const hasIssues = result.errors.length > 0 || result.warnings.length > 0;

    if (hasIssues) {
      console.log(`\n📋 ${category}/${slug}`);
      for (const e of result.errors) console.log(`  ${e}`);
      for (const w of result.warnings) console.log(`  ${w}`);
    }

    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Validated ${targets.length} post(s): ${totalErrors} error(s), ${totalWarnings} warning(s)`);

  if (totalErrors === 0) {
    console.log('✅ All validations passed.');
  } else {
    console.log('💥 Validation failed — fix errors before deploying.');
  }

  process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Validation script error:', err);
  process.exit(1);
});
