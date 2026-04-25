#!/usr/bin/env node

/**
 * migrate-relation-vocab.mjs
 *
 * One-shot migration: rewrite posts/papers/<slug>/meta.json relations[].type
 * from legacy vocabulary to the ONTOLOGY.md vocabulary (CiTO-aligned).
 *
 * Usage:
 *   node scripts/migrate-relation-vocab.mjs              # dry-run
 *   node scripts/migrate-relation-vocab.mjs --apply      # write changes
 *   node scripts/migrate-relation-vocab.mjs --slug=xxx   # single slug
 *
 * See ONTOLOGY.md for the mapping rationale.
 */

import fs from 'fs/promises';
import path from 'path';
import { POSTS_DIR } from './lib/paths.mjs';

const PAPERS_DIR = path.join(POSTS_DIR, 'papers');

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const slugFilter = args.find(a => a.startsWith('--slug='))?.split('=')[1] || null;

// Mapping: legacy → new (forward-only). See ONTOLOGY.md.
const MAPPING = {
  related: 'sharesTopicWith',
  compares_with: 'reviews',
  builds_on: 'extends',
  addresses_task: 'sharesGoalWith',
  uses_method: 'usesMethodIn',
  // Defined in legacy code but unused in actual data; preserve intent:
  extends: 'extends',
  fills_gap_of: 'critiques',
  uses_method_in: 'usesMethodIn',
  // Already canonical:
  cites: 'cites',
  critiques: 'critiques',
  reviews: 'reviews',
  sharesTopicWith: 'sharesTopicWith',
  sharesGoalWith: 'sharesGoalWith',
  usesMethodIn: 'usesMethodIn',
};

const VALID_NEW = new Set([
  'cites', 'extends', 'usesMethodIn', 'reviews', 'critiques',
  'sharesGoalWith', 'sharesTopicWith',
]);

async function main() {
  console.log(`📚 Relation vocab migration ${apply ? '(APPLY)' : '(dry-run)'}`);

  let entries;
  try {
    entries = await fs.readdir(PAPERS_DIR, { withFileTypes: true });
  } catch (err) {
    console.error(`❌ Cannot read papers directory: ${err.message}`);
    process.exit(1);
  }

  const counters = {};
  let filesScanned = 0;
  let filesChanged = 0;
  let edgesChanged = 0;
  const unknown = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const slug = entry.name;
    if (slugFilter && slug !== slugFilter) continue;

    const metaPath = path.join(PAPERS_DIR, slug, 'meta.json');
    let raw;
    try { raw = await fs.readFile(metaPath, 'utf-8'); } catch { continue; }

    let meta;
    try { meta = JSON.parse(raw); }
    catch (err) {
      console.warn(`  ⚠ ${slug}: JSON parse failed (${err.message})`);
      continue;
    }
    filesScanned++;

    const rels = Array.isArray(meta.relations) ? meta.relations : [];
    if (rels.length === 0) continue;

    let fileMutated = false;
    for (const rel of rels) {
      // Canonicalize endpoint key: some legacy files use `slug` instead
      // of `target`. ONTOLOGY.md / JSON Schema mandate `target`.
      if (rel.target == null && rel.slug != null) {
        rel.target = rel.slug;
        delete rel.slug;
        fileMutated = true;
      }

      const oldType = rel.type;
      if (!oldType) continue;

      const newType = MAPPING[oldType];
      if (!newType) {
        unknown.push({ slug, type: oldType, target: rel.target });
        continue;
      }

      counters[`${oldType} → ${newType}`] = (counters[`${oldType} → ${newType}`] || 0) + 1;

      if (oldType !== newType) {
        rel.type = newType;
        fileMutated = true;
        edgesChanged++;
      }

      if (!VALID_NEW.has(newType)) {
        unknown.push({ slug, type: newType, target: rel.target, note: 'mapped to invalid' });
      }
    }

    if (fileMutated) {
      filesChanged++;
      if (apply) {
        await fs.writeFile(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf-8');
        console.log(`  ✅ ${slug}: rewrote ${rels.length} relation(s)`);
      } else {
        console.log(`  📝 ${slug}: would rewrite ${rels.length} relation(s)`);
      }
    }
  }

  console.log('\n── Mapping counts ──');
  for (const [k, v] of Object.entries(counters).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${v.toString().padStart(4)} ${k}`);
  }

  if (unknown.length > 0) {
    console.warn(`\n⚠ ${unknown.length} unknown predicate(s) — manual review needed:`);
    for (const u of unknown) {
      console.warn(`  ${u.slug} → ${u.target}: ${u.type}${u.note ? ' [' + u.note + ']' : ''}`);
    }
  }

  console.log(`\n🏁 Files scanned: ${filesScanned}, would change: ${filesChanged}, edges affected: ${edgesChanged}`);
  if (!apply && filesChanged > 0) {
    console.log('   Re-run with --apply to write changes.');
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
