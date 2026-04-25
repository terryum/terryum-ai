#!/usr/bin/env node

/**
 * sync-obsidian.mjs
 * Transforms homepage post data into Obsidian-compatible markdown notes.
 *
 * Usage:
 *   node scripts/sync-obsidian.mjs [--slug=<slug>] [--dry-run] [--vault=<path>] [--init]
 *
 * Vault path resolution order:
 *   1. --vault=<path> CLI flag
 *   2. OBSIDIAN_VAULT_PATH env var
 *   3. ~/Codes/personal/terry-obsidian/vault (current canonical location)
 *   4. ~/Documents/Obsidian Vault (legacy fallback)
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { POSTS_DIR, getContentDirs } from './lib/paths.mjs';
import { loadEnv } from './lib/env.mjs';
import { getR2PublicUrl } from './lib/r2-config.mjs';
import { fetchPrivateMdx, fetchPrivateMeta } from './lib/r2-private.mjs';

await loadEnv();

const CATEGORIES = await getContentDirs();

// ── CLI args ──
const args = process.argv.slice(2);
const slugFilter = args.find(a => a.startsWith('--slug='))?.split('=')[1] || null;
const dryRun = args.includes('--dry-run');
const initMode = args.includes('--init');
const vaultArg = args.find(a => a.startsWith('--vault='))?.split('=')[1] || null;

async function resolveVaultRoot() {
  if (vaultArg) return vaultArg;
  if (process.env.OBSIDIAN_VAULT_PATH) return process.env.OBSIDIAN_VAULT_PATH;
  const candidates = [
    path.join(os.homedir(), 'Codes', 'personal', 'terry-obsidian', 'vault'),
    path.join(os.homedir(), 'Documents', 'Obsidian Vault'),
  ];
  for (const c of candidates) {
    try { await fs.access(c); return c; } catch {}
  }
  return candidates[0];
}

const VAULT_ROOT = await resolveVaultRoot();

// ── Vault folder structure ──
const VAULT_FOLDERS = [
  'From AI/Papers',
  'From AI/Threads',
  'From Terry/Memos',
  'From Terry/Essays',
  'From Terry/Drafts',
  'Ops/Meta',
  'Ops/Templates',
];

// ── R2 public URL for images ──
const R2_PUBLIC_URL = getR2PublicUrl();
if (!R2_PUBLIC_URL) {
  console.error('❌ R2_PUBLIC_URL (or NEXT_PUBLIC_R2_URL) not set in .env.local');
  process.exit(1);
}
function r2ImageUrl(slug, filename) {
  return `${R2_PUBLIC_URL}/posts/${slug}/${filename}`;
}

// ── content_type → vault subfolder mapping ──
const TYPE_TO_FOLDER = {
  papers: 'From AI/Papers',
  threads: 'From AI/Threads',
  memos: 'From Terry/Memos',
  essays: 'From Terry/Essays',
};

// ── Relation type → Korean label ──
const RELATION_LABELS = {
  builds_on: 'Builds on',
  extends: 'Extends',
  uses_method: 'Uses method from',
  compares_with: 'Compares with',
  fills_gap_of: 'Fills gap of',
  addresses_task: 'Addresses task of',
  related: 'Related to',
};

// ── Parse Terry's memo from MDX (reused pattern from export-knowledge.mjs) ──
function parseTerryMemo(mdxContent) {
  const memoMatch = mdxContent.match(/## Terry'?s memo\n\n([\s\S]*?)(?=\n##|\n---|\Z|$)/i);
  if (!memoMatch) return [];

  const memoBlock = memoMatch[1].trim();
  if (memoBlock === '- *(None)*' || memoBlock === '*(None)*' ||
      memoBlock === '- *(없음)*' || memoBlock === '*(없음)*') return [];

  const memos = [];
  for (const line of memoBlock.split('\n')) {
    const cleaned = line.replace(/^-\s*/, '').trim();
    if (cleaned && cleaned !== '*(None)*' && cleaned !== '*(없음)*') {
      memos.push(cleaned);
    }
  }
  return memos;
}

// ── Read frontmatter from MDX ──
function parseFrontmatter(mdxContent) {
  const match = mdxContent.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const yaml = match[1];
  const result = {};
  for (const line of yaml.split('\n')) {
    const m = line.match(/^(\w[\w_]*):\s*"(.+?)"\s*$/);
    if (m) result[m[1]] = m[2];
    const m2 = line.match(/^(\w[\w_]*):\s*(\d+)\s*$/);
    if (m2) result[m2[1]] = Number(m2[2]);
  }
  return result;
}

