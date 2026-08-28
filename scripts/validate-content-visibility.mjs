#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VALID = new Set(['public', 'private', 'group']);
const errors = [];

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(ROOT, relativePath), 'utf8'));
}

function validateEntries(kind, entries) {
  const seen = new Set();
  for (const entry of entries) {
    const label = `${kind}:${entry.slug ?? '<missing-slug>'}`;
    if (!entry.slug) errors.push(`${label}: slug is required`);
    if (seen.has(entry.slug)) errors.push(`${label}: duplicate slug`);
    seen.add(entry.slug);

    const visibility = entry.visibility ?? 'public';
    if (!VALID.has(visibility)) {
      errors.push(`${label}: invalid visibility ${JSON.stringify(visibility)}`);
    }
    if (visibility === 'group' && !(entry.allowed_groups?.length > 0)) {
      errors.push(`${label}: group visibility requires allowed_groups`);
    }
    if (visibility !== 'group' && (entry.allowed_groups?.length ?? 0) > 0) {
      errors.push(`${label}: allowed_groups is only valid for group visibility`);
    }
    if ('site_visible' in entry) {
      errors.push(`${label}: obsolete site_visible field; use visibility`);
    }
  }
}

const postIndex = await readJson('posts/index.json');
const surveyRegistry = await readJson('projects/surveys/surveys.json');
validateEntries('post', postIndex.posts ?? []);
validateEntries('survey', surveyRegistry.surveys ?? []);

const restrictedLocalPosts = (postIndex.posts ?? []).filter(
  (post) => (post.visibility ?? 'public') !== 'public' && post.body_source !== 'r2',
);
for (const post of restrictedLocalPosts) {
  errors.push(`post:${post.slug}: restricted posts must set body_source to r2`);
}

if (errors.length > 0) {
  console.error('Content visibility validation failed:');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`✓ Visibility metadata valid (${postIndex.posts?.length ?? 0} posts, ${surveyRegistry.surveys?.length ?? 0} surveys)`);
