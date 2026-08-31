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
    if (kind === 'survey') {
      const contentType = entry.content_type ?? 'survey';
      if (!['survey', 'tutorial'].includes(contentType)) errors.push(`${label}: invalid content_type`);
      if (contentType === 'tutorial') {
        if (!Number.isInteger(entry.tutorial_number) || entry.tutorial_number < 1) errors.push(`${label}: tutorial_number must be a positive integer`);
        if (entry.survey_number != null) errors.push(`${label}: tutorial must not consume survey_number`);
        if (!entry.preview_embed_url) errors.push(`${label}: tutorial requires preview_embed_url`);
      }
      for (const [index, chapter] of (entry.toc ?? []).entries()) {
        if (!['planned', 'ready'].includes(chapter.status ?? 'ready')) errors.push(`${label}: toc[${index}] has invalid status`);
      }
    }
  }
}

const postIndex = await readJson('posts/index.json');
const surveyRegistry = await readJson('projects/surveys/surveys.json');
if (!Number.isInteger(surveyRegistry.next_tutorial_number) || surveyRegistry.next_tutorial_number < 1) {
  errors.push('survey registry: next_tutorial_number must be a positive integer');
}
validateEntries('post', postIndex.posts ?? []);
validateEntries('survey', surveyRegistry.surveys ?? []);
const tutorialNumbers = (surveyRegistry.surveys ?? []).filter((entry) => (entry.content_type ?? 'survey') === 'tutorial').map((entry) => entry.tutorial_number);
if (new Set(tutorialNumbers).size !== tutorialNumbers.length) errors.push('survey registry: duplicate tutorial_number');
if (tutorialNumbers.length && surveyRegistry.next_tutorial_number <= Math.max(...tutorialNumbers)) errors.push('survey registry: next_tutorial_number must exceed assigned tutorial numbers');

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