// ── MD5 hash of meta object ──
function computeSyncHash(meta) {
  return crypto.createHash('md5').update(JSON.stringify(meta)).digest('hex');
}

// ── Extract user-added wikilinks from existing Relations section ──
function extractUserWikilinks(existingContent, metaRelationSlugs) {
  const relSection = existingContent.match(/## 관계\n([\s\S]*?)(?=\n## |\n#[^ ]|$)/);
  if (!relSection) return [];

  const userLinks = [];
  for (const line of relSection[1].split('\n')) {
    const wikiMatch = line.match(/\[\[([^\]]+)\]\]/);
    if (wikiMatch) {
      const linkedSlug = wikiMatch[1];
      if (!metaRelationSlugs.includes(linkedSlug)) {
        userLinks.push(line.trim());
      }
    }
  }
  return userLinks;
}

// ── Read existing note if present ──
async function readExistingNote(notePath) {
  try {
    return await fs.readFile(notePath, 'utf-8');
  } catch {
    return null;
  }
}

// ── Extract sync_hash from existing note frontmatter ──
function extractSyncHash(noteContent) {
  const match = noteContent?.match(/sync_hash:\s*"([a-f0-9]+)"/);
  return match ? match[1] : null;
}

// ── Check whether an existing note has a sync_hash field (any value) ──
function hasSyncHashField(noteContent) {
  if (!noteContent) return false;
  const fmMatch = noteContent.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return false;
  return /^sync_hash:/m.test(fmMatch[1]);
}

// ── Detect drift between human-curated vault frontmatter and canonical meta ──
// Returns array of {field, vault, canonical} mismatches. Does not mutate.
function detectHumanCuratedDrift(noteContent, meta) {
  const fmMatch = noteContent.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return [];
  const fm = fmMatch[1];
  const getField = (key) => {
    const scalar = fm.match(new RegExp(`^${key}:\\s*"?([^"\\n]*?)"?\\s*$`, 'm'));
    return scalar ? scalar[1].trim() : null;
  };
  const drifts = [];
  const vaultDocId = getField('doc_id');
  if (vaultDocId !== null && meta.post_number != null &&
      String(vaultDocId) !== String(meta.post_number)) {
    drifts.push({ field: 'doc_id', vault: vaultDocId, canonical: meta.post_number });
  }
  const vaultSlug = getField('slug');
  if (vaultSlug !== null && meta.slug && vaultSlug !== meta.slug) {
    drifts.push({ field: 'slug', vault: vaultSlug, canonical: meta.slug });
  }
  const vaultType = getField('content_type');
  if (vaultType !== null && meta.content_type && vaultType !== meta.content_type) {
    drifts.push({ field: 'content_type', vault: vaultType, canonical: meta.content_type });
  }
  return drifts;
}

// ── Strip frontmatter from MDX/MD content ──
function stripFrontmatter(mdxContent) {
  return mdxContent.replace(/^---\n[\s\S]*?\n---\n?/, '').replace(/^\n+/, '');
}

