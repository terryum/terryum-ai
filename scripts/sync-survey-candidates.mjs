#!/usr/bin/env node
/**
 * sync-survey-candidates.mjs
 *
 * Lifts the cross-survey reference index (terry-surveys/bibtex/refs_index.json)
 * into a candidate node pool inside terry-papers/knowledge-index.json
 * (candidate_index section). Each candidate is keyed by canonical_id
 * (arxiv: > doi: > bib: > title:) so the same paper appearing across multiple
 * surveys collapses to one entry whose `survey_backrefs` lists all locations.
 *
 * Augmented with:
 *   - bibtex/references.bib (master) → bibtex_key, venue, url
 *   - surveys/<slug>/_research/papers.json → method_summary, limitations, tags
 *     (only newer surveys built with /survey --orchestrate have this)
 *   - surveys/<slug>/_refs_extracted.json → verification_status, factcheck_notes
 *     (when present)
 *
 * Confirmed papers (terry-papers/papers/<slug>.json) sharing a canonical_id
 * with a candidate are stamped via `promoted_to_slug`.
 *
 * Usage:
 *   node scripts/sync-survey-candidates.mjs
 *   node scripts/sync-survey-candidates.mjs --out=/path/to/terry-papers
 *   node scripts/sync-survey-candidates.mjs --surveys=/path/to/terry-surveys
 *   node scripts/sync-survey-candidates.mjs --with-embeddings   (Phase 3)
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadEnv } from './lib/env.mjs';

await loadEnv();

const args = process.argv.slice(2);
const argMap = Object.fromEntries(args.filter(a => a.startsWith('--') && a.includes('=')).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v];
}));
const FLAGS = new Set(args.filter(a => a.startsWith('--') && !a.includes('=')).map(a => a.replace(/^--/, '')));

const OUT_DIR = argMap.out || process.env.RESEARCH_KB_PATH || path.join(os.homedir(), 'Codes', 'personal', 'terry-papers');
const SURVEYS_REPO = argMap.surveys || path.join(os.homedir(), 'Codes', 'personal', 'terry-surveys');
const SURVEYS_ROOT = path.join(SURVEYS_REPO, 'surveys');
const REFS_INDEX_PATH = path.join(SURVEYS_REPO, 'bibtex', 'refs_index.json');
const BIBTEX_PATH = path.join(SURVEYS_REPO, 'bibtex', 'references.bib');
const WITH_EMBEDDINGS = FLAGS.has('with-embeddings');

function loadJson(p) {
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function normalizeArxiv(id) {
  if (!id) return null;
  return String(id).toLowerCase().replace(/^arxiv:/, '').replace(/v[0-9]+$/, '').trim();
}
function normalizeDoi(id) {
  if (!id) return null;
  return String(id).toLowerCase().replace(/^doi:/, '').replace(/^https?:\/\/(dx\.)?doi\.org\//, '').trim();
}
function normalizeTitle(t) {
  return (t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function canonicalIdFromIds(ids, title, bibtex_key) {
  const ax = (ids?.arxiv || []).map(normalizeArxiv).filter(Boolean)[0];
  if (ax) return { canonical_id: `arxiv:${ax}`, id_scheme: 'arxiv', arxiv_id: ax };
  const doi = (ids?.doi || []).map(normalizeDoi).filter(Boolean)[0];
  if (doi) return { canonical_id: `doi:${doi}`, id_scheme: 'doi', doi };
  const nat = (ids?.nature || []).map(s => String(s).toLowerCase()).filter(Boolean)[0];
  if (nat) {
    const doiFromNat = nat.startsWith('10.') ? nat : `10.1038/${nat}`;
    return { canonical_id: `doi:${doiFromNat}`, id_scheme: 'doi', doi: doiFromNat };
  }
  if (bibtex_key) return { canonical_id: `bib:${bibtex_key}`, id_scheme: 'bibtex', bibtex_key };
  const t = normalizeTitle(title);
  if (t) return { canonical_id: `title:${t}`, id_scheme: 'title' };
  return null;
}

function jaccard(a, b) {
  const sa = new Set((a || []).map(x => String(x).toLowerCase()));
  const sb = new Set((b || []).map(x => String(x).toLowerCase()));
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter += 1;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

function loadConfirmedPapers(outDir) {
  const dir = path.join(outDir, 'papers');
  const map = new Map();
  if (!fs.existsSync(dir)) return map;
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const j = loadJson(path.join(dir, f));
    if (!j) continue;
    map.set(j.slug, j);
  }
  return map;
}

function buildConfirmedIdIndex(confirmedMap) {
  const idx = new Map();
  for (const [slug, p] of confirmedMap.entries()) {
    if (p.arxiv_id) idx.set(`arxiv:${normalizeArxiv(p.arxiv_id)}`, slug);
    if (p.doi) idx.set(`doi:${normalizeDoi(p.doi)}`, slug);
    if (p.bibtex_key) idx.set(`bib:${p.bibtex_key}`, slug);
    const t = normalizeTitle(p.source_title);
    if (t) idx.set(`title:${t}`, slug);
  }
  return idx;
}

// Light-weight bibtex parser: extracts key, title, year, journal/venue, url
// for each @type{key, ...} entry. Sufficient for our augmentation needs.
function parseBibtex(bibtexText) {
  const entries = [];
  const re = /@(\w+)\s*\{\s*([^,]+)\s*,([\s\S]*?)\n\}/g;
  let m;
  while ((m = re.exec(bibtexText)) !== null) {
    const [, , key, body] = m;
    const fields = {};
    const fieldRe = /(\w+)\s*=\s*[{"]([\s\S]*?)["}]\s*,?\s*\n/g;
    let fm;
    while ((fm = fieldRe.exec(body + '\n')) !== null) {
      fields[fm[1].toLowerCase()] = fm[2].replace(/\s+/g, ' ').trim();
    }
    entries.push({ key: key.trim(), ...fields });
  }
  return entries;
}

function buildBibtexLookup(entries) {
  // by normalized title, key, and extracted arxiv/doi
  const byTitle = new Map();
  const byKey = new Map();
  const byArxiv = new Map();
  const byDoi = new Map();
  for (const e of entries) {
    const tn = normalizeTitle(e.title);
    if (tn && !byTitle.has(tn)) byTitle.set(tn, e);
    if (e.key) byKey.set(e.key, e);
    const url = e.url || '';
    const ax = url.match(/arxiv\.org\/abs\/([0-9]{4}\.[0-9]{4,5})/i);
    if (ax) byArxiv.set(ax[1], e);
    const doi = url.match(/doi\.org\/(10\.[0-9]{4,9}\/[^\s/?]+)/i);
    if (doi) byDoi.set(doi[1].toLowerCase(), e);
  }
  return { byTitle, byKey, byArxiv, byDoi };
}

function loadResearchPapersIndex(surveysRoot) {
  // Map: bibtex_key → research entry (rich method_summary, tags, limitations)
  const byKey = new Map();
  const byTitle = new Map();
  if (!fs.existsSync(surveysRoot)) return { byKey, byTitle };
  for (const dir of fs.readdirSync(surveysRoot)) {
    const f = path.join(surveysRoot, dir, '_research', 'papers.json');
    const j = loadJson(f);
    if (!Array.isArray(j)) continue;
    for (const p of j) {
      const enriched = { ...p, _survey: dir };
      if (p.bibtex_key) byKey.set(p.bibtex_key, enriched);
      const tn = normalizeTitle(p.title);
      if (tn) byTitle.set(tn, enriched);
    }
  }
  return { byKey, byTitle };
}

function loadVerificationByBibtex(surveysRoot) {
  // Map: survey → bibtex_key → { verification_status, factcheck_notes, ch_set }
  const out = new Map();
  if (!fs.existsSync(surveysRoot)) return out;
  for (const dir of fs.readdirSync(surveysRoot)) {
    const f = path.join(surveysRoot, dir, '_refs_extracted.json');
    const j = loadJson(f);
    if (!Array.isArray(j)) continue;
    const m = new Map();
    for (const r of j) {
      if (!r.bibtex_key) continue;
      const cur = m.get(r.bibtex_key) || { verification_status: null, factcheck_notes: null, ch_set: new Set() };
      if (r.verification_status && (cur.verification_status == null || r.verification_status === 'primary_source_verified')) {
        cur.verification_status = r.verification_status;
      }
      if (r.factcheck_notes && !cur.factcheck_notes) cur.factcheck_notes = r.factcheck_notes;
      if (r.ch != null) cur.ch_set.add(typeof r.ch === 'string' ? parseInt(r.ch, 10) : r.ch);
      m.set(r.bibtex_key, cur);
    }
    out.set(dir, m);
  }
  return out;
}

function buildGraphProximity(candidate, confirmedMap) {
  const candTokens = (candidate.tags || []).slice(0, 12);
  if (candTokens.length === 0) return { nearest_confirmed: [], topic_concepts: [] };
  const ranked = [];
  for (const [slug, p] of confirmedMap.entries()) {
    const concepts = [
      ...(p.key_concepts || []),
      ...(p.methodology || []),
      ...(p.subfields || []),
    ];
    const sim = jaccard(candTokens, concepts);
    if (sim > 0) ranked.push({ slug, similarity: Math.round(sim * 100) / 100, reason: 'concept_overlap' });
  }
  ranked.sort((a, b) => b.similarity - a.similarity);
  return {
    nearest_confirmed: ranked.slice(0, 3),
    topic_concepts: candTokens,
  };
}

function buildGapMatches(candidate, gapIndex) {
  const matches = [];
  if (!gapIndex) return matches;
  const candText = [
    ...(candidate.tags || []),
    candidate.title || '',
    candidate.method_summary || '',
  ].join(' ').toLowerCase();
  for (const [concept, gaps] of Object.entries(gapIndex)) {
    const c = String(concept).toLowerCase();
    if (!c || c.length < 3) continue;
    if (candText.includes(c)) {
      for (const g of gaps.slice(0, 2)) matches.push({ concept, gap_slug: g.slug });
    }
  }
  const seen = new Set();
  return matches.filter(m => {
    const k = `${m.concept}|${m.gap_slug}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 5);
}

async function maybeSyncEmbeddings(candidates, outDir) {
  if (!WITH_EMBEDDINGS) return { skipped: true };
  const cacheDir = path.join(outDir, '.cache');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  const cachePath = path.join(cacheDir, 'candidates-embeddings.json');
  const cache = loadJson(cachePath) || { generated_at: null, model: 'text-embedding-3-small', embeddings: {} };
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('  ⚠ OPENAI_API_KEY not set — skipping embedding generation');
    return { skipped: true };
  }
  const todo = candidates.filter(c => !cache.embeddings[c.canonical_id]);
  if (todo.length === 0) {
    console.log(`  ✓ embeddings up-to-date (${Object.keys(cache.embeddings).length} cached)`);
    return { generated: 0, total: Object.keys(cache.embeddings).length };
  }
  console.log(`  ⋯ generating embeddings for ${todo.length} new candidates...`);
  const BATCH = 50;
  let generated = 0;
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    const inputs = batch.map(c => [
      c.title || '',
      c.method_summary || '',
      (c.tags || []).join(' '),
      c.venue ? `Venue: ${c.venue}` : '',
    ].filter(Boolean).join('\n\n').slice(0, 8000));
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: inputs }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenAI embeddings failed: ${res.status} ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    for (let j = 0; j < batch.length; j += 1) {
      cache.embeddings[batch[j].canonical_id] = data.data[j].embedding;
      generated += 1;
    }
    process.stdout.write(`    batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(todo.length / BATCH)} done\r`);
  }
  cache.generated_at = new Date().toISOString();
  fs.writeFileSync(cachePath, JSON.stringify(cache) + '\n', 'utf8');
  console.log('');
  return { generated, total: Object.keys(cache.embeddings).length };
}

async function main() {
  console.log(`📚 Surveys repo: ${SURVEYS_REPO}`);
  console.log(`🎯 Out: ${OUT_DIR}/knowledge-index.json`);

  const refsIndex = loadJson(REFS_INDEX_PATH);
  if (!refsIndex || !refsIndex.papers) {
    console.error(`refs_index.json not found at ${REFS_INDEX_PATH}`);
    process.exit(1);
  }
  const refsPapers = refsIndex.papers; // titleKey → entry
  console.log(`✓ Loaded refs_index: ${Object.keys(refsPapers).length} unique papers across ${refsIndex.total_refs} references`);

  const bibtexEntries = fs.existsSync(BIBTEX_PATH) ? parseBibtex(fs.readFileSync(BIBTEX_PATH, 'utf8')) : [];
  const bibLookup = buildBibtexLookup(bibtexEntries);
  console.log(`✓ Parsed ${bibtexEntries.length} bibtex entries`);

  const research = loadResearchPapersIndex(SURVEYS_ROOT);
  console.log(`✓ Loaded _research/papers.json shards: ${research.byKey.size} keyed entries`);

  const verifyMap = loadVerificationByBibtex(SURVEYS_ROOT);

  const confirmedMap = loadConfirmedPapers(OUT_DIR);
  const confirmedIdx = buildConfirmedIdIndex(confirmedMap);
  console.log(`✓ Loaded ${confirmedMap.size} confirmed papers (${confirmedIdx.size} canonical IDs)`);

  const knowledgeIndex = loadJson(path.join(OUT_DIR, 'knowledge-index.json')) || {};
  const gapIndex = knowledgeIndex.gap_index || {};

  const now = new Date().toISOString();
  const candidatesMap = new Map();
  const bySurvey = {};

  for (const [titleKey, entry] of Object.entries(refsPapers)) {
    // Resolve bibtex_key by matching against bibtex master
    const tn = normalizeTitle(entry.title);
    const bibByTitle = bibLookup.byTitle.get(tn);
    let bibtex_key = bibByTitle?.key || null;

    // Fallback: lookup by arxiv/doi from refs entry
    if (!bibtex_key) {
      const ax = (entry.ids?.arxiv || []).map(normalizeArxiv).filter(Boolean)[0];
      if (ax && bibLookup.byArxiv.has(ax)) bibtex_key = bibLookup.byArxiv.get(ax).key;
    }
    if (!bibtex_key) {
      const doi = (entry.ids?.doi || []).map(normalizeDoi).filter(Boolean)[0];
      if (doi && bibLookup.byDoi.has(doi)) bibtex_key = bibLookup.byDoi.get(doi).key;
    }

    const idObj = canonicalIdFromIds(entry.ids, entry.title, bibtex_key);
    if (!idObj) continue;

    // Pull augmentation from _research/papers.json (richer data)
    const richByKey = bibtex_key ? research.byKey.get(bibtex_key) : null;
    const richByTitle = research.byTitle.get(tn);
    const rich = richByKey || richByTitle || null;

    // Pull venue/journal from bibtex
    const venue = rich?.venue || bibByTitle?.journal || null;
    const url = rich?.url || bibByTitle?.url || null;

    // Build survey_backrefs from refs_index locations + verify_map
    const surveyBackrefs = [];
    const groupedBySurvey = new Map();
    for (const loc of (entry.locations || [])) {
      const k = loc.survey;
      if (!groupedBySurvey.has(k)) groupedBySurvey.set(k, new Set());
      const ch = parseInt(loc.chapter, 10);
      if (!Number.isNaN(ch)) groupedBySurvey.get(k).add(ch);
    }
    for (const [survey, chs] of groupedBySurvey.entries()) {
      const verify = bibtex_key ? verifyMap.get(survey)?.get(bibtex_key) : null;
      const chList = [...chs].sort((a, b) => a - b);
      surveyBackrefs.push({
        survey,
        chapters_cited: chList,
        ch: chList[0] ?? null,
        chapter_hint: rich?._survey === survey ? (rich.chapter_hint || null) : null,
        verification_status: verify?.verification_status || null,
        factcheck_notes: verify?.factcheck_notes || null,
        bibtex_key: bibtex_key,
      });
      bySurvey[survey] = (bySurvey[survey] || 0) + 1;
    }

    const bibByKey = bibtex_key ? bibLookup.byKey.get(bibtex_key) : null;
    const titleFallback = rich?.title || entry.title || bibByKey?.title || '';

    const newCand = {
      canonical_id: idObj.canonical_id,
      id_scheme: idObj.id_scheme,
      title: titleFallback,
      authors: rich?.authors || [],
      first_author: entry.first_author || null,
      year: entry.year ? parseInt(entry.year, 10) : (rich?.year || null),
      venue: venue || null,
      arxiv_id: idObj.arxiv_id || (rich ? normalizeArxiv(rich.arxiv_id) : null),
      doi: idObj.doi || (rich ? normalizeDoi(rich.doi) : null),
      bibtex_key,
      url: url || null,
      method_summary: rich?.method_summary || null,
      limitations: rich?.limitations || [],
      tags: rich?.tags || entry.keywords || [],
      group: rich?.group || null,
      survey_backrefs: surveyBackrefs,
      graph_proximity: null,
      matches_gaps: [],
      promoted_to_slug: null,
      first_seen_at: now,
      last_seen_at: now,
    };

    const existing = candidatesMap.get(idObj.canonical_id);
    if (!existing) {
      candidatesMap.set(idObj.canonical_id, newCand);
    } else {
      // merge: prefer non-empty title, accumulate survey_backrefs, union tags
      if (!existing.title && newCand.title) existing.title = newCand.title;
      if (!existing.method_summary && newCand.method_summary) existing.method_summary = newCand.method_summary;
      if ((existing.limitations || []).length === 0 && newCand.limitations.length) existing.limitations = newCand.limitations;
      if ((existing.authors || []).length === 0 && newCand.authors.length) existing.authors = newCand.authors;
      if (!existing.year && newCand.year) existing.year = newCand.year;
      if (!existing.venue && newCand.venue) existing.venue = newCand.venue;
      if (!existing.url && newCand.url) existing.url = newCand.url;
      if (!existing.arxiv_id && newCand.arxiv_id) existing.arxiv_id = newCand.arxiv_id;
      if (!existing.doi && newCand.doi) existing.doi = newCand.doi;
      if (!existing.bibtex_key && newCand.bibtex_key) existing.bibtex_key = newCand.bibtex_key;
      existing.tags = Array.from(new Set([...(existing.tags || []), ...(newCand.tags || [])]));
      // merge survey_backrefs by survey, unioning chapters_cited
      const refsBySurvey = new Map(existing.survey_backrefs.map(r => [r.survey, r]));
      for (const r of newCand.survey_backrefs) {
        const cur = refsBySurvey.get(r.survey);
        if (!cur) {
          refsBySurvey.set(r.survey, r);
        } else {
          const chs = new Set([...(cur.chapters_cited || []), ...(r.chapters_cited || [])]);
          cur.chapters_cited = [...chs].sort((a, b) => a - b);
          cur.ch = cur.chapters_cited[0] ?? cur.ch;
          if (!cur.verification_status && r.verification_status) cur.verification_status = r.verification_status;
          if (!cur.factcheck_notes && r.factcheck_notes) cur.factcheck_notes = r.factcheck_notes;
          if (!cur.bibtex_key && r.bibtex_key) cur.bibtex_key = r.bibtex_key;
        }
      }
      existing.survey_backrefs = [...refsBySurvey.values()];
    }
  }

  // Promotion stamp
  for (const cand of candidatesMap.values()) {
    const altKeys = [];
    if (cand.arxiv_id) altKeys.push(`arxiv:${cand.arxiv_id}`);
    if (cand.doi) altKeys.push(`doi:${cand.doi}`);
    if (cand.bibtex_key) altKeys.push(`bib:${cand.bibtex_key}`);
    const t = normalizeTitle(cand.title);
    if (t) altKeys.push(`title:${t}`);
    for (const k of altKeys) {
      const slug = confirmedIdx.get(k);
      if (slug) { cand.promoted_to_slug = slug; break; }
    }
  }

  // graph_proximity + gap matches
  for (const cand of candidatesMap.values()) {
    cand.graph_proximity = buildGraphProximity(cand, confirmedMap);
    cand.matches_gaps = buildGapMatches(cand, gapIndex);
  }

  // Preserve first_seen_at from existing candidate_index
  const existingCands = knowledgeIndex.candidate_index?.candidates || [];
  const existingByCanon = new Map(existingCands.map(c => [c.canonical_id, c]));
  for (const cand of candidatesMap.values()) {
    const old = existingByCanon.get(cand.canonical_id);
    if (old?.first_seen_at) cand.first_seen_at = old.first_seen_at;
  }

  const candidates = [...candidatesMap.values()].sort((a, b) => {
    const ay = a.year || 0, by = b.year || 0;
    if (by !== ay) return by - ay;
    return (a.title || '').localeCompare(b.title || '');
  });

  const promoted = candidates.filter(c => c.promoted_to_slug).length;
  const active = candidates.length - promoted;

  const embedStat = await maybeSyncEmbeddings(candidates, OUT_DIR);

  knowledgeIndex.candidate_index = {
    generated_at: now,
    total_candidates: candidates.length,
    active_candidates: active,
    promoted_candidates: promoted,
    by_survey: bySurvey,
    candidates,
  };

  const outPath = path.join(OUT_DIR, 'knowledge-index.json');
  fs.writeFileSync(outPath, JSON.stringify(knowledgeIndex, null, 2) + '\n', 'utf8');
  console.log(`\n✅ Wrote candidate_index: ${candidates.length} candidates (${active} active, ${promoted} promoted)`);
  console.log(`   📚 by survey: ${JSON.stringify(bySurvey)}`);
  if (embedStat.skipped) {
    console.log(`   ⏭  embeddings skipped (use --with-embeddings to generate)`);
  } else {
    console.log(`   🔢 embeddings: ${embedStat.generated || 0} new, ${embedStat.total} total cached`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
