#!/usr/bin/env node
/**
 * Phase 1 helper: scan posts/papers/<slug>/meta.json and propose
 * arxiv_id / doi / bibtex_key backfills.
 *
 * Sources of truth (in order):
 *   1. meta.source_url (if it's an arxiv.org URL → arxiv_id; if doi.org → doi)
 *   2. terry-surveys/surveys/<slug>/_research/papers.json title match
 *
 * Output: a JSON report listing per-slug suggestions. NO files are modified.
 * Apply with --apply to write the suggestions in-place.
 *
 * Usage:
 *   node scripts/backfill-paper-ids.mjs                  # dry-run, prints report
 *   node scripts/backfill-paper-ids.mjs --apply          # write changes
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const PAPERS_DIR = path.join(REPO_ROOT, 'posts', 'papers');
const SURVEYS_ROOT = path.resolve(REPO_ROOT, '..', 'terry-surveys', 'surveys');

const APPLY = process.argv.includes('--apply');

const ARXIV_URL_RE = /arxiv\.org\/abs\/([0-9]{4}\.[0-9]{4,5})(v[0-9]+)?/i;
const DOI_URL_RE = /doi\.org\/(10\.[0-9]{4,9}\/[^\s/]+)/i;
const NATURE_RE = /nature\.com\/articles\/([a-z0-9-]+)/i;
const SCIENCE_DOI_RE = /science\.org\/doi\/(?:abs\/|full\/)?(10\.[0-9]{4,9}\/[^\s/?]+)/i;

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function normalizeTitle(t) {
  return (t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function extractFromUrl(url) {
  if (!url) return {};
  const out = {};
  const ax = url.match(ARXIV_URL_RE);
  if (ax) out.arxiv_id = ax[1];
  const doi = url.match(DOI_URL_RE);
  if (doi) out.doi = doi[1];
  const sci = url.match(SCIENCE_DOI_RE);
  if (sci && !out.doi) out.doi = sci[1];
  const nat = url.match(NATURE_RE);
  if (nat && !out.doi) out.doi = `10.1038/${nat[1]}`;
  return out;
}

function loadSurveyPapers() {
  const all = [];
  if (!fs.existsSync(SURVEYS_ROOT)) return all;
  for (const surveyDir of fs.readdirSync(SURVEYS_ROOT)) {
    const papersFile = path.join(SURVEYS_ROOT, surveyDir, '_research', 'papers.json');
    if (!fs.existsSync(papersFile)) continue;
    let entries;
    try { entries = loadJson(papersFile); } catch { continue; }
    if (!Array.isArray(entries)) continue;
    for (const e of entries) {
      all.push({ ...e, _survey: surveyDir });
    }
  }
  return all;
}

function findSurveyMatch(meta, surveyPapers) {
  const titleNorm = normalizeTitle(meta.source_title || meta.title);
  if (!titleNorm) return null;
  for (const sp of surveyPapers) {
    const spTitle = normalizeTitle(sp.title);
    if (!spTitle) continue;
    if (spTitle === titleNorm) return sp;
    if (spTitle.length > 20 && titleNorm.length > 20) {
      if (spTitle.includes(titleNorm) || titleNorm.includes(spTitle)) return sp;
    }
  }
  return null;
}

function main() {
  const slugs = fs.readdirSync(PAPERS_DIR).filter((s) => {
    const meta = path.join(PAPERS_DIR, s, 'meta.json');
    return fs.existsSync(meta);
  });
  const surveyPapers = loadSurveyPapers();
  const report = [];
  let appliedCount = 0;

  for (const slug of slugs.sort()) {
    const metaPath = path.join(PAPERS_DIR, slug, 'meta.json');
    const meta = loadJson(metaPath);
    if (meta.content_type !== 'papers') continue;

    const fromUrl = extractFromUrl(meta.source_url);
    const surveyMatch = findSurveyMatch(meta, surveyPapers);

    const suggested = {
      arxiv_id: meta.arxiv_id ?? fromUrl.arxiv_id ?? surveyMatch?.arxiv_id ?? null,
      doi: meta.doi ?? fromUrl.doi ?? surveyMatch?.doi ?? null,
      bibtex_key: meta.bibtex_key ?? surveyMatch?.bibtex_key ?? null,
    };

    const changes = {};
    for (const k of ['arxiv_id', 'doi', 'bibtex_key']) {
      if (!meta[k] && suggested[k]) changes[k] = suggested[k];
    }

    const entry = {
      slug,
      source_url: meta.source_url ?? null,
      existing: {
        arxiv_id: meta.arxiv_id ?? null,
        doi: meta.doi ?? null,
        bibtex_key: meta.bibtex_key ?? null,
      },
      suggested,
      changes,
      survey_match: surveyMatch ? { survey: surveyMatch._survey, bibtex_key: surveyMatch.bibtex_key, title: surveyMatch.title } : null,
    };
    report.push(entry);

    if (APPLY && Object.keys(changes).length > 0) {
      const updated = { ...meta, ...changes };
      fs.writeFileSync(metaPath, JSON.stringify(updated, null, 2) + '\n', 'utf8');
      appliedCount += 1;
    }
  }

  console.log(JSON.stringify({
    mode: APPLY ? 'apply' : 'dry-run',
    total_papers: report.length,
    with_arxiv: report.filter((r) => r.suggested.arxiv_id).length,
    with_doi: report.filter((r) => r.suggested.doi).length,
    with_bibtex: report.filter((r) => r.suggested.bibtex_key).length,
    no_canonical: report.filter((r) => !r.suggested.arxiv_id && !r.suggested.doi && !r.suggested.bibtex_key).length,
    survey_matched: report.filter((r) => r.survey_match).length,
    applied: appliedCount,
    entries: report,
  }, null, 2));
}

main();
