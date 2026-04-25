#!/usr/bin/env node

/**
 * paper-search-internal.mjs
 *
 * GraphRAG-lite step 1: anchor lookup + graph traversal over the internal KG.
 *
 *   query → OpenAI embedding (q_vec)
 *        → Supabase search_papers_vector RPC (top-K anchors)
 *        → BFS depth=2 over knowledge-index.json edges
 *        → ranked internal recommendations with rationale paths
 *
 * Usage:
 *   node scripts/paper-search-internal.mjs --query="<question>"
 *   node scripts/paper-search-internal.mjs --query-file=path/to/q.txt
 *   echo "<question>" | node scripts/paper-search-internal.mjs
 *
 *   --top-k=3        anchor count (default 3)
 *   --depth=2        BFS depth (default 2)
 *   --top-n=10       internal recommendations to return (default 10)
 *   --json           emit raw JSON (default: human-readable + JSON suffix)
 *
 * Output (stdout): JSON document with { query, anchors, recommendations,
 *   neighborhood, q_embedding }. q_embedding is included so downstream
 *   external-scoring step doesn't re-embed the query.
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { loadEnv } from './lib/env.mjs';
import { getSupabase } from './lib/supabase.mjs';

await loadEnv();

const KB_PATH = process.env.RESEARCH_KB_PATH
  || path.join(os.homedir(), 'Codes', 'personal', 'terry-papers');

const args = process.argv.slice(2);
const queryArg = args.find(a => a.startsWith('--query='))?.split('=').slice(1).join('=');
const queryFile = args.find(a => a.startsWith('--query-file='))?.split('=')[1];
const topK = Number(args.find(a => a.startsWith('--top-k='))?.split('=')[1] || 3);
const depth = Number(args.find(a => a.startsWith('--depth='))?.split('=')[1] || 2);
const topN = Number(args.find(a => a.startsWith('--top-n='))?.split('=')[1] || 10);
const jsonOnly = args.includes('--json');

// Edge weights for traversal scoring (from ONTOLOGY.md strength tiers).
const EDGE_WEIGHT = { foundational: 1.0, direct: 0.6, tangential: 0.3 };
// Combined node score: α·anchor_sim + β·edge_path_weight + γ·memo_bonus.
const ALPHA = 0.5;
const BETA = 0.4;
const GAMMA = 0.1;

async function readQuery() {
  if (queryArg) return queryArg;
  if (queryFile) return (await fs.readFile(queryFile, 'utf-8')).trim();
  // stdin
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data.trim();
}

async function embedQuery(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data[0].embedding;
}

/** Anchor lookup via Supabase RPC. Falls back to client-side cosine if the
 *  RPC isn't installed yet (so the skill works before migration 004 lands). */
async function findAnchors(qEmbedding, supabase) {
  // Try RPC first
  const { data: rpcData, error: rpcErr } = await supabase.rpc('search_papers_vector', {
    query_embedding: qEmbedding,
    match_count: topK,
  });
  if (!rpcErr && rpcData) {
    return { anchors: rpcData, fallback: false };
  }

  // Fallback: pull all papers + embeddings, score in memory.
  // For ≤500 papers this is < 5MB transfer and milliseconds of math.
  const { data, error } = await supabase
    .from('papers')
    .select('slug,title_ko,title_en,domain,taxonomy_primary,key_concepts,embedding')
    .not('embedding', 'is', null);
  if (error) throw new Error(`Supabase fetch failed: ${error.message}`);

  function cosine(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
  }

  const scored = data.map(row => {
    const emb = typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding;
    return { ...row, similarity: cosine(qEmbedding, emb) };
  });
  scored.sort((a, b) => b.similarity - a.similarity);
  return {
    anchors: scored.slice(0, topK).map(({ embedding, ...rest }) => rest),
    fallback: true,
  };
}

/** Build adjacency map from knowledge-index.json edges. */
function buildAdjacency(edges) {
  const adj = new Map(); // slug → [{neighbor, predicate, strength, directional}]
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from).push({
      neighbor: e.to,
      predicate: e.predicate,
      strength: e.strength,
      directional: e.directional,
    });
  }
  return adj;
}

/** BFS depth-limited from each anchor; record best path to each reached node. */
function traverse(anchorSlugs, adj, paperList) {
  const paperBySlug = new Map(paperList.map(p => [p.slug, p]));
  // For each reached node: best path (highest path_weight).
  const best = new Map();

  for (const anchor of anchorSlugs) {
    if (!paperBySlug.has(anchor)) continue;
    const queue = [{ slug: anchor, depth: 0, pathWeight: 1.0, path: [{ slug: anchor }] }];
    const visited = new Map();
    visited.set(anchor, 1.0);

    while (queue.length > 0) {
      const node = queue.shift();
      if (node.depth >= depth) continue;
      const neighbors = adj.get(node.slug) || [];
      for (const n of neighbors) {
        const w = EDGE_WEIGHT[n.strength] || 0.3;
        const newWeight = node.pathWeight * w;
        const existing = visited.get(n.neighbor);
        if (existing !== undefined && existing >= newWeight) continue;
        visited.set(n.neighbor, newWeight);
        const newPath = [
          ...node.path,
          { predicate: n.predicate, strength: n.strength, slug: n.neighbor },
        ];
        const reached = best.get(n.neighbor);
        if (!reached || reached.pathWeight < newWeight) {
          best.set(n.neighbor, {
            slug: n.neighbor,
            anchor,
            pathWeight: newWeight,
            path: newPath,
            hops: node.depth + 1,
          });
        }
        queue.push({ slug: n.neighbor, depth: node.depth + 1, pathWeight: newWeight, path: newPath });
      }
    }
  }
  return best;
}

