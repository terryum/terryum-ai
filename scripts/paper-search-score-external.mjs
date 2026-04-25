#!/usr/bin/env node

/**
 * paper-search-score-external.mjs
 *
 * GraphRAG-lite step 2: score external candidates by *graph alignment*, not
 * just topic similarity. The principle from the user's spec:
 *
 *   "단순 주제 매칭이 아니라, 새 논문이 우리가 묻는 주제에 대해
 *    얼마나 그래프상으로 align이 잘 맞느냐"
 *
 * Score = w1·anchor_sim + w2·citation_overlap + w3·concept_jaccard + w4·gap_completion
 *   - anchor_sim:        max cosine sim from candidate's abstract embedding to any anchor.
 *   - citation_overlap:  Jaccard between candidate's Semantic-Scholar 1-hop
 *                        citations/references and the neighborhood slugs.
 *   - concept_jaccard:   Jaccard between candidate's claimed concepts (extracted
 *                        from abstract by simple keyword overlap with neighborhood
 *                        key_concepts) and neighborhood key_concepts.
 *   - gap_completion:    bonus if the candidate's abstract mentions terms that
 *                        match unresolved research_gaps in the neighborhood.
 *
 * Usage:
 *   cat candidates.json | node scripts/paper-search-score-external.mjs --internal=internal.json
 *
 * Input shape (stdin, JSON):
 *   [
 *     { "id": "arxiv:2511.99999", "title": "...", "abstract": "...",
 *       "authors": ["..."], "year": 2025, "url": "...",
 *       "semantic_scholar_id": "...optional...",
 *       "ext_references": [...optional list of arXiv IDs or DOIs...],
 *       "ext_cited_by":   [...optional...] }
 *   ]
 *
 *   --internal=path        path to JSON output of paper-search-internal.mjs
 *                          (anchors, recommendations, q_embedding, neighborhood_slugs)
 *   --weights=0.4,0.3,0.2,0.1   override w1..w4 (must sum ~1.0)
 *
 * Output (stdout): array of candidates with .alignment_score and breakdown,
 *   sorted descending.
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { loadEnv } from './lib/env.mjs';

await loadEnv();

const KB_PATH = process.env.RESEARCH_KB_PATH
  || path.join(os.homedir(), 'Codes', 'personal', 'terry-papers');

const args = process.argv.slice(2);
const internalArg = args.find(a => a.startsWith('--internal='))?.split('=')[1];
const weightsArg = args.find(a => a.startsWith('--weights='))?.split('=')[1];

if (!internalArg) {
  console.error('Missing --internal=<path-to-internal.json>');
  process.exit(2);
}

const [W1, W2, W3, W4] = weightsArg
  ? weightsArg.split(',').map(Number)
  : [0.4, 0.3, 0.2, 0.1];

async function readStdinJson() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return JSON.parse(data);
}

async function embedBatch(texts) {
  const apiKey = process.env.OPENAI_API_KEY;
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: texts }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data.map(d => d.embedding);
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
}

function jaccard(setA, setB) {
  const a = new Set(setA), b = new Set(setB);
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

async function loadAnchorEmbeddings(anchorSlugs) {
  // Reuse fixtures from terry-papers KB (papers/<slug>.json) — but those don't
  // hold raw vectors. So embed anchor's title+one_liner here.
  const out = [];
  for (const slug of anchorSlugs) {
    try {
      const raw = await fs.readFile(path.join(KB_PATH, 'papers', `${slug}.json`), 'utf-8');
      const insight = JSON.parse(raw);
      const text = [
        insight.source_title || '',
        insight.ai_summary?.one_liner || '',
        insight.ai_summary?.problem || '',
        (insight.key_concepts || []).join(', '),
      ].filter(Boolean).join('\n');
      out.push({ slug, text });
    } catch { /* skip */ }
  }
  const embeddings = await embedBatch(out.map(o => o.text));
  return out.map((o, i) => ({ slug: o.slug, embedding: embeddings[i] }));
}

function extractConceptHits(abstract, conceptVocab) {
  const lower = abstract.toLowerCase();
  const hits = [];
  for (const c of conceptVocab) {
    const needle = c.toLowerCase().replace(/-/g, ' ');
    if (lower.includes(needle) || lower.includes(c.toLowerCase())) {
      hits.push(c);
    }
  }
  return hits;
}

