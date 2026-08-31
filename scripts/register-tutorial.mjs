#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.TERRYUM_AI_ROOT
  ? path.resolve(process.env.TERRYUM_AI_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = path.join(ROOT, 'projects/surveys/surveys.json');
const args = Object.fromEntries(process.argv.slice(2).map((item) => {
  const [key, ...rest] = item.replace(/^--/, '').split('=');
  return [key, rest.length ? rest.join('=') : true];
}));
if (!args['survey-json'] || !args['preview-url'] || !args['cover-image']) {
  throw new Error('Usage: register-tutorial.mjs --survey-json=<path> --preview-url=<https://slug-preview.pages.dev/> --cover-image=<path> [--production-url=<url>] [--apply]');
}
const metadata = JSON.parse(await fs.readFile(path.resolve(String(args['survey-json'])), 'utf8'));
if (metadata.content_type !== 'tutorial') throw new Error('survey.json content_type must be tutorial');
const preview = new URL(String(args['preview-url']));
if (preview.protocol !== 'https:' || preview.hostname !== `${metadata.id}-preview.pages.dev`) throw new Error('preview URL does not match tutorial slug');
const registry = JSON.parse(await fs.readFile(REGISTRY, 'utf8'));
let entry = registry.surveys.find((item) => item.slug === metadata.id);
if (!entry) {
  if (metadata.tutorial_number !== registry.next_tutorial_number) throw new Error('tutorial_number does not match next_tutorial_number');
  entry = { slug: metadata.id };
  registry.surveys.unshift(entry);
  registry.next_tutorial_number += 1;
} else if (entry.tutorial_number !== metadata.tutorial_number) {
  throw new Error('existing tutorial_number is immutable');
}
const toc = metadata.parts.flatMap((part) => part.chapters.map((chapter) => ({ ...chapter.title, status: chapter.status ?? 'ready' })));
Object.assign(entry, {
  content_type: 'tutorial', tutorial_number: metadata.tutorial_number,
  title: metadata.title, description: metadata.description,
  cover_image: String(args['cover-image']), tech_stack: entry.tech_stack ?? ['Tutorial'],
  toc, preview_embed_url: preview.toString(), status: metadata.status,
  featured: entry.featured ?? true, order: entry.order ?? 0,
  published_at: entry.published_at ?? new Date().toISOString().slice(0, 10),
  updated_at: new Date().toISOString().slice(0, 10),
  visibility: entry.visibility ?? 'private', links: entry.links ?? [],
});
if (args['production-url']) {
  const production = new URL(String(args['production-url']));
  if (production.protocol !== 'https:' || production.hostname !== `${metadata.id}.pages.dev`) throw new Error('production URL does not match tutorial slug');
  entry.embed_url = production.toString();
  entry.visibility = 'public';
  entry.links = [{ type: 'demo', url: production.toString(), label: 'Read' }];
}
const output = JSON.stringify(registry, null, 2) + '\n';
if (args.apply) await fs.writeFile(REGISTRY, output);
console.log(JSON.stringify({ mode: args.apply ? 'applied' : 'dry-run', slug: metadata.id, tutorial_number: metadata.tutorial_number, next_tutorial_number: registry.next_tutorial_number, visibility: entry.visibility }));
