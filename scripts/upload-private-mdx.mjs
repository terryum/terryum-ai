#!/usr/bin/env node

/**
 * upload-private-mdx.mjs
 *
 * Upload private/group post bodies (ko.mdx, en.mdx, optional meta.json) to R2.
 * Called by /post --visibility=private|group flow (SKILL.md Step B10.2).
 *
 * R2 layout (mirrors src/lib/r2-private.ts):
 *   private/posts/<type>/<slug>/ko.mdx
 *   private/posts/<type>/<slug>/en.mdx
 *   private/posts/<type>/<slug>/meta.json   (optional)
 *
 * Usage:
 *   node scripts/upload-private-mdx.mjs \
 *     --type=memos \
 *     --slug=260424-foo \
 *     --source=/Users/terrytaewoongum/Codes/personal/terry-private/posts/memos/260424-foo
 *
 *   node scripts/upload-private-mdx.mjs --type=papers --slug=xxx --source=... --skip-meta
 *   node scripts/upload-private-mdx.mjs --type=papers --slug=xxx --source=... --dry-run
 *
 * Exit codes:
 *   0  all uploads verified
 *   1  bad args / missing source files / R2 env missing
 *   2  upload or HEAD verification failed after retry
 */

import fs from 'fs/promises';
import path from 'path';
import {
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { loadEnv } from './lib/env.mjs';
import { getR2PublicUrl, getR2Client } from './lib/r2-config.mjs';

await loadEnv();

const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v] = a.replace(/^--/, '').split('=');
      return [k, v ?? true];
    }),
);

const { type, slug, source } = flags;
const skipMeta = !!flags['skip-meta'];
const dryRun = !!flags['dry-run'];

if (!type || !slug || !source) {
  console.error('Usage: upload-private-mdx.mjs --type=<memos|essays|threads|papers> --slug=<slug> --source=<dir>');
  process.exit(1);
}

const VALID_TYPES = new Set(['memos', 'essays', 'threads', 'papers']);
if (!VALID_TYPES.has(type)) {
  console.error(`❌ --type must be one of: ${[...VALID_TYPES].join(', ')}`);
  process.exit(1);
}

const R2_PUBLIC_URL = getR2PublicUrl();
if (!R2_PUBLIC_URL) {
  console.error('❌ R2_PUBLIC_URL or NEXT_PUBLIC_R2_URL not set — needed for HEAD verification');
  process.exit(1);
}

const { s3, bucket: R2_BUCKET_NAME } = getR2Client({ requireBucket: true });

const sourceDir = source.startsWith('~')
  ? path.join(process.env.HOME || '', source.slice(1))
  : path.resolve(source);

const PREFIX = `private/posts/${type}/${slug}`;

// Targets: ko.mdx and en.mdx are required if present; meta.json is optional.
async function discoverTargets() {
  const items = [];
  for (const lang of ['ko', 'en']) {
    const local = path.join(sourceDir, `${lang}.mdx`);
    try {
      await fs.access(local);
      items.push({
        local,
        key: `${PREFIX}/${lang}.mdx`,
        contentType: 'text/markdown; charset=utf-8',
        required: true,
      });
    } catch {
      // missing — skipped silently; we report below if neither lang exists
    }
  }
  if (!skipMeta) {
    const metaLocal = path.join(sourceDir, 'meta.json');
    try {
      await fs.access(metaLocal);
      items.push({
        local: metaLocal,
        key: `${PREFIX}/meta.json`,
        contentType: 'application/json; charset=utf-8',
        required: false,
      });
    } catch {
      // meta.json optional — silently skipped
    }
  }
  return items;
}

async function putOnce(item) {
  const body = await fs.readFile(item.local);
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: item.key,
    Body: body,
    ContentType: item.contentType,
    // Private bodies should be re-readable after edits — disable edge caching.
    CacheControl: 'no-cache, no-store, must-revalidate',
  }));
}

async function headOnce(key) {
  await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
}

async function uploadWithRetry(item) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await putOnce(item);
      await headOnce(item.key);
      return;
    } catch (err) {
      if (attempt === 2) {
        throw new Error(`${item.key}: ${err?.name || 'Error'} ${err?.message || err}`);
      }
      console.warn(`  ⚠ ${item.key}: attempt 1 failed (${err?.message || err}), retrying…`);
      await new Promise((r) => setTimeout(r, 750));
    }
  }
}

async function main() {
  // Verify source dir exists
  try {
    const stat = await fs.stat(sourceDir);
    if (!stat.isDirectory()) throw new Error('not a directory');
  } catch (err) {
    console.error(`❌ --source not accessible: ${sourceDir} (${err.message})`);
    process.exit(1);
  }

  const targets = await discoverTargets();
  const mdxCount = targets.filter((t) => t.required).length;
  if (mdxCount === 0) {
    console.error(`❌ No ko.mdx or en.mdx found in ${sourceDir}`);
    process.exit(1);
  }

  console.log(`🔐 Upload private MDX → r2://${R2_BUCKET_NAME}/${PREFIX}/`);
  console.log(`   source: ${sourceDir}`);
  if (dryRun) console.log('   (dry-run — no PUT/HEAD calls)');

  for (const item of targets) {
    const rel = path.relative(sourceDir, item.local);
    if (dryRun) {
      console.log(`  [dry-run] ${rel}  →  ${item.key}`);
      continue;
    }
    try {
      await uploadWithRetry(item);
      console.log(`  ✓ ${rel}  →  ${item.key}`);
    } catch (err) {
      console.error(`  ✗ ${err.message}`);
      process.exit(2);
    }
  }

  if (dryRun) return;

  console.log('\nVerify with:');
  for (const item of targets.filter((t) => t.required)) {
    console.log(`  curl -sI "${R2_PUBLIC_URL}/${item.key}" | head -1`);
  }
  console.log('\n✅ Done');
}

main().catch((err) => {
  console.error('❌ Fatal:', err?.message || err);
  process.exit(2);
});
