#!/usr/bin/env node

/**
 * Change post/survey visibility with a safe dry-run default.
 *
 * Survey updates are applied to both the site registry and the canonical
 * terry-surveys-contents survey.json when that checkout is available.
 * Post metadata is updated in index.json and meta.json. Moving a post into
 * private R2 remains an explicit prerequisite so a metadata flip can never
 * accidentally publish or bundle a restricted body.
 *
 * Examples:
 *   node scripts/set-content-visibility.mjs --kind=survey --slug=foo --visibility=private
 *   node scripts/set-content-visibility.mjs --kind=survey --slug=foo --visibility=public --apply
 *   node scripts/set-content-visibility.mjs --kind=post --slug=foo --visibility=private --apply
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PERSONAL_ROOT = path.dirname(ROOT);
const CANONICAL_SURVEYS_ROOT = process.env.TERRY_SURVEYS_CONTENTS_ROOT
  ?? path.join(PERSONAL_ROOT, 'terry-surveys-contents');
const args = Object.fromEntries(process.argv.slice(2).filter((arg) => arg.startsWith('--')).map((arg) => {
  const [key, ...rest] = arg.slice(2).split('=');
  return [key, rest.length ? rest.join('=') : true];
}));

const kind = args.kind;
const slug = args.slug;
const visibility = args.visibility;
const apply = args.apply === true;
const allowedGroups = typeof args['allowed-groups'] === 'string'
  ? args['allowed-groups'].split(',').map((value) => value.trim()).filter(Boolean)
  : [];

if (!['post', 'survey'].includes(kind) || !slug || !['public', 'private', 'group'].includes(visibility)) {
  console.error('Usage: set-content-visibility.mjs --kind=<post|survey> --slug=<slug> --visibility=<public|private|group> [--allowed-groups=a,b] [--apply]');
  process.exit(1);
}
if (visibility === 'group' && allowedGroups.length === 0) {
  console.error('Group visibility requires --allowed-groups=<group,...>');
  process.exit(1);
}

function applyAccessFields(entry) {
  entry.visibility = visibility;
  if (visibility === 'group') entry.allowed_groups = allowedGroups;
  else delete entry.allowed_groups;
  delete entry.site_visible;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function writeJson(file, value) {
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function updateSurvey() {
  const registryFile = path.join(ROOT, 'projects', 'surveys', 'surveys.json');
  const registry = await readJson(registryFile);
  const entry = registry.surveys.find((survey) => survey.slug === slug);
  if (!entry) throw new Error(`Survey not found in site registry: ${slug}`);

  const canonicalFile = path.join(CANONICAL_SURVEYS_ROOT, 'surveys', slug, 'survey.json');
  let canonical = null;
  try {
    canonical = await readJson(canonicalFile);
  } catch {
    throw new Error(`Canonical survey metadata not found: ${canonicalFile}`);
  }

  console.log(`${apply ? 'APPLY' : 'DRY RUN'} survey:${slug}: ${(entry.visibility ?? 'public')} → ${visibility}`);
  if (!apply) return;
  applyAccessFields(entry);
  applyAccessFields(canonical);
  await writeJson(registryFile, registry);
  await writeJson(canonicalFile, canonical);
}

async function updatePost() {
  const indexFile = path.join(ROOT, 'posts', 'index.json');
  const index = await readJson(indexFile);
  const entry = index.posts.find((post) => post.slug === slug);
  if (!entry) throw new Error(`Post not found in index: ${slug}`);

  const type = entry.content_type;
  const postDir = path.join(ROOT, 'posts', type, slug);
  const metaFile = path.join(postDir, 'meta.json');
  let meta = null;
  try { meta = await readJson(metaFile); } catch { /* optional */ }

  if (visibility !== 'public') {
    if (entry.body_source !== 'r2') {
      throw new Error(
        'Refusing to make this post private before its body is uploaded to the private R2 bucket. '
        + 'Run upload-private-mdx.mjs, set body_source="r2", and remove the public repo body first.',
      );
    }
    try {
      await fs.access(postDir);
      throw new Error(`Refusing private transition while public repo body still exists: ${postDir}`);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  } else if (entry.body_source === 'r2') {
    throw new Error('Refusing to publish an R2-only post before its body has been restored to the public posts directory.');
  }

  console.log(`${apply ? 'APPLY' : 'DRY RUN'} post:${slug}: ${(entry.visibility ?? 'public')} → ${visibility}`);
  if (!apply) return;
  applyAccessFields(entry);
  if (meta) {
    applyAccessFields(meta);
    await writeJson(metaFile, meta);
  }
  await writeJson(indexFile, index);
}

try {
  if (kind === 'survey') await updateSurvey();
  else await updatePost();
  if (!apply) console.log('No files changed. Re-run with --apply to commit this transition.');
} catch (error) {
  console.error(`❌ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
