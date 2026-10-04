#!/usr/bin/env node

/**
 * sync-obsidian-kg.mjs
 *
 * Phase D — KG → Obsidian visualization sync (one-way, overwrite).
 *
 * Reads `papers/*.json` + `knowledge-index.json` and writes a skinny
 * markdown file per paper into `<vault>/Papers KB/<slug>.md` with typed-edge
 * wikilinks in frontmatter so Obsidian Graph View picks them up.
 *
 * Distinct from `sync-obsidian.mjs` (full posts under Public/Papers/) — this
 * is *visualization-only*, owned by KG export, regenerated each run.
 *
 *   No LLM/chat. Pure file transformation.
 *
 * Usage:
 *   node scripts/sync-obsidian-kg.mjs [--vault=<path>] [--kb=<path>] [--dry-run]
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const args = process.argv.slice(2);
const argMap = Object.fromEntries(
  args.filter(a => a.startsWith('--') && a.includes('='))
      .map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v]; }),
);
const FLAGS = new Set(args.filter(a => a.startsWith('--') && !a.includes('=')).map(a => a.replace(/^--/, '')));

const KB_PATH = argMap.kb || process.env.RESEARCH_KB_PATH
  || path.join(os.homedir(), 'Codes', 'personal', 'terryum-ai', 'terry-papers');
const DRY_RUN = FLAGS.has('dry-run');

async function resolveVaultRoot() {
  if (argMap.vault) return argMap.vault;
  if (process.env.OBSIDIAN_VAULT_PATH) return process.env.OBSIDIAN_VAULT_PATH;
  const candidates = [
    path.join(os.homedir(), 'Codes', 'personal', 'knowledge', 'terry-obsidian', 'vault'),
    path.join(os.homedir(), 'Documents', 'Obsidian Vault'),
  ];
  for (const c of candidates) {
    try { await fs.access(c); return c; } catch {}
  }
  return candidates[0];
}

const VAULT_ROOT = await resolveVaultRoot();
const TARGET = path.join(VAULT_ROOT, 'Papers KB');

const PREDICATES = [
  'cites', 'extends', 'usesMethodIn', 'reviews', 'critiques',
  'sharesGoalWith', 'sharesTopicWith',
];

function escapeYamlString(s) {
  if (!s) return '""';
  return `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function arrayLine(key, values) {
  if (!values || values.length === 0) return `${key}: []`;
  const items = values.map(v => `"${v}"`).join(', ');
  return `${key}: [${items}]`;
}

function wikilink(slug) { return `[[${slug}]]`; }

function buildPaperMarkdown(insight, knownSlugs) {
  // Group relations by predicate; only keep targets that exist in the KG
  const relsByPred = Object.fromEntries(PREDICATES.map(p => [p, []]));
  for (const rel of (insight.relations || [])) {
    const pred = PREDICATES.includes(rel.type) ? rel.type : null;
    if (!pred) continue;
    if (!knownSlugs.has(rel.target)) continue;
    relsByPred[pred].push({ target: rel.target, strength: rel.strength });
  }

  // Frontmatter
  const frontLines = [
    `slug: ${insight.slug}`,
    `title: ${escapeYamlString(insight.source_title || insight.slug)}`,
    `node_type: paper`,
    insight.post_number != null ? `post_number: ${insight.post_number}` : null,
    insight.domain ? `domain: ${insight.domain}` : null,
    insight.taxonomy_primary ? `taxonomy_primary: ${insight.taxonomy_primary}` : null,
    insight.source_author ? `author: ${escapeYamlString(insight.source_author)}` : null,
    insight.source_date ? `published: ${escapeYamlString(insight.source_date.slice(0, 10))}` : null,
    insight.arxiv_id ? `arxiv_id: ${escapeYamlString(insight.arxiv_id)}` : null,
    insight.doi ? `doi: ${escapeYamlString(insight.doi)}` : null,
    arrayLine('key_concepts', insight.key_concepts || []),
    arrayLine('subfields', insight.subfields || []),
  ].filter(Boolean);

  for (const pred of PREDICATES) {
    frontLines.push(arrayLine(pred, relsByPred[pred].map(r => wikilink(r.target))));
  }
  frontLines.push(`tags: [paper-kb]`);

  // Body
  const lines = ['---', ...frontLines, '---', ''];
  lines.push(`# ${insight.source_title || insight.slug}`);
  lines.push('');
  if (insight.ai_summary?.one_liner) {
    lines.push(`> ${insight.ai_summary.one_liner}`);
    lines.push('');
  }
  lines.push(`**Source of truth**: \`terry-papers/posts/papers/${insight.slug}/\` — 이 파일은 KG export로 자동 생성됨. Vault 안에서 수정하면 다음 sync에 덮어써진다.`);
  lines.push('');

  // Memos
  lines.push('## Memos (Terry)');
  if (insight.terry_memos && insight.terry_memos.length > 0) {
    for (const m of insight.terry_memos) lines.push(`- ${m}`);
  } else {
    lines.push('- *(없음)*');
  }
  lines.push('');

  // Research gaps
  lines.push('## Research Gaps');
  if (insight.research_gaps && insight.research_gaps.length > 0) {
    for (const g of insight.research_gaps) {
      const concepts = (g.relates_to || []).length ? ` _(relates: ${g.relates_to.join(', ')})_` : '';
      lines.push(`- **[${g.source}]** ${g.question}${concepts}`);
    }
  } else {
    lines.push('- *(없음)*');
  }
  lines.push('');

  // Relations
  lines.push('## Relations');
  let anyRel = false;
  for (const pred of PREDICATES) {
    for (const r of relsByPred[pred]) {
      lines.push(`- ${pred} → ${wikilink(r.target)} (${r.strength})`);
      anyRel = true;
    }
  }
  if (!anyRel) lines.push('- *(없음)*');
  lines.push('');

  return lines.join('\n');
}

function buildOverview(allInsights, edges, generatedAt) {
  const inDegree = new Map();
  const outDegree = new Map();
  for (const e of edges) {
    outDegree.set(e.from, (outDegree.get(e.from) || 0) + 1);
    inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
  }
  const slugs = allInsights.map(p => p.slug);
  const isolated = slugs.filter(s => !inDegree.has(s) && !outDegree.has(s));
  const topCited = [...inDegree.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const domainCounts = new Map();
  for (const p of allInsights) {
    const d = p.domain || 'unknown';
    domainCounts.set(d, (domainCounts.get(d) || 0) + 1);
  }

  const memoCount = allInsights.filter(p => (p.terry_memos || []).length > 0).length;
  const gapCount = allInsights.filter(p => (p.research_gaps || []).length > 0).length;

  const lines = [
    '---',
    'node_type: kg-overview',
    'tags: [paper-kb]',
    '---',
    '',
    '# Knowledge Graph Overview',
    '',
    `_Generated: ${generatedAt}_`,
    '',
    '## Stats',
    `- Total papers: ${allInsights.length}`,
    `- Edges (typed, directional): ${edges.length}`,
    `- Papers with memos: ${memoCount}`,
    `- Papers with research gaps: ${gapCount}`,
    `- Isolated (no edges): ${isolated.length}`,
    '',
    '## Top-cited (highest in-degree)',
  ];
  for (const [slug, deg] of topCited) {
    lines.push(`- ${wikilink(slug)} — ${deg} inbound`);
  }
  if (topCited.length === 0) lines.push('- *(none)*');
  lines.push('');

  lines.push('## Domain breakdown');
  for (const [d, n] of [...domainCounts.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`- ${d}: ${n}`);
  }
  lines.push('');

  lines.push('## Isolated nodes');
  for (const s of isolated) lines.push(`- ${wikilink(s)}`);
  if (isolated.length === 0) lines.push('- *(none)*');
  lines.push('');

  lines.push('---');
  lines.push('Vault rules: `Papers KB/`는 KG export로 매 sync마다 덮어쓰는 read-only 영역. 편집은 `terry-papers/posts/papers/<slug>/` 본체에서.');
  return lines.join('\n');
}

async function main() {
  const ki = JSON.parse(await fs.readFile(path.join(KB_PATH, 'knowledge-index.json'), 'utf8'));
  const edges = ki.knowledge_graph?.edges || [];
  const knownSlugs = new Set((ki.paper_list || []).map(p => p.slug));

  const papersDir = path.join(KB_PATH, 'papers');
  const files = (await fs.readdir(papersDir)).filter(f => f.endsWith('.json'));
  const insights = [];
  for (const f of files) {
    insights.push(JSON.parse(await fs.readFile(path.join(papersDir, f), 'utf8')));
  }

  const generatedAt = ki.generated_at || new Date().toISOString();

  if (DRY_RUN) {
    console.log(`[dry-run] would write ${insights.length} files + _KG-overview.md to ${TARGET}`);
    console.log(`[dry-run] sample frontmatter:\n${buildPaperMarkdown(insights[0], knownSlugs).slice(0, 500)}`);
    return;
  }

  // Wipe & rebuild target folder
  await fs.rm(TARGET, { recursive: true, force: true });
  await fs.mkdir(TARGET, { recursive: true });

  for (const insight of insights) {
    const md = buildPaperMarkdown(insight, knownSlugs);
    await fs.writeFile(path.join(TARGET, `${insight.slug}.md`), md, 'utf8');
  }

  const overview = buildOverview(insights, edges, generatedAt);
  await fs.writeFile(path.join(TARGET, '_KG-overview.md'), overview, 'utf8');

  console.error(`✓ KG sync → ${TARGET} (${insights.length} papers + overview)`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