// ── Convert inline [text](/posts/slug) links to [[slug|text]] wikilinks ──
function convertPostLinksToWikilinks(body) {
  return body.replace(
    /\[([^\]]+)\]\(\/posts\/([^\/\)#\s]+)\/?\)/g,
    (_, text, slug) => `[[${slug}|${text}]]`
  );
}

// ── Build canonical Terry tags: [type, ...meta.tags lowercase+hyphen] ──
function buildTerryTags(meta) {
  const type = (meta.content_type || 'essays').toLowerCase();
  const out = [type];
  const seen = new Set([type]);
  for (const t of (meta.tags || [])) {
    const s = String(t).trim().toLowerCase().replace(/\s+/g, '-');
    if (!s || seen.has(s)) continue;
    out.push(s);
    seen.add(s);
  }
  return out;
}

// ── Build canonical full-body note for essays/memos (from-terry, no sync_hash) ──
function buildCanonicalTerryNote(meta, koMdx) {
  const koFm = parseFrontmatter(koMdx);
  const title = koFm.title || meta.source_title || meta.slug;
  const docId = meta.post_number;
  const contentType = meta.content_type || 'essays';
  const visibility = meta.visibility || 'public';
  const publishedDate = meta.published_at ? meta.published_at.split('T')[0] : null;
  const tags = buildTerryTags(meta);

  const fmLines = [
    '---',
    `doc_id: ${docId}`,
    `slug: "${meta.slug}"`,
    `source: "from-terry"`,
    `content_type: "${contentType}"`,
    `visibility: "${visibility}"`,
    `title: "${title.replace(/"/g, '\\"')}"`,
    publishedDate ? `published_at: ${publishedDate}` : null,
    `tags: [${tags.join(', ')}]`,
    '---',
  ].filter(Boolean);

  const titleLine = `\`#${docId}\` · ${title}`;
  const body = convertPostLinksToWikilinks(stripFrontmatter(koMdx));

  const parts = [fmLines.join('\n'), '', titleLine, ''];
  if (meta.cover_image) {
    parts.push(`![cover](${r2ImageUrl(meta.slug, 'cover.webp')})`);
    parts.push('');
  }
  parts.push(body);
  if (!body.endsWith('\n')) parts.push('');

  return parts.join('\n');
}

// ── Build note content for Papers ──
function buildPaperNote(meta, koFm, terryMemos, existingContent) {
  const syncHash = computeSyncHash(meta);
  const metaRelationSlugs = (meta.relations || []).map(r => r.target);
  const userLinks = existingContent
    ? extractUserWikilinks(existingContent, metaRelationSlugs)
    : [];

  const titleKo = koFm.title || meta.source_title || meta.slug;
  const oneLiner = meta.ai_summary?.one_liner || '';

  // Frontmatter
  const fm = [
    '---',
    `doc_id: ${meta.post_number}`,
    `slug: "${meta.slug}"`,
    `source: "from-ai"`,
    `content_type: "papers"`,
    `visibility: "public"`,
    `title_ko: "${titleKo.replace(/"/g, '\\"')}"`,
    `domain: "${meta.domain || ''}"`,
    `taxonomy_primary: "${meta.taxonomy_primary || ''}"`,
    `taxonomy_secondary: ${JSON.stringify(meta.taxonomy_secondary || [])}`,
    `key_concepts: ${JSON.stringify(meta.key_concepts || [])}`,
    `methodology: ${JSON.stringify(meta.methodology || [])}`,
    `source_author: "${(meta.source_author || '').replace(/"/g, '\\"')}"`,
    meta.source_date ? `source_date: ${meta.source_date.split('T')[0]}` : null,
    meta.published_at ? `published_at: ${meta.published_at.split('T')[0]}` : null,
    meta.source_url ? `source_url: "${meta.source_url}"` : null,
    `sync_hash: "${syncHash}"`,
    `synced_at: "${new Date().toISOString()}"`,
    '---',
  ].filter(Boolean).join('\n');

  // Title line
  const titleLine = `\`#${meta.post_number}\` · ${titleKo}`;

  // Cover image
  const coverImg = `\n![cover](${r2ImageUrl(meta.slug, 'cover.webp')})\n`;

  // One-liner quote
  const quoteBlock = oneLiner ? `\n> ${oneLiner}\n` : '';

  // AI summary
  let aiSection = '';
  if (meta.ai_summary) {
    const s = meta.ai_summary;
    aiSection = [
      '\n## AI 요약',
      s.problem ? `- **문제**: ${s.problem}` : null,
      s.solution ? `- **해결**: ${s.solution}` : null,
      s.key_result ? `- **핵심 결과**: ${s.key_result}` : null,
    ].filter(Boolean).join('\n');
  }

  // Relations
  let relSection = '\n## 관계';
  const relLines = (meta.relations || []).map(r => {
    const label = RELATION_LABELS[r.type] || r.type;
    return `- ${label} [[${r.target}]]`;
  });
  // Append user-added wikilinks
  for (const ul of userLinks) {
    relLines.push(ul);
  }
  if (relLines.length === 0) {
    relLines.push('- *(없음)*');
  }
  relSection += '\n' + relLines.join('\n');

  // Terry's Memo
  let memoSection = '\n## Terry\'s Memo';
  if (terryMemos.length > 0) {
    memoSection += '\n' + terryMemos.map(m => `- ${m}`).join('\n');
  } else {
    memoSection += '\n- *(없음)*';
  }

  // Tags line
  const tagParts = ['papers'];
  if (meta.domain) tagParts.push(meta.domain);
  for (const kc of (meta.key_concepts || []).slice(0, 3)) {
    tagParts.push(kc.replace(/\s+/g, '-'));
  }
  const tagsLine = '\n' + tagParts.map(t => `#${t}`).join(' ');

  return [fm, '', titleLine, coverImg, quoteBlock, aiSection, relSection, memoSection, tagsLine, ''].join('\n');
}

// ── Build note content for Essays/Tech ──
function buildEssayNote(meta, koFm, terryMemos, existingContent) {
  const syncHash = computeSyncHash(meta);
  const metaRelationSlugs = (meta.relations || []).map(r => r.target);
  const userLinks = existingContent
    ? extractUserWikilinks(existingContent, metaRelationSlugs)
    : [];

  const titleKo = koFm.title || meta.slug;
  const summaryKo = koFm.summary || '';

  const fm = [
    '---',
    `doc_id: ${meta.post_number}`,
    `slug: "${meta.slug}"`,
    `source: "from-terry"`,
    `content_type: "${meta.content_type}"`,
    `visibility: "public"`,
    `title_ko: "${titleKo.replace(/"/g, '\\"')}"`,
    `domain: "${meta.domain || ''}"`,
    meta.taxonomy_primary ? `taxonomy_primary: "${meta.taxonomy_primary}"` : null,
    `key_concepts: ${JSON.stringify(meta.key_concepts || [])}`,
    meta.published_at ? `published_at: ${meta.published_at.split('T')[0]}` : null,
    `sync_hash: "${syncHash}"`,
    `synced_at: "${new Date().toISOString()}"`,
    '---',
  ].filter(Boolean).join('\n');

  const titleLine = `\`#${meta.post_number}\` · ${titleKo}`;
  const coverImg = `\n![cover](${r2ImageUrl(meta.slug, 'cover.webp')})\n`;
  const summaryBlock = summaryKo ? `\n> ${summaryKo}\n` : '';

  // Relations
  let relSection = '\n## 관계';
  const relLines = (meta.relations || []).map(r => {
    const label = RELATION_LABELS[r.type] || r.type;
    return `- ${label} [[${r.target}]]`;
  });
  // related_posts (essays/tech use these instead of relations)
  if (meta.related_posts) {
    for (const rp of meta.related_posts) {
      if (rp.slug && !metaRelationSlugs.includes(rp.slug)) {
        relLines.push(`- Related to [[${rp.slug}]]`);
      }
    }
  }
  for (const ul of userLinks) {
    relLines.push(ul);
  }
  if (relLines.length === 0) {
    relLines.push('- *(없음)*');
  }
  relSection += '\n' + relLines.join('\n');

  // Terry's Memo
  let memoSection = '\n## Terry\'s Memo';
  if (terryMemos.length > 0) {
    memoSection += '\n' + terryMemos.map(m => `- ${m}`).join('\n');
  } else {
    memoSection += '\n- *(없음)*';
  }

  const tagParts = [meta.content_type];
  if (meta.domain) tagParts.push(meta.domain);
  for (const kc of (meta.key_concepts || []).slice(0, 3)) {
    tagParts.push(kc.replace(/\s+/g, '-'));
  }
  const tagsLine = '\n' + tagParts.map(t => `#${t}`).join(' ');

  return [fm, '', titleLine, coverImg, summaryBlock, relSection, memoSection, tagsLine, ''].join('\n');
}

// ── Generate Meta/Taxonomy.md ──
async function generateTaxonomy(slugToPostMap) {
  let taxonomyData;
  try {
    const raw = await fs.readFile(path.join(POSTS_DIR, 'taxonomy.json'), 'utf-8');
    taxonomyData = JSON.parse(raw);
  } catch {
    console.warn('  ⚠ taxonomy.json not found, skipping Taxonomy.md');
    return null;
  }

  const nodes = taxonomyData.nodes || {};
  const lines = [
    '---',
    'doc_type: "meta"',
    `synced_at: "${new Date().toISOString()}"`,
    '---',
    '',
    '# Taxonomy',
    '',
    '분류 체계와 해당하는 포스트 목록.',
    '',
  ];

  // Find root nodes (no parent)
  const childSet = new Set();
  for (const node of Object.values(nodes)) {
    for (const child of (node.children || [])) {
      childSet.add(child);
    }
  }
  const rootIds = Object.keys(nodes).filter(id => !childSet.has(id));

  function renderNode(nodeId, depth = 0) {
    const node = nodes[nodeId];
    if (!node) return;
    const indent = '  '.repeat(depth);
    const label = node.label?.ko || nodeId;
    lines.push(`${indent}- **${label}** (\`${nodeId}\`)`);

    // Find posts with this taxonomy_primary
    const matching = slugToPostMap.filter(p => p.taxonomy_primary === nodeId);
    for (const p of matching) {
      lines.push(`${indent}  - [[${p.slug}]]`);
    }

    for (const childId of (node.children || [])) {
      renderNode(childId, depth + 1);
    }
  }

  for (const rootId of rootIds) {
    renderNode(rootId);
    lines.push('');
  }

  return lines.join('\n');
}

// ── Generate Meta/Concept Index.md ──
function generateConceptIndex(slugToPostMap) {
  const conceptMap = {};
  for (const post of slugToPostMap) {
    for (const concept of (post.key_concepts || [])) {
      if (!conceptMap[concept]) conceptMap[concept] = [];
      conceptMap[concept].push(post.slug);
    }
  }

  const lines = [
    '---',
    'doc_type: "meta"',
    `synced_at: "${new Date().toISOString()}"`,
    '---',
    '',
    '# Concept Index',
    '',
    'key_concepts별 포스트 목록.',
    '',
  ];

  const sorted = Object.entries(conceptMap).sort(([a], [b]) => a.localeCompare(b));
  for (const [concept, slugs] of sorted) {
    lines.push(`## ${concept}`);
    for (const slug of slugs) {
      lines.push(`- [[${slug}]]`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ── buildGlobalIndex removed ──
// global-index.json is now maintained by generate-index.mjs (additive merge).
// sync-obsidian.mjs only reads it and appends unregistered vault files.

// ── Main ──
async function main() {
  console.log('🔄 Obsidian sync starting...');
  console.log(`  Vault: ${VAULT_ROOT}`);
  console.log(`  Mode: ${initMode ? 'init' : 'sync'}${dryRun ? ' (dry-run)' : ''}`);
  if (slugFilter) console.log(`  Filter: ${slugFilter}`);

  // Check vault exists (unless init)
  try {
    await fs.access(VAULT_ROOT);
  } catch {
    if (!initMode) {
      console.warn(`⚠ Vault directory not found: ${VAULT_ROOT}`);
      console.warn('  Use --init to create folder structure, or --vault=<path> to specify.');
      process.exit(0);
    }
  }

  // Init: create folder structure
  if (initMode && !dryRun) {
    for (const folder of VAULT_FOLDERS) {
      const fullPath = path.join(VAULT_ROOT, folder);
      await fs.mkdir(fullPath, { recursive: true });
      console.log(`  📁 ${folder}`);
    }
  } else if (initMode && dryRun) {
    console.log('  [dry-run] Would create folders:');
    for (const f of VAULT_FOLDERS) console.log(`    📁 ${f}`);
  }

  // Load posts index (prefer index-private.json only if fresher than index.json)
  let indexData;
  const privateIndexPath = path.join(POSTS_DIR, 'index-private.json');
  const publicIndexPath = path.join(POSTS_DIR, 'index.json');
  let usePrivate = false;
  try {
    const [privStat, pubStat] = await Promise.all([
      fs.stat(privateIndexPath).catch(() => null),
      fs.stat(publicIndexPath).catch(() => null),
    ]);
    // Use index-private only if it exists AND is newer than index.json
    if (privStat && pubStat && privStat.mtimeMs >= pubStat.mtimeMs) {
      usePrivate = true;
    } else if (privStat && !pubStat) {
      usePrivate = true;
    }
  } catch { /* fall through */ }

  try {
    const chosenPath = usePrivate ? privateIndexPath : publicIndexPath;
    const raw = await fs.readFile(chosenPath, 'utf-8');
    indexData = JSON.parse(raw);
    console.log(`  Using ${usePrivate ? 'index-private.json (includes group posts)' : 'index.json'}`);
  } catch {
    try {
      const raw = await fs.readFile(publicIndexPath, 'utf-8');
      indexData = JSON.parse(raw);
    } catch (err) {
      console.error('❌ Cannot read posts/index.json:', err.message);
      process.exit(1);
    }
  }

  const allPosts = indexData.posts || [];
  const targetPosts = slugFilter
    ? allPosts.filter(p => p.slug === slugFilter)
    : allPosts;

  if (slugFilter && targetPosts.length === 0) {
    console.error(`❌ No post found with slug: ${slugFilter}`);
    process.exit(1);
  }

  let synced = 0;
  let skipped = 0;
  const slugToPostMap = [];
  const driftWarnings = [];

  for (const post of targetPosts) {
    const slug = post.slug;
    const contentType = post.content_type;
    const catDir = contentType || 'papers';
    const postDir = path.join(POSTS_DIR, catDir, slug);
    const isPrivate = post.visibility && post.visibility !== 'public';

    // Read meta.json + ko.mdx — public posts live on the filesystem,
    // private/group posts live in R2 (private/posts/<type>/<slug>/...).
    let meta;
    let koMdx = '';

    if (isPrivate) {
      meta = await fetchPrivateMeta(R2_PUBLIC_URL, contentType, slug);
      if (!meta) {
        // Fall back to the index entry itself — index-private.json carries
        // enough meta for note generation when a separate meta.json hasn't
        // been uploaded.
        meta = post;
      }
      koMdx = (await fetchPrivateMdx(R2_PUBLIC_URL, contentType, slug, 'ko')) || '';
      if (!koMdx) {
        console.warn(`  ⚠ Skipping ${slug}: R2 ko.mdx not found at private/posts/${contentType}/${slug}/ko.mdx`);
        continue;
      }
    } else {
      // Public post: read from filesystem
      try {
        const raw = await fs.readFile(path.join(postDir, 'meta.json'), 'utf-8');
        meta = JSON.parse(raw);
      } catch (err) {
        console.warn(`  ⚠ Skipping ${slug}: meta.json read failed (${err.message})`);
        continue;
      }
      try {
        koMdx = await fs.readFile(path.join(postDir, 'ko.mdx'), 'utf-8');
      } catch { /* no ko.mdx is OK */ }
    }

    const koFm = parseFrontmatter(koMdx);
    const terryMemos = parseTerryMemo(koMdx);

    // Determine vault subfolder
    const vaultSubfolder = TYPE_TO_FOLDER[contentType] || 'From Terry/Memos';
    const notePath = path.join(VAULT_ROOT, vaultSubfolder, `${slug}.md`);

    const existingContent = await readExistingNote(notePath);
    const isTerryAuthored = contentType === 'essays' || contentType === 'memos';

    // Human-curated essays/memos: file exists and frontmatter lacks sync_hash → skip entirely
    if (isTerryAuthored && existingContent && !hasSyncHashField(existingContent)) {
      const drifts = detectHumanCuratedDrift(existingContent, meta);
      if (drifts.length > 0) {
        driftWarnings.push({ slug, drifts });
        const driftStr = drifts.map(d => `${d.field} vault=${d.vault} ≠ meta=${d.canonical}`).join(', ');
        console.warn(`  ⚠ ${slug}: human-curated drift (${driftStr}) — skipping per spec; resolve manually`);
      }
      skipped++;
      // Still collect for meta files
      slugToPostMap.push({
        slug,
        content_type: contentType,
        taxonomy_primary: meta.taxonomy_primary || post.taxonomy_primary || null,
        key_concepts: meta.key_concepts || post.key_concepts || [],
        title_ko: koFm.title || meta.source_title || slug,
      });
      continue;
    }

    // Check sync_hash for papers/notes (unchanged means skip)
    if (!isTerryAuthored) {
      const newHash = computeSyncHash(meta);
      const existingHash = extractSyncHash(existingContent);
      if (existingHash === newHash && !initMode) {
        skipped++;
        continue;
      }
    }

    // Build note
    let noteContent;
    if (contentType === 'papers') {
      noteContent = buildPaperNote(meta, koFm, terryMemos, existingContent);
    } else if (isTerryAuthored) {
      noteContent = buildCanonicalTerryNote(meta, koMdx);
    } else {
      noteContent = buildEssayNote(meta, koFm, terryMemos, existingContent);
    }

    // Collect for meta generation
    slugToPostMap.push({
      slug,
      content_type: contentType,
      taxonomy_primary: meta.taxonomy_primary || post.taxonomy_primary || null,
      key_concepts: meta.key_concepts || post.key_concepts || [],
      title_ko: koFm.title || meta.source_title || slug,
    });

    if (dryRun) {
      console.log(`  [dry-run] Would write: ${notePath}`);
      synced++;
      continue;
    }

    // Write note
    await fs.mkdir(path.dirname(notePath), { recursive: true });
    await fs.writeFile(notePath, noteContent, 'utf-8');
    console.log(`  ✅ ${slug} → ${vaultSubfolder}/`);
    synced++;
  }

  // Also collect posts that were skipped (unchanged) for meta files
  if (slugToPostMap.length < targetPosts.length) {
    for (const post of targetPosts) {
      if (slugToPostMap.some(p => p.slug === post.slug)) continue;
      slugToPostMap.push({
        slug: post.slug,
        content_type: post.content_type,
        taxonomy_primary: post.taxonomy_primary || null,
        key_concepts: post.key_concepts || [],
        title_ko: post.title_ko || post.slug,
      });
    }
  }

  // Generate Meta files (only on --init or full sync without slug filter)
  if (!slugFilter) {
    const taxonomyMd = await generateTaxonomy(slugToPostMap);
    const conceptMd = generateConceptIndex(slugToPostMap);

    if (taxonomyMd) {
      const taxPath = path.join(VAULT_ROOT, 'Ops', 'Meta', 'Taxonomy.md');
      if (dryRun) {
        console.log(`  [dry-run] Would write: ${taxPath}`);
      } else {
        await fs.mkdir(path.dirname(taxPath), { recursive: true });
        await fs.writeFile(taxPath, taxonomyMd, 'utf-8');
        console.log('  ✅ Meta/Taxonomy.md');
      }
    }

    const conceptPath = path.join(VAULT_ROOT, 'Ops', 'Meta', 'Concept Index.md');
    if (dryRun) {
      console.log(`  [dry-run] Would write: ${conceptPath}`);
    } else {
      await fs.mkdir(path.dirname(conceptPath), { recursive: true });
      await fs.writeFile(conceptPath, conceptMd, 'utf-8');
      console.log('  ✅ Meta/Concept Index.md');
    }
  }

  // Load global-index.json (maintained by generate-index.mjs, NOT regenerated here)
  const globalIndexPath = path.join(POSTS_DIR, 'global-index.json');
  let globalIndex = { next_public_id: 1, next_private_id: -1, entries: [] };
  try {
    const raw = await fs.readFile(globalIndexPath, 'utf-8');
    globalIndex = JSON.parse(raw);
    console.log(`  ✅ posts/global-index.json (${globalIndex.entries.length} entries, pub=${globalIndex.next_public_id}, priv=${globalIndex.next_private_id})`);
  } catch {
    console.log('  ⚠ posts/global-index.json not found — run generate-index.mjs first');
  }

  // Reconcile allocator invariants against actual entries, in case past
  // crashes / renumbers / manual edits left next_private_id or next_public_id
  // in a state where they could reissue existing ids.
  let allocatorReconciled = false;
  const ids = (globalIndex.entries || [])
    .map(e => (typeof e.id === 'number' ? e.id : null))
    .filter(id => id !== null);
  const negIds = ids.filter(id => id < 0);
  const posIds = ids.filter(id => id > 0);
  if (negIds.length > 0) {
    const minNeg = Math.min(...negIds);
    if (globalIndex.next_private_id > minNeg - 1) {
      console.warn(`  ⚠ allocator reconcile: next_private_id ${globalIndex.next_private_id} → ${minNeg - 1} (min existing=${minNeg})`);
      globalIndex.next_private_id = minNeg - 1;
      allocatorReconciled = true;
    }
  }
  if (posIds.length > 0) {
    const maxPos = Math.max(...posIds);
    if (globalIndex.next_public_id < maxPos + 1) {
      console.warn(`  ⚠ allocator reconcile: next_public_id ${globalIndex.next_public_id} → ${maxPos + 1} (max existing=${maxPos})`);
      globalIndex.next_public_id = maxPos + 1;
      allocatorReconciled = true;
    }
  }

  // ── Reverse scan: index unregistered Obsidian memos/drafts ──
  const scanDirs = ['From Terry/Memos', 'From Terry/Essays', 'From Terry/Drafts'];
  let newlyIndexed = 0;

  // Canonicalize stored entry.path to an absolute filesystem path for dedupe.
  // Stored formats seen in the wild:
  //   "vault/From Terry/..."                 (repo-relative, canonical going forward)
  //   "~/Codes/personal/terry-obsidian/..."  (legacy tilde-absolute)
  //   "/Users/.../vault/From Terry/..."      (absolute)
  //   "From Terry/..."                       (vault-relative, very old)
  const vaultParent = path.dirname(VAULT_ROOT);
  function resolveEntryPath(p) {
    if (!p) return null;
    if (path.isAbsolute(p)) return p;
    if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2));
    if (p.startsWith('vault/')) return path.join(vaultParent, p);
    if (p.startsWith('From Terry/') || p.startsWith('From AI/')) {
      return path.join(VAULT_ROOT, p);
    }
    return null; // posts/... and other non-vault paths cannot match vault files
  }

  for (const dir of scanDirs) {
    const dirPath = path.join(VAULT_ROOT, dir);
    let files;
    try { files = await fs.readdir(dirPath); } catch { continue; }

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      // Skip reserved raw-material naming (source files, not indexable notes)
      if (/_Source\.md$/.test(file) || /-source\.md$/.test(file)) continue;

      const filePath = path.join(dirPath, file);
      // Canonical stored format: repo-relative ("vault/From Terry/...")
      const storePath = path.relative(vaultParent, filePath);

      // Path-based dedupe: resolve each stored entry path to absolute, compare to filePath
      if (globalIndex.entries.some(e => resolveEntryPath(e.path) === filePath)) continue;

      const content = await fs.readFile(filePath, 'utf-8');

      // Check if already has a doc_id (positive or negative)
      const idMatch = content.match(/^doc_id:\s*(-?\d+)/m);
      if (idMatch && idMatch[1]) {
        const id = parseInt(idMatch[1], 10);
        if (!globalIndex.entries.find(e => e.id === id)) {
          const titleMatch = content.match(/^`#-?\d+`\s*·\s*(.+)$/m);
          const title = titleMatch ? titleMatch[1].trim() : file.replace('.md', '');
          const typeMatch = content.match(/^type:\s*(.+)$/m);
          const type = typeMatch ? typeMatch[1].trim().replace(/"/g, '') : 'memo';
          globalIndex.entries.push({
            id, slug: file.replace('.md', ''), type, visibility: 'private',
            title, path: storePath,
          });
          // Recovered id must not be reissued to a future first-time note.
          if (id < 0 && globalIndex.next_private_id > id - 1) {
            globalIndex.next_private_id = id - 1;
          }
          console.log(`  🔁 Recovered: ${file} → #${id}`);
          newlyIndexed++;
        }
        continue;
      }

      // No doc_id → assign negative (private) id
      const newId = globalIndex.next_private_id--;
      const titleMatch = content.match(/^`#`\s*·\s*(.+)$/m) || content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : file.replace('.md', '');
      const typeMatch = content.match(/^type:\s*(.+)$/m);
      const type = typeMatch ? typeMatch[1].trim().replace(/"/g, '') : 'memo';

      // Update frontmatter doc_id with negative number
      const updated = content.replace(/^doc_id:\s*$/m, `doc_id: ${newId}`);
      const titled = updated.replace(/^`#`\s*·\s*/m, `\`#${newId}\` · `);

      if (!dryRun) {
        await fs.writeFile(filePath, titled, 'utf-8');
      }

      globalIndex.entries.push({
        id: newId, slug: file.replace('.md', ''), type, visibility: 'private',
        title, path: storePath,
      });

      console.log(`  📋 Indexed: ${file} → #${newId}`);
      newlyIndexed++;
    }
  }

  // Re-write global index if new entries were found or the allocator was repaired
  if (newlyIndexed > 0 || allocatorReconciled) {
    if (!dryRun) {
      await fs.writeFile(globalIndexPath, JSON.stringify(globalIndex, null, 2) + '\n', 'utf-8');
    }
    console.log(`  📋 ${newlyIndexed} new file(s) indexed`);
  }

  console.log(`\n🏁 Done. Synced: ${synced}, Skipped (unchanged): ${skipped}, Newly indexed: ${newlyIndexed}`);

  if (driftWarnings.length > 0) {
    console.warn(`\n⚠ ${driftWarnings.length} human-curated file(s) have frontmatter drift vs. meta.json:`);
    for (const w of driftWarnings) {
      for (const d of w.drifts) {
        console.warn(`  - ${w.slug}: ${d.field} vault=${d.vault} ≠ meta=${d.canonical}`);
      }
    }
    console.warn('  Resolve by updating meta.json or the vault frontmatter so they match.');
    process.exitCode = 2;
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