async function main() {
  const query = await readQuery();
  if (!query) {
    console.error('Empty query.');
    process.exit(2);
  }

  const qEmbedding = await embedQuery(query);
  const supabase = getSupabase();
  const { anchors, fallback } = await findAnchors(qEmbedding, supabase);

  // Load KG
  const kgPath = path.join(KB_PATH, 'knowledge-index.json');
  const kg = JSON.parse(await fs.readFile(kgPath, 'utf-8'));
  const adj = buildAdjacency(kg.knowledge_graph.edges);

  const anchorSlugs = anchors.map(a => a.slug);
  const reached = traverse(anchorSlugs, adj, kg.paper_list);

  // Score reached nodes: combine pathWeight (β) + anchor_sim (α) + memo_bonus (γ).
  // For anchor_sim of a non-anchor node, we re-use anchor's similarity as a
  // proxy (the anchor's similarity to the query × path decay).
  const anchorSim = new Map(anchors.map(a => [a.slug, a.similarity]));
  const paperBySlug = new Map(kg.paper_list.map(p => [p.slug, p]));

  // Anchors themselves are also recommendations (depth 0).
  const candidates = [];
  for (const a of anchors) {
    const p = paperBySlug.get(a.slug);
    candidates.push({
      slug: a.slug,
      anchor: a.slug,
      similarity: a.similarity,
      pathWeight: 1.0,
      hops: 0,
      path: [{ slug: a.slug }],
      hasMemo: p?.has_memo || false,
      hasGaps: p?.has_gaps || false,
      one_liner: p?.one_liner,
      key_concepts: p?.key_concepts,
      domain: p?.domain,
      taxonomy_primary: p?.taxonomy_primary,
    });
  }

  for (const node of reached.values()) {
    if (anchorSim.has(node.slug)) continue; // anchor already added
    const p = paperBySlug.get(node.slug);
    if (!p) continue;
    candidates.push({
      slug: node.slug,
      anchor: node.anchor,
      similarity: anchorSim.get(node.anchor) ?? 0,
      pathWeight: node.pathWeight,
      hops: node.hops,
      path: node.path,
      hasMemo: p.has_memo || false,
      hasGaps: p.has_gaps || false,
      one_liner: p.one_liner,
      key_concepts: p.key_concepts,
      domain: p.domain,
      taxonomy_primary: p.taxonomy_primary,
    });
  }

  for (const c of candidates) {
    c.score = ALPHA * c.similarity + BETA * c.pathWeight + GAMMA * (c.hasMemo ? 1 : 0);
  }
  candidates.sort((a, b) => b.score - a.score);
  const recommendations = candidates.slice(0, topN);

  const output = {
    query,
    fallback_used: fallback,
    weights: { alpha: ALPHA, beta: BETA, gamma: GAMMA, edge_weight: EDGE_WEIGHT },
    anchors,
    recommendations,
    neighborhood_slugs: [...new Set(candidates.map(c => c.slug))],
    q_embedding: qEmbedding,
  };

  if (jsonOnly) {
    process.stdout.write(JSON.stringify(output));
    return;
  }

  // Human-readable summary then JSON suffix
  console.error(`\n📚 Query: ${query}`);
  console.error(`\n🎯 Anchors (top-${topK}):`);
  for (const a of anchors) {
    console.error(`  ${a.slug} (sim=${a.similarity.toFixed(3)}) — ${a.title_en || a.title_ko || ''}`);
  }
  console.error(`\n🔗 Internal recommendations (top-${topN}):`);
  for (const r of recommendations) {
    const pathStr = r.path.map(p => p.predicate ? `--${p.predicate}--> ${p.slug}` : p.slug).join(' ');
    const tags = [r.hasMemo ? '📝memo' : null, r.hasGaps ? '🔬gap' : null].filter(Boolean).join(' ');
    console.error(`  [${r.score.toFixed(3)}] ${r.slug} ${tags}`);
    console.error(`         path: ${pathStr}`);
    if (r.one_liner) console.error(`         "${r.one_liner.slice(0, 110)}…"`);
  }
  if (fallback) {
    console.error('\n⚠ Used client-side cosine fallback (search_papers_vector RPC not installed).');
  }
  process.stdout.write('\n' + JSON.stringify(output));
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
