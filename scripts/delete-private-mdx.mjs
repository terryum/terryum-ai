#!/usr/bin/env node

/**
 * delete-private-mdx.mjs
 *
 * Delete every R2 object under `private/posts/<type>/<slug>/` for a private
 * or group post that is being removed by /del. Mirrors the layout written by
 * upload-private-mdx.mjs and read by src/lib/r2-private.ts:
 *
 *   private/posts/<type>/<slug>/ko.mdx
 *   private/posts/<type>/<slug>/en.mdx
 *   private/posts/<type>/<slug>/meta.json
 *   private/posts/<type>/<slug>/og.png   (legacy SNU migration may have these)
 *
 * Public covers live under `posts/<slug>/cover*.webp` and are handled by
 * /del's Step D3 (rm public/posts/<slug>/) — this script only sweeps the
 * `private/` tree.
 *
 * Usage:
 *   node scripts/delete-private-mdx.mjs --type=memos --slug=260424-foo
 *   node scripts/delete-private-mdx.mjs --type=papers --slug=xxx --dry-run
 *
 * Exit codes:
 *   0  all deletions verified (or zero objects under prefix)
 *   1  bad args / R2 env missing
 *   2  delete failed
 */

import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { loadEnv } from './lib/env.mjs';

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

const { type, slug } = flags;
const dryRun = !!flags['dry-run'];

if (!type || !slug) {
  console.error('Usage: delete-private-mdx.mjs --type=<memos|essays|threads|papers> --slug=<slug> [--dry-run]');
  process.exit(1);
}

const VALID_TYPES = new Set(['memos', 'essays', 'threads', 'papers']);
if (!VALID_TYPES.has(type)) {
  console.error(`❌ --type must be one of: ${[...VALID_TYPES].join(', ')}`);
  process.exit(1);
}

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
} = process.env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error('❌ R2 credentials missing in .env.local (need R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME)');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const PREFIX = `private/posts/${type}/${slug}/`;

async function listKeys() {
  const keys = [];
  let token;
  do {
    const r = await s3.send(new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: PREFIX,
      ContinuationToken: token,
      MaxKeys: 1000,
    }));
    for (const o of r.Contents || []) keys.push(o.Key);
    token = r.IsTruncated ? r.NextContinuationToken : null;
  } while (token);
  return keys;
}

async function main() {
  console.log(`🗑️  Delete private content → r2://${R2_BUCKET_NAME}/${PREFIX}`);

  const keys = await listKeys();
  if (keys.length === 0) {
    console.log('  (no objects under prefix)');
    return;
  }

  for (const key of keys) console.log(`  • ${key}`);
  console.log(`  → ${keys.length} object(s)`);

  if (dryRun) {
    console.log('\n(dry-run — no DELETE calls)');
    return;
  }

  try {
    const r = await s3.send(new DeleteObjectsCommand({
      Bucket: R2_BUCKET_NAME,
      Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
    }));
    if (r.Errors?.length) {
      for (const e of r.Errors) console.error(`  ✗ ${e.Key}: ${e.Code} ${e.Message}`);
      process.exit(2);
    }
    console.log(`\n✅ Deleted ${keys.length} object(s)`);
  } catch (err) {
    console.error(`❌ Fatal: ${err?.name || 'Error'} ${err?.message || err}`);
    process.exit(2);
  }
}

await main();
