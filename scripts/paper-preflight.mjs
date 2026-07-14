#!/usr/bin/env node

/**
 * Deterministic preflight for a Papers post. It catches public-ID/arXiv
 * collisions, schema errors, missing assets/captions, invalid KG relations,
 * and incomplete localized frontmatter before index generation or deploy.
 *
 * Usage:
 *   node scripts/paper-preflight.mjs <slug>
 *   node scripts/paper-preflight.mjs <slug> --strict
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const Ajv = require('ajv');
const matter = require('gray-matter');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const kgRoot = process.env.TERRY_PAPERS_PATH || path.join(os.homedir(), 'Codes', 'personal', 'terry-papers');
const args = process.argv.slice(2);
const slug = args.find((arg) => !arg.startsWith('--')) || args.find((arg) => arg.startsWith('--slug='))?.slice(7);
const strict = args.includes('--strict');

if (!slug) {
  console.error('Usage: node scripts/paper-preflight.mjs <slug> [--strict]');
  process.exit(2);
}

const postDir = path.join(root, 'posts', 'papers', slug);
const errors = [];
const warnings = [];
const canonicalArxivId = (id) => String(id || '').replace(/v\d+$/, '');
const add = (condition, message, options = {}) => {
  if (condition) return;
  (options.warning && !strict ? warnings : errors).push(message);
};

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function exists(file) {
  try { await fs.access(file); return true; } catch { return false; }
}

let meta;
try {
  meta = await readJson(path.join(postDir, 'meta.json'));
} catch (error) {
  console.error(`Cannot read ${path.join(postDir, 'meta.json')}: ${error.message}`);
  process.exit(1);
}

const schema = await readJson(path.join(kgRoot, 'schemas', 'paper-meta.schema.json'));
const ajv = new Ajv({ allErrors: true, jsonPointers: true, unknownFormats: 'ignore' });
const valid = ajv.validate(schema, meta);
add(valid, `schema: ${ajv.errorsText(ajv.errors)}`);
add(meta.slug === slug, `meta.slug ${JSON.stringify(meta.slug)} does not match directory ${JSON.stringify(slug)}`);

const globalIndex = await readJson(path.join(root, 'posts', 'global-index.json'));
const indexed = globalIndex.entries.filter((entry) => entry.slug === slug);
add(indexed.length <= 1, `global index contains ${indexed.length} entries for ${slug}`);
if (indexed.length === 0) {
  add(meta.post_number === globalIndex.next_public_id,
    `new post_number ${meta.post_number} must equal global next_public_id ${globalIndex.next_public_id}`);
} else {
  add(indexed[0].id === meta.post_number,
    `indexed ID ${indexed[0].id} differs from meta.post_number ${meta.post_number}`);
}
const idOwner = globalIndex.entries.find((entry) => entry.id === meta.post_number && entry.slug !== slug);
add(!idOwner, `post_number ${meta.post_number} is already owned by ${idOwner?.slug}`);

const contentConfig = await readJson(path.join(root, 'content.config.json'));
for (const category of contentConfig.allContentDirs || []) {
  const categoryDir = path.join(root, 'posts', category);
  for (const entry of await fs.readdir(categoryDir, { withFileTypes: true }).catch(() => [])) {
    if (!entry.isDirectory() || (category === 'papers' && entry.name === slug)) continue;
    let other;
    try { other = await readJson(path.join(categoryDir, entry.name, 'meta.json')); } catch { continue; }
    add(other.post_number !== meta.post_number,
      `duplicate post_number ${meta.post_number} in ${category}/${entry.name}`);
    if (meta.arxiv_id) {
      add(canonicalArxivId(other.arxiv_id) !== canonicalArxivId(meta.arxiv_id),
        `duplicate arxiv_id ${meta.arxiv_id} in ${category}/${entry.name}`);
    }
  }
}

for (const [kind, items] of [['figure', meta.figures || []], ['table', meta.tables || []]]) {
  const numbers = new Set();
  for (const item of items) {
    add(Number.isInteger(item.number), `${kind} has invalid number: ${JSON.stringify(item.number)}`);
    add(!numbers.has(item.number), `duplicate ${kind} number ${item.number}`);
    numbers.add(item.number);
    add(Boolean(item.src), `${kind} ${item.number} is missing src`);
    add(Boolean(item.caption), `${kind} ${item.number} is missing caption`);
    add(Boolean(item.caption_ko), `${kind} ${item.number} is missing caption_ko`);
    if (item.src) {
      add(await exists(path.join(postDir, item.src.replace(/^\.\//, ''))), `missing asset ${item.src}`);
    }
  }
}

for (const file of ['cover_image', 'cover_thumb', 'thumb_source']) {
  if (meta[file]?.startsWith('./')) {
    add(await exists(path.join(postDir, meta[file].slice(2))), `missing ${file} ${meta[file]}`);
  }
}

const allowedPredicates = new Set(schema.properties.relations.items.properties.type.enum);
for (const relation of meta.relations || []) {
  add(allowedPredicates.has(relation.type), `invalid relation predicate ${relation.type}`);
  add(Boolean(relation.target), `relation ${relation.type} is missing target`);
  if (relation.target) {
    add(await exists(path.join(root, 'posts', 'papers', relation.target, 'meta.json')),
      `missing relation target ${relation.target}`);
  }
}

for (const locale of ['ko', 'en']) {
  const file = path.join(postDir, `${locale}.mdx`);
  if (!await exists(file)) {
    errors.push(`missing ${locale}.mdx`);
    continue;
  }
  const parsed = matter(await fs.readFile(file, 'utf8'));
  add(parsed.data.locale === locale, `${locale}.mdx locale is ${JSON.stringify(parsed.data.locale)}`);
  for (const key of ['title', 'summary', 'card_summary']) {
    add(Boolean(parsed.data[key]), `${locale}.mdx is missing frontmatter ${key}`);
  }
}

for (const key of ['research_gaps', 'future_directions', 'next_reading']) {
  add(Array.isArray(meta[key]), `meta.${key} should be a structured array`, { warning: true });
}

const result = {
  ok: errors.length === 0,
  slug,
  post_number: meta.post_number,
  indexed: indexed.length === 1,
  figures: (meta.figures || []).length,
  tables: (meta.tables || []).length,
  relations: (meta.relations || []).length,
  errors,
  warnings,
};

console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exit(1);
