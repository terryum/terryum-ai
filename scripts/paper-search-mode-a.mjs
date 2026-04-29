#!/usr/bin/env node

/**
 * paper-search-mode-a.mjs
 *
 * Mode A — "no-query" recommendation. Answers: "given the current graph state,
 * which candidate is the most natural one to read next?" — without requiring
 * a directional query embedding.
 *
 * 5-seed mix (weights live in config/search-weights.json `mode_a_weights`):
 *   seed_a (default 0.35) — proximity to the 3 most-recent confirmed papers
 *   seed_d (default 0.25) — rank-next's 5 non-anchor signals normalized
 *   seed_c (default 0.25) — matches an unresolved research_gap
 *   seed_e (default 0.10) — graph-frontier (multi-survey but loosely connected)
 *   seed_b (default 0.05) — nearest confirmed has a memo
 *
 *   No LLM/chat call. Embeddings not required (cache used only as a tiebreak
 *   if ever extended). Reason text is template-built.
 *
 * Usage:
 *   node scripts/paper-search-mode-a.mjs [--top-n=10] [--kb=<path>]
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadWeights } from './lib/search-weights.mjs';

const WEIGHTS = await loadWeights();
const MAW = WEIGHTS.mode_a_weights;

const args = process.argv.slice(2);
const argMap = Object.fromEntries(
  args.filter(a => a.startsWith('--') && a.includes('='))
      .map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v]; }),
);
const TOP_N = parseInt(argMap['top-n'] || '10', 10);
const KB_PATH = argMap.kb || process.env.RESEARCH_KB_PATH
  || path.join(os.homedir(), 'Codes', 'personal', 'terry-papers');

function loadJson(p) {
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function currentYear() { return new Date().getFullYear(); }

function recentConfirmedSlugs(paperList, n = 3) {
  return [...paperList]
    .filter(p => Number.isFinite(p.post_number))
    .sort((a, b) => b.post_number - a.post_number)
    .slice(0, n)
    .map(p => p.slug);
}

function seedA(cand, recentSlugs) {
  // Max sim of any nearest_confirmed that is in the recent-3 set
  const np = cand.graph_proximity?.nearest_confirmed || [];
  let best = 0;
  for (const x of np) {
    if (recentSlugs.includes(x.slug)) best = Math.max(best, x.similarity || 0);
  }
  return clamp(best, 0, 1);
}

function seedD(cand) {
  // rank-next's 5 non-anchor signals (survey/graph/gap/verify/recency),
  // normalized to 0..1 by their summed weights
  const RNW = WEIGHTS.rank_next_weights;
  const sSurvey = clamp((cand.survey_backrefs?.length || 0) / 3, 0, 1);

  let sGraph = 0;
  for (const np of (cand.graph_proximity?.nearest_confirmed || [])) {
    sGraph = Math.max(sGraph, np.similarity || 0);
  }
  sGraph = clamp(sGraph, 0, 1);

  const sGap = (cand.matches_gaps?.length || 0) > 0 ? 1.0 : 0;

  const verified = (cand.survey_backrefs || [])
    .some(b => b.verification_status === 'primary_source_verified');
  const sVerify = verified ? 1.0 : 0.5;

  const yearGap = (cand.year || 0) - (currentYear() - 3);
  const sRecency = clamp(yearGap / 3, 0, 1);

  const denom = (RNW.survey + RNW.graph + RNW.gap + RNW.verify + RNW.recency) || 1;
  const num = RNW.survey * sSurvey + RNW.graph * sGraph + RNW.gap * sGap
            + RNW.verify * sVerify + RNW.recency * sRecency;
  return clamp(num / denom, 0, 1);
}

function seedC(cand) {
  return (cand.matches_gaps?.length || 0) > 0 ? 1.0 : 0;
}

function seedE(cand) {
  // Graph-frontier: cited by ≥2 surveys but loosely connected (nearest ≤1)
  const surveys = cand.survey_backrefs?.length || 0;
  const nearest = cand.graph_proximity?.nearest_confirmed?.length || 0;
  return surveys >= 2 && nearest <= 1 ? 1.0 : 0;
}

function seedB(cand, memoSlugs) {
  const np = cand.graph_proximity?.nearest_confirmed || [];
  return np.some(x => memoSlugs.has(x.slug)) ? 1.0 : 0;
}

function buildReason(cand, parts) {
  // parts: { recentNeighbor: slug|null, surveyHits: [...], gapConcept: string|null, frontier: bool }
  const out = [];
  if (parts.recentNeighbor) out.push(`최근 ${parts.recentNeighbor}의 이웃`);
  if (parts.surveyHits.length) {
    const desc = parts.surveyHits.map(b => {
      const ch = (b.chapters_cited || []).slice(0, 3).join(',');
      return ch ? `${b.survey} ch${ch}` : b.survey;
    }).join(' / ');
    out.push(`${desc} 인용`);
  }
  if (parts.gapConcept) out.push(`${parts.gapConcept} gap 매움`);
  if (parts.frontier && out.length < 2) out.push('여러 surveys 인용된 frontier 후보');
  if ((cand.survey_backrefs || []).some(b => b.verification_status === 'primary_source_verified')) {
    out.push('fact-checked');
  }
  return out.join('; ');
}

async function main() {
  const ki = loadJson(path.join(KB_PATH, 'knowledge-index.json'));
  const ci = ki?.candidate_index;
  if (!ci || !Array.isArray(ci.candidates)) {
    console.error(`mode-a: candidate_index not found in ${KB_PATH}/knowledge-index.json — run sync-survey-candidates.mjs first`);
    process.exit(3);
  }

  const paperList = ki.paper_list || [];
  const recentSlugs = recentConfirmedSlugs(paperList, 3);
  const memoSlugs = new Set(paperList.filter(p => p.has_memo).map(p => p.slug));

  const active = ci.candidates.filter(c => !c.promoted_to_slug);

  const ranked = active.map(c => {
    const a = seedA(c, recentSlugs);
    const d = seedD(c);
    const cs = seedC(c);
    const e = seedE(c);
    const b = seedB(c, memoSlugs);
    const total = MAW.seed_a * a + MAW.seed_d * d + MAW.seed_c * cs
                + MAW.seed_e * e + MAW.seed_b * b;

    const recentNeighbor = (c.graph_proximity?.nearest_confirmed || [])
      .find(x => recentSlugs.includes(x.slug))?.slug || null;
    const gapConcept = c.matches_gaps?.[0]?.concept || null;

    return {
      canonical_id: c.canonical_id,
      title: c.title,
      year: c.year,
      venue: c.venue,
      arxiv_id: c.arxiv_id,
      doi: c.doi,
      url: c.url,
      score: Math.round(total * 1000) / 1000,
      seed_breakdown: {
        a: Math.round(a * 1000) / 1000,
        d: Math.round(d * 1000) / 1000,
        c: cs,
        e,
        b,
      },
      survey_backrefs: c.survey_backrefs,
      nearest_confirmed: c.graph_proximity?.nearest_confirmed || [],
      matches_gaps: c.matches_gaps || [],
      method_summary: c.method_summary,
      tags: c.tags || [],
      metadata_quality: c.metadata_quality || 'skeleton',
      reason: buildReason(c, {
        recentNeighbor,
        surveyHits: c.survey_backrefs || [],
        gapConcept,
        frontier: e === 1,
      }),
    };
  });

  ranked.sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, TOP_N);

  const richInTop = top.filter(c => c.metadata_quality === 'rich').length;

  process.stdout.write(JSON.stringify({
    mode: 'mode_a',
    weights: MAW,
    recent_confirmed: recentSlugs,
    total_active_candidates: active.length,
    metadata_coverage: {
      rich: ci.rich_candidates ?? null,
      skeleton: ci.skeleton_candidates ?? null,
      rich_in_top: richInTop,
      skeleton_in_top: top.length - richInTop,
    },
    top_score: top[0]?.score || 0,
    recommendations: top,
  }, null, 2));
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
