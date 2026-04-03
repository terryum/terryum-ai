#!/usr/bin/env node

/**
 * sync-obsidian.mjs
 * Transforms homepage post data into Obsidian-compatible markdown notes.
 *
 * Usage:
 *   node scripts/sync-obsidian.mjs [--slug=<slug>] [--dry-run] [--vault=<path>] [--init]
 *
 * Default vault path: ~/Documents/Obsidian Vault/
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');
const CATEGORIES = ['papers', 'notes', 'tech', 'essays'];

// ── CLI args ──
const args = process.argv.slice(2);
const slugFilter = args.find(a => a.startsWith('--slug='))?.split('=')[1] || null;
const dryRun = args.includes('--dry-run');
const initMode = args.includes('--init');
const vaultArg = args.find(a => a.startsWith('--vault='))?.split('=')[1] || null;
const VAULT_ROOT = vaultArg || path.join(os.homedir(), 'Documents', 'Obsidian Vault');

// ── Vault folder structure ──
const VAULT_FOLDERS = [
  'From AI/Papers',
  'From AI/QA',
  'From AI/Insights',
  'From Terry/Posts',
  'From Terry/Memos',
  'From Terry/Drafts',
  'Meta',
  'Templates',
];

// ── content_type → vault subfolder mapping ──
const TYPE_TO_FOLDER = {
  papers: 'From AI/Papers',
  essays: 'From Terry/Posts',
  tech: 'From Terry/Posts',
  notes: 'From Terry/Posts',
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

  return [fm, '', titleLine, quoteBlock, aiSection, relSection, memoSection, tagsLine, ''].join('\n');
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

  return [fm, '', titleLine, summaryBlock, relSection, memoSection, tagsLine, ''].join('\n');
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

// ── Build global-index.json ──
async function buildGlobalIndex(posts) {
  const entries = posts.map(p => ({
    id: p.post_number,
    slug: p.slug,
    type: p.content_type === 'papers' ? 'papers'
      : p.content_type === 'essays' ? 'essays'
      : p.content_type === 'tech' ? 'tech'
      : p.content_type === 'notes' ? 'essays'
      : p.content_type,
    visibility: 'public',
    title: p.title_ko || p.slug,
    path: `posts/${p.content_type}/${p.slug}/`,
  }));

  const maxId = Math.max(...entries.map(e => e.id ?? 0), 0);

  return {
    next_id: maxId + 1,
    entries: entries.sort((a, b) => (a.id ?? 9999) - (b.id ?? 9999)),
  };
}

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

  // Load posts index
  let indexData;
  try {
    const raw = await fs.readFile(path.join(POSTS_DIR, 'index.json'), 'utf-8');
    indexData = JSON.parse(raw);
  } catch (err) {
    console.error('❌ Cannot read posts/index.json:', err.message);
    process.exit(1);
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

  for (const post of targetPosts) {
    const slug = post.slug;
    const contentType = post.content_type;
    const catDir = contentType || 'papers'; // content_type maps directly to folder name
    const postDir = path.join(POSTS_DIR, catDir, slug);

    // Read meta.json
    let meta;
    try {
      const raw = await fs.readFile(path.join(postDir, 'meta.json'), 'utf-8');
      meta = JSON.parse(raw);
    } catch (err) {
      console.warn(`  ⚠ Skipping ${slug}: meta.json read failed (${err.message})`);
      continue;
    }

    // Read ko.mdx
    let koMdx = '';
    try {
      koMdx = await fs.readFile(path.join(postDir, 'ko.mdx'), 'utf-8');
    } catch { /* no ko.mdx is OK */ }

    const koFm = parseFrontmatter(koMdx);
    const terryMemos = parseTerryMemo(koMdx);

    // Determine vault subfolder
    const vaultSubfolder = TYPE_TO_FOLDER[contentType] || 'From Terry/Posts';
    const notePath = path.join(VAULT_ROOT, vaultSubfolder, `${slug}.md`);

    // Check sync_hash
    const newHash = computeSyncHash(meta);
    const existingContent = await readExistingNote(notePath);
    const existingHash = extractSyncHash(existingContent);

    if (existingHash === newHash && !initMode) {
      skipped++;
      continue;
    }

    // Build note
    let noteContent;
    if (contentType === 'papers') {
      noteContent = buildPaperNote(meta, koFm, terryMemos, existingContent);
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
      const taxPath = path.join(VAULT_ROOT, 'Meta', 'Taxonomy.md');
      if (dryRun) {
        console.log(`  [dry-run] Would write: ${taxPath}`);
      } else {
        await fs.mkdir(path.dirname(taxPath), { recursive: true });
        await fs.writeFile(taxPath, taxonomyMd, 'utf-8');
        console.log('  ✅ Meta/Taxonomy.md');
      }
    }

    const conceptPath = path.join(VAULT_ROOT, 'Meta', 'Concept Index.md');
    if (dryRun) {
      console.log(`  [dry-run] Would write: ${conceptPath}`);
    } else {
      await fs.mkdir(path.dirname(conceptPath), { recursive: true });
      await fs.writeFile(conceptPath, conceptMd, 'utf-8');
      console.log('  ✅ Meta/Concept Index.md');
    }
  }

  // Generate global-index.json (always, from all posts)
  const globalIndex = await buildGlobalIndex(allPosts);
  const globalIndexPath = path.join(POSTS_DIR, 'global-index.json');
  if (dryRun) {
    console.log(`  [dry-run] Would write: ${globalIndexPath}`);
  } else {
    await fs.writeFile(globalIndexPath, JSON.stringify(globalIndex, null, 2) + '\n', 'utf-8');
    console.log(`  ✅ posts/global-index.json (${globalIndex.entries.length} entries, next_id=${globalIndex.next_id})`);
  }

  console.log(`\n🏁 Done. Synced: ${synced}, Skipped (unchanged): ${skipped}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
