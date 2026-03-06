/**
 * Update citation counts for research posts using Semantic Scholar API.
 * Reads arXiv IDs from meta.json source_url, fetches citation counts,
 * and writes citation_count + citation_updated_at back to meta.json.
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

async function fetchCitationCount(arxivId) {
  const url = `${API_BASE}/arXiv:${arxivId}?fields=citationCount,title,year`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Semantic Scholar API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
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

    const arxivId = extractArxivId(meta.source_url);
    if (!arxivId) {
      console.log(`  SKIP ${slug}: no arXiv ID in source_url`);
      skipped++;
      continue;
    }

    console.log(`  Fetching ${slug} (arXiv:${arxivId})...`);
    try {
      const data = await fetchCitationCount(arxivId);
      if (!data) {
        console.log(`    Not found on Semantic Scholar, skipping`);
        skipped++;
        continue;
      }

      const count = data.citationCount ?? 0;
      const now = new Date().toISOString();

      console.log(`    "${data.title}" (${data.year}) — Cited ${count}`);

      meta.citation_count = count;
      meta.citation_updated_at = now;

      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf-8');
      updated++;
    } catch (err) {
      console.error(`    Error: ${err.message}`);
      skipped++;
    }

    // Rate limit: 100 requests per 5 minutes for unauthenticated
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
