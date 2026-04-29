#!/usr/bin/env node

/**
 * export-knowledge.mjs
 * Extracts Terry's memos, research gaps, and enriched relations from posts
 * and writes them as paper-level JSON + an aggregated index into the
 * terry-papers repo (top-level `papers/` and `knowledge-index.json`).
 *
 * Usage: node scripts/export-knowledge.mjs [--out=/path/to/repo]
 *
 * Default output path resolution:
 *   1. --out=<path> CLI flag
 *   2. RESEARCH_KB_PATH env var
 *   3. ~/Codes/personal/terry-papers
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { POSTS_DIR } from './lib/paths.mjs';

const PAPERS_DIR = path.join(POSTS_DIR, 'papers');

const args = process.argv.slice(2);
const outDir = args.find(a => a.startsWith('--out='))?.split('=')[1]
  || process.env.RESEARCH_KB_PATH
  || path.join(os.homedir(), 'Codes', 'personal', 'terry-papers');

// ── Parse Terry's memo from MDX ──
function parseTerryMemo(mdxContent) {
  const memoMatch = mdxContent.match(/## Terry'?s memo\n\n([\s\S]*?)(?=\n##|\n---|\Z|$)/i);
  if (!memoMatch) return [];

  const memoBlock = memoMatch[1].trim();
  if (memoBlock === '- *(None)*' || memoBlock === '*(None)*') return [];

  const memos = [];
  for (const line of memoBlock.split('\n')) {
    const cleaned = line.replace(/^-\s*/, '').trim();
    if (cleaned && cleaned !== '*(None)*') {
      memos.push(cleaned);
    }
  }
  return memos;
}

