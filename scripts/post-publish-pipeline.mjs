#!/usr/bin/env node

/**
 * post-publish-pipeline.mjs
 *
 * Run the build/upload pipeline for a single post in parallel where possible.
 * Replaces the manual chain of `generate-index → flatten-transparent-figures →
 * upload-to-r2` with a single command.
 *
 * Dependency graph:
 *   [parallel] generate-index | optional generate-thumbnails | optional generate-og-image | optional generate-embeddings
 *        └─→ (await all)
 *   [serial]   flatten-transparent-figures public/posts/<slug>/
 *        └─→ upload-to-r2 --slug=<slug>
 *
 * Usage:
 *   node scripts/post-publish-pipeline.mjs --slug=260422-work-that-isnt
 *   node scripts/post-publish-pipeline.mjs --slug=xxx --skip-image-generation
 *   node scripts/post-publish-pipeline.mjs --slug=xxx --with-embeddings
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, appendFile } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v] = a.replace(/^--/, '').split('=');
      return [k, v ?? true];
    }),
);

const slug = flags.slug;
if (!slug) {
  console.error('❌ --slug=<slug> is required');
  process.exit(1);
}

const withEmbeddings = !!flags['with-embeddings'] && !flags['skip-embeddings'];
const skipImageGeneration = !!flags['skip-image-generation'];
const skipIndex = !!flags['skip-index'];
const skipUpload = !!flags['skip-upload'];

const publicSlugDir = join(REPO_ROOT, 'public', 'posts', slug);
const timingLog = join(REPO_ROOT, '.tmp', 'publish-timings.jsonl');

async function recordTiming(phase, ms, status = 'ok') {
  try {
    await mkdir(dirname(timingLog), { recursive: true });
    await appendFile(
      timingLog,
      `${JSON.stringify({
        ts: new Date().toISOString(),
        slug,
        phase,
        status,
        duration_ms: ms,
      })}\n`,
    );
  } catch {
    // Best-effort local diagnostics only.
  }
}

function run(label, cmd, cmdArgs) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    console.log(`▶ ${label}: ${cmd} ${cmdArgs.join(' ')}`);
    const child = spawn(cmd, cmdArgs, { stdio: 'inherit', cwd: REPO_ROOT });
    child.on('exit', (code) => {
      const ms = Date.now() - start;
      if (code === 0) {
        console.log(`✓ ${label} (${ms}ms)`);
        recordTiming(label, ms).finally(() => {});
        resolve(ms);
      } else {
        recordTiming(label, ms, `exit-${code}`).finally(() => {});
        reject(new Error(`${label} exited with code ${code}`));
      }
    });
    child.on('error', (err) => {
      const ms = Date.now() - start;
      recordTiming(label, ms, `error:${err.code || err.message}`).finally(() => {});
      reject(err);
    });
  });
}

const t0 = Date.now();

// ── Group A: independent steps run in parallel ──
const groupA = [];

if (skipImageGeneration) {
  console.log('⏭ skipping legacy image generation; assuming process-content-images.mjs already ran');
} else {
  groupA.push(
    run('generate-thumbnails', 'node', ['scripts/generate-thumbnails.mjs']),
    run('generate-og-image', 'node', ['scripts/generate-og-image.mjs']),
  );
}

if (!skipIndex) {
  groupA.push(run('generate-index', 'node', ['scripts/generate-index.mjs']));
}

if (withEmbeddings) {
  groupA.push(
    run('generate-embeddings', 'node', [
      'scripts/generate-embeddings.mjs',
      `--slug=${slug}`,
    ]),
  );
} else {
  console.log('⏭ skipping embeddings by default; pass --with-embeddings to refresh search vectors');
}

await Promise.all(groupA);

// ── Group B: flatten depends on thumbs+og output ──
if (existsSync(publicSlugDir)) {
  await run('flatten-transparent-figures', 'python3', [
    'scripts/flatten-transparent-figures.py',
    `public/posts/${slug}/`,
  ]);
} else {
  console.warn(`⚠ ${publicSlugDir} not found — skipping flatten`);
}

// ── Group C: upload depends on flattened files ──
if (!skipUpload) {
  await run('upload-to-r2', 'node', [
    'scripts/upload-to-r2.mjs',
    `--slug=${slug}`,
  ]);
}

const total = Date.now() - t0;
await recordTiming('post-publish-pipeline', total);
console.log(`\n🎉 Pipeline complete for ${slug} in ${(total / 1000).toFixed(1)}s`);
