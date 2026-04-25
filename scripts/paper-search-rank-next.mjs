#!/usr/bin/env node
/**
 * paper-search-rank-next.mjs
 *
 * "What paper should I add next?" — ranks the surveys candidate pool against
 * a topic query using a 6-term score combining anchor similarity, survey
 * citation frequency, graph proximity to confirmed nodes, gap closure,
 * verification trust, and recency.
 *
 *   stdin: paper-search-internal.mjs JSON output (must include q_embedding)
 *          OR a JSON object with at least { q_embedding, anchors }
 *   args:  --top-n=10        candidates to return (default 10)
 *          --restrict        candidate-only (skip external fallback signal)
 *          --kb=<path>       terry-papers root (default: $RESEARCH_KB_PATH or
 *                            ~/Codes/personal/terry-papers)
 *
 *   stdout: JSON { query, mode, candidates: [...] }
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const args = process.argv.slice(2);
const argMap = Object.fromEntries(args.filter(a => a.startsWith('--') && a.includes('=')).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v];
}));
const FLAGS = new Set(args.filter(a => a.startsWith('--') && !a.includes('=')).map(a => a.replace(/^--/, '')));

const TOP_N = parseInt(argMap['top-n'] || '10', 10);
const RESTRICTED = FLAGS.has('restrict');
const KB_PATH = argMap.kb || process.env.RESEARCH_KB_PATH || path.join(os.homedir(), 'Codes', 'personal', 'terry-papers');

// Topic relevance dominates ("what about X?"); other signals are tiebreakers.
const W = { anchor: 0.60, survey: 0.12, graph: 0.10, gap: 0.08, verify: 0.05, recency: 0.05 };
// If anchor sim is below this floor, the candidate is excluded — prevents
// high-citation papers from drowning out off-topic queries with their
// non-anchor signals.
const ANCHOR_FLOOR = 0.20;

function loadJson(p) {
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
}

async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data.trim();
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function currentYear() { return new Date().getFullYear(); }

function score(cand, qEmbedding, embCache, anchorSlugs) {
  const emb = embCache[cand.canonical_id];
  const sAnchor = emb ? Math.max(0, cosine(qEmbedding, emb)) : 0;

  const sSurvey = clamp((cand.survey_backrefs?.length || 0) / 3, 0, 1);

  let sGraph = 0;
  for (const np of (cand.graph_proximity?.nearest_confirmed || [])) {
    const boost = anchorSlugs.includes(np.slug) ? 1.4 : 1.0;
    sGraph = Math.max(sGraph, np.similarity * boost);
  }
  sGraph = clamp(sGraph, 0, 1);

  const sGap = (cand.matches_gaps?.length || 0) > 0 ? 1.0 : 0;

  const verified = (cand.survey_backrefs || []).some(b => b.verification_status === 'primary_source_verified');
  const sVerify = verified ? 1.0 : 0.5;

  const yearGap = (cand.year || 0) - (currentYear() - 3);
  const sRecency = clamp(yearGap / 3, 0, 1);

  const total = W.anchor * sAnchor + W.survey * sSurvey + W.graph * sGraph
              + W.gap * sGap + W.verify * sVerify + W.recency * sRecency;

  return {
    total: Math.round(total * 1000) / 1000,
    breakdown: {
      anchor: Math.round(sAnchor * 1000) / 1000,
      survey: Math.round(sSurvey * 1000) / 1000,
      graph: Math.round(sGraph * 1000) / 1000,
      gap: sGap,
      verify: sVerify,
      recency: Math.round(sRecency * 1000) / 1000,
    },
  };
}

function buildReason(cand) {
  const parts = [];
  if (cand.survey_backrefs?.length) {
    const surveyList = cand.survey_backrefs.map(b => {
      const chs = (b.chapters_cited || []).slice(0, 3).join(',');
      return chs ? `${b.survey} ch${chs}` : b.survey;
    }).join(' / ');
    parts.push(`cited in ${surveyList}`);
  }
  const top = (cand.graph_proximity?.nearest_confirmed || [])[0];
  if (top) parts.push(`near ${top.slug} (sim=${top.similarity})`);
  if (cand.matches_gaps?.length) {
    const g = cand.matches_gaps[0];
    parts.push(`fills gap on ${g.concept}`);
  }
  if ((cand.survey_backrefs || []).some(b => b.verification_status === 'primary_source_verified')) {
    parts.push('fact-checked');
  }
  return parts.join('; ');
}

async function main() {
  const stdinRaw = await readStdin();
  if (!stdinRaw) {
    console.error('rank-next: empty stdin (expects paper-search-internal.mjs JSON output)');
    process.exit(2);
  }
  let input;
  try { input = JSON.parse(stdinRaw); } catch (e) {
    console.error('rank-next: invalid JSON on stdin');
    process.exit(2);
  }
  if (!input.q_embedding || !Array.isArray(input.q_embedding)) {
    console.error('rank-next: missing q_embedding in input');
    process.exit(2);
  }

  const ki = loadJson(path.join(KB_PATH, 'knowledge-index.json'));
  const ci = ki?.candidate_index;
  if (!ci || !Array.isArray(ci.candidates)) {
    console.error(`rank-next: candidate_index not found in ${KB_PATH}/knowledge-index.json — run sync-survey-candidates.mjs first`);
    process.exit(3);
  }

  const cache = loadJson(path.join(KB_PATH, '.cache', 'candidates-embeddings.json'));
  const embCache = cache?.embeddings || {};
  const embCount = Object.keys(embCache).length;

  const active = ci.candidates.filter(c => !c.promoted_to_slug);
  const anchorSlugs = (input.anchors || []).map(a => a.slug);

  const ranked = active
    .map(c => ({ c, s: score(c, input.q_embedding, embCache, anchorSlugs) }))
    .filter(({ s }) => s.breakdown.anchor >= ANCHOR_FLOOR)
    .map(({ c, s }) => ({
      canonical_id: c.canonical_id,
      title: c.title,
      year: c.year,
      venue: c.venue,
      arxiv_id: c.arxiv_id,
      doi: c.doi,
      url: c.url,
      bibtex_key: c.bibtex_key,
      score: s.total,
      breakdown: s.breakdown,
      survey_backrefs: c.survey_backrefs,
      nearest_confirmed: c.graph_proximity?.nearest_confirmed || [],
      matches_gaps: c.matches_gaps || [],
      method_summary: c.method_summary,
      tags: c.tags || [],
      metadata_quality: c.metadata_quality || 'skeleton',
      bibtex_keys: c.bibtex_keys || [],
      aliases: c.aliases || [],
      reason: buildReason(c),
    }));
  ranked.sort((a, b) => b.score - a.score);

  const top = ranked.slice(0, TOP_N);
  const topScore = top[0]?.score || 0;
  const topAnchor = top[0]?.breakdown?.anchor || 0;
  // Suggest external fallback when (a) no candidate clears the anchor floor, or
  // (b) the top candidate is only a weak topic match (anchor sim < 0.45),
  // i.e. the surveys pool doesn't really cover this query.
  const weakMatch = ranked.length === 0 || topAnchor < 0.45;

  const richInTop = top.filter(c => c.metadata_quality === 'rich').length;
  const skeletonInTop = top.length - richInTop;

  process.stdout.write(JSON.stringify({
    query: input.query,
    mode: RESTRICTED ? 'next-restricted' : 'next',
    weights: W,
    embedding_coverage: { cached: embCount, total: ci.candidates.length },
    metadata_coverage: {
      rich: ci.rich_candidates ?? null,
      skeleton: ci.skeleton_candidates ?? null,
      rich_in_top: richInTop,
      skeleton_in_top: skeletonInTop,
    },
    total_active_candidates: active.length,
    suggest_external_fallback: !RESTRICTED && weakMatch,
    top_score: topScore,
    top_anchor_similarity: topAnchor,
    candidates: top,
  }, null, 2));
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