function gapCompletionScore(abstract, gaps) {
  // gaps: [{ slug, question, source }]. Score = fraction of gap questions
  // whose distinctive nouns appear in the candidate abstract.
  if (!gaps || gaps.length === 0) return 0;
  const lower = abstract.toLowerCase();
  let hits = 0;
  for (const g of gaps) {
    const tokens = (g.question || '')
      .split(/[\s,.()\[\]'"·—:;|]+/)
      .filter(t => t.length >= 4 && /[a-zA-Z]/.test(t));
    // require ≥2 tokens overlap to count as "this gap is addressed"
    let count = 0;
    for (const t of tokens) {
      if (lower.includes(t.toLowerCase())) { count++; if (count >= 2) break; }
    }
    if (count >= 2) hits++;
  }
  return hits / gaps.length;
}

async function main() {
  const internal = JSON.parse(await fs.readFile(internalArg, 'utf-8'));
  const candidates = await readStdinJson();
  if (!Array.isArray(candidates) || candidates.length === 0) {
    console.error('No candidates on stdin.');
    process.exit(0);
  }

  // Build neighborhood from internal recommendations
  const neighborhood = internal.neighborhood_slugs || [];
  const kg = JSON.parse(await fs.readFile(path.join(KB_PATH, 'knowledge-index.json'), 'utf-8'));
  const paperBySlug = new Map(kg.paper_list.map(p => [p.slug, p]));

  // Concept vocabulary = union of key_concepts across neighborhood
  const conceptSet = new Set();
  const neighborhoodGaps = [];
  for (const slug of neighborhood) {
    const p = paperBySlug.get(slug);
    if (!p) continue;
    for (const c of (p.key_concepts || [])) conceptSet.add(c);
    // Pull gaps from per-paper insight
    try {
      const insight = JSON.parse(await fs.readFile(path.join(KB_PATH, 'papers', `${slug}.json`), 'utf-8'));
      for (const g of (insight.research_gaps || [])) {
        neighborhoodGaps.push({ slug, ...g });
      }
    } catch { /* skip */ }
  }
  const conceptVocab = [...conceptSet];

  // Embed anchors + each candidate's abstract
  const anchorEmb = await loadAnchorEmbeddings(internal.anchors.map(a => a.slug));
  const candEmb = await embedBatch(
    candidates.map(c => `${c.title || ''}\n${c.abstract || ''}`)
  );

  const scored = candidates.map((c, i) => {
    const cVec = candEmb[i];
    const anchorSim = Math.max(...anchorEmb.map(a => cosine(cVec, a.embedding)));

    // Citation overlap: candidate's external refs/cited_by that map back to
    // neighborhood slugs by arXiv id substring match (loose but good enough
    // when slugs already contain YYMM-prefix from arXiv id year/month).
    const extLinks = new Set([
      ...(c.ext_references || []),
      ...(c.ext_cited_by || []),
    ].map(s => String(s).toLowerCase()));
    let citationHits = 0;
    for (const slug of neighborhood) {
      const p = paperBySlug.get(slug);
      if (!p) continue;
      // Try matching slug prefix (YYMM) and key_concepts presence; cheap heuristic.
      for (const link of extLinks) {
        if (link.includes(slug.split('-')[0])) { citationHits++; break; }
      }
    }
    const citationOverlap = neighborhood.length === 0 ? 0
      : citationHits / Math.max(1, neighborhood.length);

    // Concept jaccard
    const conceptHits = extractConceptHits(c.abstract || '', conceptVocab);
    const conceptJac = jaccard(conceptHits, conceptVocab);

    // Gap completion bonus
    const gapScore = gapCompletionScore(c.abstract || '', neighborhoodGaps);

    const alignment = W1 * anchorSim + W2 * citationOverlap + W3 * conceptJac + W4 * gapScore;
    return {
      ...c,
      alignment_score: alignment,
      breakdown: {
        anchor_sim: Number(anchorSim.toFixed(4)),
        citation_overlap: Number(citationOverlap.toFixed(4)),
        concept_jaccard: Number(conceptJac.toFixed(4)),
        gap_completion: Number(gapScore.toFixed(4)),
      },
      matched_concepts: conceptHits,
    };
  });

  scored.sort((a, b) => b.alignment_score - a.alignment_score);
  process.stdout.write(JSON.stringify(scored, null, 2));
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
