#!/usr/bin/env node

/**
 * paper-search-external-search.mjs
 *
 * GraphRAG-lite external orchestrator. Runs arXiv + Semantic Scholar in
 * parallel, dedups by arXiv ID / DOI / normalized title, drops candidates
 * already in the internal KB, and emits the JSON array that
 * paper-search-score-external.mjs consumes via stdin.
 *
 *   No LLM/chat call. Embeddings are added later by score-external.
 *
 * Usage:
 *   node scripts/paper-search-external-search.mjs --query="<text>"
 *   node scripts/paper-search-external-search.mjs --concepts="a,b,c"
 *
 *   --max-per-source=20    cap per source (default 20)
 *   --kb=<path>            terry-papers root (default: $RESEARCH_KB_PATH or ~/Codes/personal/terry-papers)
 *   --no-exclude-internal  keep candidates that match an internal slug
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const args = process.argv.slice(2);
const argMap = Object.fromEntries(
  args.filter(a => a.startsWith('--') && a.includes('='))
      .map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v]; }),
);
const FLAGS = new Set(args.filter(a => a.startsWith('--') && !a.includes('=')).map(a => a.replace(/^--/, '')));

const QUERY = argMap.query;
const CONCEPTS = argMap.concepts;
const MAX_PER_SOURCE = parseInt(argMap['max-per-source'] || '20', 10);
const KB_PATH = argMap.kb || process.env.RESEARCH_KB_PATH
  || path.join(os.homedir(), 'Codes', 'personal', 'terry-papers');
const EXCLUDE_INTERNAL = !FLAGS.has('no-exclude-internal');

if (!QUERY && !CONCEPTS) {
  console.error('paper-search-external-search: provide --query="..." or --concepts="a,b,c"');
  process.exit(2);
}

const searchTerm = QUERY
  || CONCEPTS.split(',').map(s => s.trim()).filter(Boolean).join(' ');

function loadJson(p) {
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function normTitle(t) {
  return (t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function decodeXmlEntities(s) {
  return (s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function fetchArxiv(term, max) {
  const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(term)}`
            + `&max_results=${max}&sortBy=submittedDate&sortOrder=descending`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`arXiv ${res.status}`);
  const xml = await res.text();
  const entries = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = entryRe.exec(xml)) !== null) {
    const body = m[1];
    const get = (re) => { const x = body.match(re); return x ? decodeXmlEntities(x[1].trim()) : ''; };
    const idRaw = get(/<id>([^<]+)<\/id>/);
    const arxivId = idRaw.replace(/^https?:\/\/arxiv\.org\/abs\//, '').replace(/v\d+$/, '');
    const title = get(/<title>([\s\S]*?)<\/title>/).replace(/\s+/g, ' ');
    const summary = get(/<summary>([\s\S]*?)<\/summary>/).replace(/\s+/g, ' ');
    const published = get(/<published>([^<]+)<\/published>/);
    const year = published ? parseInt(published.slice(0, 4), 10) : null;
    const authors = [];
    const authorRe = /<author>\s*<name>([^<]+)<\/name>/g;
    let a;
    while ((a = authorRe.exec(body)) !== null) authors.push(decodeXmlEntities(a[1].trim()));
    entries.push({
      id: `arxiv:${arxivId}`,
      arxiv_id: arxivId,
      title,
      abstract: summary,
      authors,
      year,
      url: `https://arxiv.org/abs/${arxivId}`,
      ext_references: [],
      ext_cited_by: [],
      source: 'arxiv',
    });
  }
  return entries;
}

async function fetchSemanticScholar(term, max) {
  const fields = [
    'title',
    'abstract',
    'authors',
    'year',
    'venue',
    'publicationVenue',
    'citationCount',
    'influentialCitationCount',
    'externalIds',
    'references.externalIds',
    'citations.externalIds',
  ].join(',');
  const url = `https://api.semanticscholar.org/graph/v1/paper/search`
            + `?query=${encodeURIComponent(term)}&limit=${max}`
            + `&fields=${fields}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Semantic Scholar ${res.status}`);
  const json = await res.json();
  const out = [];
  for (const p of (json.data || [])) {
    const arxivId = p.externalIds?.ArXiv || null;
    const doi = p.externalIds?.DOI || null;
    const refs = (p.references || [])
      .map(r => r.externalIds?.ArXiv ? `arxiv:${r.externalIds.ArXiv}`
              : r.externalIds?.DOI ? `doi:${r.externalIds.DOI}` : null)
      .filter(Boolean);
    const cits = (p.citations || [])
      .map(c => c.externalIds?.ArXiv ? `arxiv:${c.externalIds.ArXiv}`
              : c.externalIds?.DOI ? `doi:${c.externalIds.DOI}` : null)
      .filter(Boolean);
    out.push({
      id: arxivId ? `arxiv:${arxivId}` : doi ? `doi:${doi}` : `s2:${p.paperId}`,
      arxiv_id: arxivId,
      doi,
      title: p.title || '',
      abstract: p.abstract || '',
      authors: (p.authors || []).map(a => a.name).filter(Boolean),
      year: p.year || null,
      venue: p.venue || p.publicationVenue?.name || '',
      citationCount: p.citationCount ?? null,
      influentialCitationCount: p.influentialCitationCount ?? null,
      url: arxivId
        ? `https://arxiv.org/abs/${arxivId}`
        : doi ? `https://doi.org/${doi}`
        : `https://www.semanticscholar.org/paper/${p.paperId}`,
      ext_references: refs,
      ext_cited_by: cits,
      source: 's2',
    });
  }
  return out;
}

function dedup(entries) {
  // Merge by arxiv_id → doi → normalized title. Prefer the entry with more
  // refs/cited_by; combine ext_references / ext_cited_by from both.
  const byKey = new Map();
  for (const e of entries) {
    const keys = [];
    if (e.arxiv_id) keys.push(`arxiv:${e.arxiv_id}`);
    if (e.doi) keys.push(`doi:${e.doi.toLowerCase()}`);
    keys.push(`title:${normTitle(e.title)}`);
    let merged = null;
    for (const k of keys) {
      if (byKey.has(k)) { merged = byKey.get(k); break; }
    }
    if (merged) {
      merged.ext_references = [...new Set([...merged.ext_references, ...e.ext_references])];
      merged.ext_cited_by = [...new Set([...merged.ext_cited_by, ...e.ext_cited_by])];
      merged.source = merged.source === e.source ? merged.source : 'both';
      if (!merged.abstract && e.abstract) merged.abstract = e.abstract;
      if (!merged.year && e.year) merged.year = e.year;
      if (!merged.venue && e.venue) merged.venue = e.venue;
      merged.citationCount = Math.max(merged.citationCount ?? 0, e.citationCount ?? 0) || null;
      merged.influentialCitationCount = Math.max(
        merged.influentialCitationCount ?? 0,
        e.influentialCitationCount ?? 0,
      ) || null;
      for (const k of keys) byKey.set(k, merged);
    } else {
      for (const k of keys) byKey.set(k, e);
    }
  }
  // unique entries by reference identity
  return [...new Set(byKey.values())];
}

function filterInternal(entries, kbPath) {
  const idx = loadJson(path.join(kbPath, 'posts', 'index.json')) || {};
  const slugs = new Set();
  // posts/index.json layout: { papers: [...], essays: [...], notes: [...] } or array
  const collect = (v) => {
    if (!v) return;
    if (Array.isArray(v)) v.forEach(collect);
    else if (typeof v === 'object') {
      if (v.slug) slugs.add(v.slug);
      for (const x of Object.values(v)) collect(x);
    }
  };
  collect(idx);

  // Loose match: arXiv YYMM prefix + title token overlap >= 50%
  return entries.filter(e => {
    if (!e.arxiv_id) return true;
    const yymm = e.arxiv_id.slice(0, 4);
    const titleTokens = new Set(normTitle(e.title).split(' ').filter(t => t.length >= 4));
    if (titleTokens.size === 0) return true;
    for (const slug of slugs) {
      if (!slug.startsWith(yymm + '-')) continue;
      const slugTokens = new Set(slug.split('-').slice(1).filter(t => t.length >= 4));
      let inter = 0;
      for (const t of titleTokens) if (slugTokens.has(t)) inter++;
      if (inter / titleTokens.size >= 0.5) return false;
    }
    return true;
  });
}

async function main() {
  const results = await Promise.allSettled([
    fetchArxiv(searchTerm, MAX_PER_SOURCE),
    fetchSemanticScholar(searchTerm, MAX_PER_SOURCE),
  ]);

  const all = [];
  if (results[0].status === 'fulfilled') all.push(...results[0].value);
  else console.error(`arXiv fetch failed: ${results[0].reason?.message || results[0].reason}`);
  if (results[1].status === 'fulfilled') all.push(...results[1].value);
  else console.error(`Semantic Scholar fetch failed: ${results[1].reason?.message || results[1].reason}`);

  if (all.length === 0) {
    console.error('Both sources failed or returned no results.');
    process.stdout.write('[]');
    return;
  }

  let merged = dedup(all);
  if (EXCLUDE_INTERNAL) merged = filterInternal(merged, KB_PATH);

  process.stdout.write(JSON.stringify(merged, null, 2));
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