// ── Parse limitations / research gaps from MDX ──
function parseResearchGaps(mdxContent) {
  const gaps = [];

  // Author-noted limitations
  const limMatch = mdxContent.match(/\*\*저자 언급\*\*:\s*(.*?)(?=\n-\s*🤖|\n##|\n\n##|$)/s);
  if (limMatch) {
    const text = limMatch[1].trim();
    if (text) {
      gaps.push({
        question: text,
        source: 'author',
        relates_to: [],
      });
    }
  }

  // AI analysis limitations
  const aiMatch = mdxContent.match(/🤖\s*(.*?)(?=\n##|\n\n##|$)/s);
  if (aiMatch) {
    const text = aiMatch[1].trim();
    if (text) {
      gaps.push({
        question: text,
        source: 'ai_analysis',
        relates_to: [],
      });
    }
  }

  // Also try English format
  const limMatchEn = mdxContent.match(/\*\*Author-noted\*\*:\s*(.*?)(?=\n-\s*🤖|\n##|\n\n##|$)/s);
  if (limMatchEn && gaps.length === 0) {
    const text = limMatchEn[1].trim();
    if (text) {
      gaps.push({
        question: text,
        source: 'author',
        relates_to: [],
      });
    }
  }

  return gaps;
}

// ── Extract memo topics from text ──
function extractMemoTopics(memos, keyConcepts) {
  const topics = new Set();
  const textLower = memos.join(' ').toLowerCase();

  for (const concept of keyConcepts) {
    if (textLower.includes(concept.toLowerCase().replace(/-/g, ' ')) ||
        textLower.includes(concept.toLowerCase())) {
      topics.add(concept);
    }
  }

  // Also match common terms
  const commonTerms = ['VLA', 'LLM', 'RL', 'MoE', 'CaP', 'Code-as-Policy',
    'force', 'tactile', 'manipulation', 'benchmark', 'sim-to-real',
    'teleoperation', 'imitation learning', 'reinforcement learning'];
  for (const term of commonTerms) {
    if (textLower.includes(term.toLowerCase())) {
      topics.add(term);
    }
  }

  return [...topics];
}

// ── Predicate registry (see ONTOLOGY.md) ──
// Each forward predicate has a strength tier and either an inverse predicate
// (for directional edges) or null (for symmetric edges, stored once with
// directional: false).
const PREDICATES = {
  // Foundational — academic lineage
  cites:         { strength: 'foundational', inverse: 'isCitedBy',           directional: true  },
  extends:       { strength: 'foundational', inverse: 'isExtendedBy',        directional: true  },
  usesMethodIn:  { strength: 'foundational', inverse: 'providesMethodFor',   directional: true  },
  // Direct — explicit comparison/critique/shared goal
  reviews:       { strength: 'direct',       inverse: null,                  directional: false },
  critiques:     { strength: 'direct',       inverse: 'isCritiquedBy',       directional: true  },
  sharesGoalWith:{ strength: 'direct',       inverse: null,                  directional: false },
  // Tangential — weak topical overlap
  sharesTopicWith:{ strength: 'tangential',  inverse: null,                  directional: false },
};

function assignRelationStrength(predicate) {
  return PREDICATES[predicate]?.strength || 'tangential';
}

// ── Main ──
async function main() {
  console.log('📚 Exporting knowledge base...');

  const papersOutDir = path.join(outDir, 'papers');
  await fs.mkdir(papersOutDir, { recursive: true });

  let entries;
  try {
    entries = await fs.readdir(PAPERS_DIR, { withFileTypes: true });
  } catch {
    console.error('❌ Cannot read papers directory');
    process.exit(1);
  }

  const allInsights = [];
  const memoIndex = {};    // topic → [slugs]
  const gapIndex = {};     // concept → [gaps]
  const allEdges = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const slug = entry.name;

    // Read meta.json
    let meta;
    try {
      const raw = await fs.readFile(path.join(PAPERS_DIR, slug, 'meta.json'), 'utf-8');
      meta = JSON.parse(raw);
    } catch { continue; }

    // Read ko.mdx for Terry's memo (primary)
    let koMdx = '';
    try {
      koMdx = await fs.readFile(path.join(PAPERS_DIR, slug, 'ko.mdx'), 'utf-8');
    } catch {}

    // Parse memo and gaps
    const terryMemos = parseTerryMemo(koMdx);
    const researchGaps = parseResearchGaps(koMdx);

    // Extract memo topics
    const allConcepts = [
      ...(meta.key_concepts || []),
      ...(meta.subfields || []),
      ...(meta.methodology || []),
    ];
    const memoTopics = terryMemos.length > 0
      ? extractMemoTopics(terryMemos, allConcepts)
      : [];

    // Assign gap relations
    for (const gap of researchGaps) {
      gap.relates_to = allConcepts.filter(c =>
        gap.question.toLowerCase().includes(c.toLowerCase().replace(/-/g, ' '))
      );
    }

    // Enrich relations with strength. Some legacy meta.json files use
    // `slug` instead of `target` for the edge endpoint — accept both, but
    // canonicalize to `target` in the output.
    const enrichedRelations = (meta.relations || []).map(rel => ({
      ...rel,
      target: rel.target ?? rel.slug,
      strength: assignRelationStrength(rel.type),
    }));

    // Build insight object
    const insight = {
      slug,
      post_number: meta.post_number,
      source_title: meta.source_title || null,
      arxiv_id: meta.arxiv_id || null,
      doi: meta.doi || null,
      bibtex_key: meta.bibtex_key || null,
      domain: meta.domain,
      subfields: meta.subfields || [],
      key_concepts: meta.key_concepts || [],
      methodology: meta.methodology || [],
      taxonomy_primary: meta.taxonomy_primary,
      taxonomy_secondary: meta.taxonomy_secondary || [],
      ai_summary: meta.ai_summary || null,
      terry_memos: terryMemos,
      terry_memo_topics: memoTopics,
      research_gaps: researchGaps,
      relations: enrichedRelations,
      source_author: meta.source_author || null,
      source_date: meta.source_date || null,
      published_at: meta.published_at || null,
    };

    // Write per-paper insight
    await fs.writeFile(
      path.join(papersOutDir, `${slug}.json`),
      JSON.stringify(insight, null, 2) + '\n',
      'utf-8'
    );

    allInsights.push(insight);

    // Build indices
    for (const topic of memoTopics) {
      if (!memoIndex[topic]) memoIndex[topic] = [];
      memoIndex[topic].push(slug);
    }

    for (const gap of researchGaps) {
      for (const concept of gap.relates_to) {
        if (!gapIndex[concept]) gapIndex[concept] = [];
        gapIndex[concept].push({ slug, question: gap.question, source: gap.source });
      }
    }

    for (const rel of enrichedRelations) {
      const spec = PREDICATES[rel.type];
      if (!spec) {
        console.warn(`  ⚠ ${slug}: unknown predicate "${rel.type}" → ${rel.target} (skipped, see ONTOLOGY.md)`);
        continue;
      }
      // Forward edge
      allEdges.push({
        from: slug,
        to: rel.target,
        predicate: rel.type,
        strength: rel.strength,
        directional: spec.directional,
        inverse_of: null,
      });
      // Inverse edge — only emit for directional predicates with a defined
      // inverse. Symmetric edges (reviews/sharesGoalWith/sharesTopicWith)
      // are stored once.
      if (spec.directional && spec.inverse) {
        allEdges.push({
          from: rel.target,
          to: slug,
          predicate: spec.inverse,
          strength: rel.strength,
          directional: true,
          inverse_of: rel.type,
        });
      }
    }

    const memoStatus = terryMemos.length > 0 ? `📝 ${terryMemos.length} memo(s)` : '—';
    const gapStatus = researchGaps.length > 0 ? `🔬 ${researchGaps.length} gap(s)` : '—';
    console.log(`  ${slug}: ${memoStatus}, ${gapStatus}`);
  }

  // Build knowledge index
  const knowledgeIndex = {
    generated_at: new Date().toISOString(),
    total_papers: allInsights.length,
    papers_with_memos: allInsights.filter(i => i.terry_memos.length > 0).length,
    papers_with_gaps: allInsights.filter(i => i.research_gaps.length > 0).length,

    // Topic → papers where Terry has commented
    memo_index: memoIndex,

    // Concept → research gaps
    gap_index: gapIndex,

    // Full edge list with strength + reverse
    knowledge_graph: {
      edges: allEdges,
      total_edges: allEdges.length,
    },

    // Quick lookup: all papers sorted by post_number
    paper_list: allInsights.map(i => ({
      slug: i.slug,
      post_number: i.post_number,
      domain: i.domain,
      taxonomy_primary: i.taxonomy_primary,
      key_concepts: i.key_concepts,
      one_liner: i.ai_summary?.one_liner || null,
      has_memo: i.terry_memos.length > 0,
      has_gaps: i.research_gaps.length > 0,
      memo_preview: i.terry_memos[0]?.slice(0, 100) || null,
    })).sort((a, b) => (a.post_number ?? 999) - (b.post_number ?? 999)),
  };

  // Preserve candidate_index section managed by sync-survey-candidates.mjs.
  // export-knowledge owns confirmed-paper data; candidate_index is owned by
  // the surveys sync. Reading the existing file lets the two writers coexist.
  try {
    const existing = JSON.parse(await fs.readFile(path.join(outDir, 'knowledge-index.json'), 'utf-8'));
    if (existing && existing.candidate_index) {
      knowledgeIndex.candidate_index = existing.candidate_index;
    }
  } catch {
    // file missing or unreadable — fine, candidate_index stays absent
  }

  await fs.writeFile(
    path.join(outDir, 'knowledge-index.json'),
    JSON.stringify(knowledgeIndex, null, 2) + '\n',
    'utf-8'
  );

  console.log(`\n✅ Exported ${allInsights.length} papers to ${outDir}`);
  console.log(`   📝 ${knowledgeIndex.papers_with_memos} papers with Terry's memos`);
  console.log(`   🔬 ${knowledgeIndex.papers_with_gaps} papers with research gaps`);
  console.log(`   🔗 ${allEdges.length} edges (including reverse)`);

  // Sync paper_embeddings (incremental — only stale rows are re-embedded).
  // Soft-fail: missing OPENAI_API_KEY or Supabase shouldn't block KB export.
  try {
    const { spawnSync } = await import('child_process');
    const here = path.dirname(new URL(import.meta.url).pathname);
    const r = spawnSync('node', [path.join(here, 'sync-embeddings.mjs')], {
      stdio: 'inherit',
    });
    if (r.status !== 0) {
      console.warn('⚠ sync-embeddings exited non-zero (continuing)');
    }
  } catch (err) {
    console.warn(`⚠ sync-embeddings skipped: ${err.message}`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
