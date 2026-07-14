#!/usr/bin/env node

/**
 * Return a compact KG candidate set for a new paper instead of loading the
 * full knowledge-index.json into an agent context.
 *
 * Usage:
 *   node scripts/paper-kg-context.mjs --query="verification reward model" --arxiv-id=2607.05391
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const value = (name) => args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const query = value('query') || args.find((arg) => !arg.startsWith('--'));
const arxivId = value('arxiv-id')?.replace(/v\d+$/, '');
const limit = Math.max(1, Math.min(30, Number(value('limit') || 12)));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const kgRoot = process.env.TERRY_PAPERS_PATH || path.join(os.homedir(), 'Codes', 'personal', 'terry-papers');

if (!query) {
  console.error('Usage: node scripts/paper-kg-context.mjs --query=<title/concepts> [--arxiv-id=<id>] [--limit=12]');
  process.exit(2);
}

const stop = new Set(['about', 'after', 'again', 'against', 'among', 'based', 'from', 'into', 'large', 'model', 'paper', 'through', 'using', 'with']);
const tokens = (text) => new Set(String(text || '')
  .toLowerCase()
  .replace(/[^a-z0-9가-힣]+/g, ' ')
  .split(/\s+/)
  .filter((token) => token.length > 2 && !stop.has(token)));

const queryTokens = tokens(query);
const index = JSON.parse(await fs.readFile(path.join(kgRoot, 'knowledge-index.json'), 'utf8'));
const globalIndex = JSON.parse(await fs.readFile(path.join(root, 'posts', 'global-index.json'), 'utf8'));
const papers = Array.isArray(index.paper_list) ? index.paper_list : [];

function score(paper) {
  const fields = [
    paper.slug,
    paper.domain,
    paper.taxonomy_primary,
    ...(paper.key_concepts || []),
    paper.one_liner,
  ];
  const candidateTokens = tokens(fields.join(' '));
  let overlap = 0;
  for (const token of queryTokens) if (candidateTokens.has(token)) overlap += 1;
  return overlap / Math.max(1, Math.sqrt(queryTokens.size * candidateTokens.size));
}

const candidates = papers
  .map((paper) => ({ ...paper, score: Number(score(paper).toFixed(4)) }))
  .filter((paper) => paper.score > 0)
  .sort((a, b) => b.score - a.score || (b.post_number || 0) - (a.post_number || 0))
  .slice(0, limit)
  .map(({ slug, post_number, taxonomy_primary, key_concepts, one_liner, score }) => ({
    slug, post_number, taxonomy_primary, key_concepts, one_liner, score,
  }));

let duplicate = null;
if (arxivId) {
  const postDirs = await fs.readdir(path.join(root, 'posts', 'papers'), { withFileTypes: true });
  for (const entry of postDirs) {
    if (!entry.isDirectory()) continue;
    try {
      const meta = JSON.parse(await fs.readFile(path.join(root, 'posts', 'papers', entry.name, 'meta.json'), 'utf8'));
      if (meta.arxiv_id?.replace(/v\d+$/, '') === arxivId) {
        duplicate = { slug: meta.slug || entry.name, post_number: meta.post_number, arxiv_id: meta.arxiv_id };
        break;
      }
    } catch {}
  }
}

console.log(JSON.stringify({
  query,
  arxiv_id: arxivId || null,
  duplicate,
  next_public_id: globalIndex.next_public_id,
  allowed_predicates: ['cites', 'extends', 'usesMethodIn', 'reviews', 'critiques', 'sharesGoalWith', 'sharesTopicWith'],
  candidates,
}, null, 2));
