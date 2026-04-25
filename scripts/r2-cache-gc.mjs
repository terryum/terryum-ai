#!/usr/bin/env node
/**
 * r2-cache-gc.mjs — keep the N newest OpenNext ISR buildId prefixes in
 * `terryum-ai-cache`, delete every object under older prefixes.
 *
 * Why this exists: OpenNext writes ISR cache to
 *   incremental-cache/<buildId>/<sha256>.cache
 * but never prunes prefixes from prior deploys. After ~50 deploys we had
 * ~7500 stale objects taking up R2 storage and obscuring debug listings.
 * Run after each deploy (and ad-hoc when stale prefixes accumulate).
 *
 * Usage:
 *   node scripts/r2-cache-gc.mjs --dry-run [--keep 3]
 *   node scripts/r2-cache-gc.mjs --apply   [--keep 3]
 */
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { loadEnv } from './lib/env.mjs';

const BUCKET = 'terryum-ai-cache';
const ROOT_PREFIX = 'incremental-cache/';
const DELETE_BATCH = 1000;

function parseArgs(argv) {
  const args = { keep: 3, dryRun: false, apply: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--apply') args.apply = true;
    else if (a === '--keep') args.keep = Number(argv[++i]);
    else if (a.startsWith('--keep=')) args.keep = Number(a.slice('--keep='.length));
    else throw new Error(`Unknown arg: ${a}`);
  }
  if (!args.dryRun && !args.apply) {
    throw new Error('Pass --dry-run or --apply.');
  }
  if (args.dryRun && args.apply) {
    throw new Error('--dry-run and --apply are mutually exclusive.');
  }
  if (!Number.isInteger(args.keep) || args.keep < 1) {
    throw new Error(`--keep must be a positive integer (got ${args.keep}).`);
  }
  return args;
}

async function listBuildIdPrefixes(s3) {
  const prefixes = [];
  let token;
  do {
    const r = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: ROOT_PREFIX,
      Delimiter: '/',
      ContinuationToken: token,
    }));
    for (const cp of r.CommonPrefixes || []) {
      if (cp.Prefix) prefixes.push(cp.Prefix);
    }
    token = r.IsTruncated ? r.NextContinuationToken : null;
  } while (token);
  return prefixes;
}

async function listAllUnder(s3, prefix) {
  const keys = [];
  let token;
  let newest = 0;
  do {
    const r = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      ContinuationToken: token,
      MaxKeys: 1000,
    }));
    for (const o of r.Contents || []) {
      keys.push(o.Key);
      const lm = o.LastModified ? o.LastModified.getTime() : 0;
      if (lm > newest) newest = lm;
    }
    token = r.IsTruncated ? r.NextContinuationToken : null;
  } while (token);
  return { keys, newest };
}

async function deleteKeys(s3, keys) {
  let deleted = 0;
  for (let i = 0; i < keys.length; i += DELETE_BATCH) {
    const batch = keys.slice(i, i + DELETE_BATCH);
    const r = await s3.send(new DeleteObjectsCommand({
      Bucket: BUCKET,
      Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
    }));
    deleted += batch.length - (r.Errors?.length || 0);
    if (r.Errors?.length) {
      for (const e of r.Errors) {
        console.error(`  [error] ${e.Key}: ${e.Code} ${e.Message}`);
      }
    }
  }
  return deleted;
}

async function main() {
  await loadEnv();
  const args = parseArgs(process.argv.slice(2));
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('Missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY.');
  }
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });

  const prefixes = await listBuildIdPrefixes(s3);
  console.log(`Found ${prefixes.length} buildId prefix(es) under ${ROOT_PREFIX}.`);

  if (prefixes.length <= args.keep) {
    console.log(`Nothing to delete: ${prefixes.length} <= keep=${args.keep}.`);
    return;
  }

  // Cheaper than listing every object: probe one page per prefix to learn
  // newest LastModified, then sort. Full enumeration runs only on losers.
  const probes = [];
  for (const p of prefixes) {
    const r = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: p, MaxKeys: 1000 }));
    let newest = 0;
    let count = r.KeyCount || 0;
    for (const o of r.Contents || []) {
      const lm = o.LastModified ? o.LastModified.getTime() : 0;
      if (lm > newest) newest = lm;
    }
    probes.push({ prefix: p, newest, sampleCount: count, truncated: !!r.IsTruncated });
  }
  probes.sort((a, b) => b.newest - a.newest);

  const winners = probes.slice(0, args.keep);
  const losers = probes.slice(args.keep);

  console.log(`\nKeeping ${winners.length} newest:`);
  for (const w of winners) {
    console.log(`  ${w.prefix}  newest=${new Date(w.newest).toISOString()}`);
  }
  console.log(`\nWill delete ${losers.length} older prefix(es):`);

  let totalKeys = 0;
  const allKeys = [];
  for (const l of losers) {
    const { keys } = await listAllUnder(s3, l.prefix);
    totalKeys += keys.length;
    allKeys.push(...keys);
    console.log(`  ${l.prefix}  newest=${new Date(l.newest).toISOString()}  objects=${keys.length}`);
  }

  console.log(`\nTotal objects to delete: ${totalKeys}`);
  if (args.dryRun) {
    console.log('Dry-run: no deletions performed.');
    return;
  }

  const start = Date.now();
  const deleted = await deleteKeys(s3, allKeys);
  const sec = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nDeleted ${deleted}/${totalKeys} objects across ${losers.length} prefixes in ${sec}s.`);
  if (deleted < totalKeys) {
    console.error(`Warning: ${totalKeys - deleted} object(s) failed to delete (see [error] lines above).`);
    process.exit(1);
  }
}

await main();
