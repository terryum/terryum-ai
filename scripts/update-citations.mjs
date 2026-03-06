/**
 * Update citation counts for research posts.
 * Priority:
 *   1. meta.google_scholar_url → scrape "Cited by N" from Google Scholar HTML
 *   2. Fallback: Semantic Scholar API (via arXiv ID in source_url)
 *
 * Usage: node scripts/update-citations.mjs
 */

import fs from 'fs/promises';
import path from 'path';

const RESEARCH_DIR = path.join(process.cwd(), 'posts', 'research');
const API_BASE = 'https://api.semanticscholar.org/graph/v1/paper';

function extractArxivId(url) {
  if (!url) return null;
  const match = url.match(/arxiv\.org\/abs\/(\d+\.\d+)/);
  return match ? match[1] : null;
}

async function fetchCitationFromGoogleScholar(scholarUrl) {
  try {
    const res = await fetch(scholarUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/Cited by ([\d,]+)/);
    if (!match) return null;
    return parseInt(match[1].replace(/,/g, ''), 10);
  } catch {
    return null;
  }
}

async function fetchCitationFromSemanticScholar(arxivId) {
  const url = `${API_BASE}/arXiv:${arxivId}?fields=citationCount,title,year`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Semantic Scholar API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const entries = await fs.readdir(RESEARCH_DIR, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  let updated = 0;
  let skipped = 0;

  for (const slug of dirs) {
    const metaPath = path.join(RESEARCH_DIR, slug, 'meta.json');
    let meta;
    try {
      const raw = await fs.readFile(metaPath, 'utf-8');
      meta = JSON.parse(raw);
    } catch {
      console.log(`  SKIP ${slug}: no meta.json`);
      skipped++;
      continue;
    }

    let count = null;
    let source = null;

    if (meta.google_scholar_url) {
      console.log(`  Fetching ${slug} from Google Scholar...`);
      count = await fetchCitationFromGoogleScholar(meta.google_scholar_url);
      if (count != null) {
        source = 'Google Scholar';
      } else {
        console.log(`    Google Scholar failed, falling back to Semantic Scholar...`);
      }
      // Delay after Google Scholar request to avoid rate limiting
      await sleep(2000 + Math.random() * 1000);
    }

    if (count == null) {
      const arxivId = extractArxivId(meta.source_url);
      if (!arxivId) {
        console.log(`  SKIP ${slug}: no arXiv ID in source_url`);
        skipped++;
        continue;
      }
      console.log(`  Fetching ${slug} from Semantic Scholar (arXiv:${arxivId})...`);
      try {
        const data = await fetchCitationFromSemanticScholar(arxivId);
        if (!data) {
          console.log(`    Not found on Semantic Scholar, skipping`);
          skipped++;
          continue;
        }
        count = data.citationCount ?? 0;
        source = `Semantic Scholar ("${data.title}", ${data.year})`;
      } catch (err) {
        console.error(`    Error: ${err.message}`);
        skipped++;
        continue;
      }
      await sleep(1000);
    }

    const now = new Date().toISOString();
    console.log(`    → ${count} citations [${source}]`);

    meta.citation_count = count;
    meta.citation_updated_at = now;

    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf-8');
    updated++;
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
