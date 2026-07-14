#!/usr/bin/env node

/**
 * upload-to-r2.mjs
 * Upload post images/thumbnails/OG images to Cloudflare R2.
 *
 * Usage:
 *   node scripts/upload-to-r2.mjs                # upload all posts
 *   node scripts/upload-to-r2.mjs --slug=xxx     # upload single post
 *   node scripts/upload-to-r2.mjs --dry-run      # preview only
 *   node scripts/upload-to-r2.mjs --concurrency=6
 */

import fs from 'fs/promises';
import path from 'path';
import { PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { POSTS_DIR, PUBLIC_POSTS_DIR, getContentDirs } from './lib/paths.mjs';
import { loadEnv } from './lib/env.mjs';
import { getR2PublicUrl, getR2Client } from './lib/r2-config.mjs';

await loadEnv();

const R2_PUBLIC_URL = getR2PublicUrl();
const { s3, bucket: R2_BUCKET_NAME } = getR2Client({ requireBucket: true });

// CLI args
const args = process.argv.slice(2);
const slugArg = args.find(a => a.startsWith('--slug='))?.split('=')[1];
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const requestedConcurrency = Number(args.find(a => a.startsWith('--concurrency='))?.split('=')[1] || 6);
const concurrency = Number.isInteger(requestedConcurrency) && requestedConcurrency > 0
  ? Math.min(requestedConcurrency, 16)
  : 6;

// Content directories to scan
const CONTENT_DIRS = await getContentDirs();
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);

// MIME types
const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
};

async function exists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function upload(localPath, key) {
  const ext = path.extname(localPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const body = await fs.readFile(localPath);

  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
}

async function getPostSlugs() {
  const slugs = [];
  for (const dir of CONTENT_DIRS) {
    const dirPath = path.join(POSTS_DIR, dir);
    try {
      const entries = await fs.readdir(dirPath);
      for (const slug of entries) {
        const stat = await fs.stat(path.join(dirPath, slug));
        if (stat.isDirectory()) {
          slugs.push({ slug, dir, path: path.join(dirPath, slug) });
        }
      }
    } catch { /* skip */ }
  }
  return slugs;
}

async function uploadPost(post) {
  const { slug, path: postDir } = post;
  const candidates = new Map();

  // Build one key-deduplicated inventory first. process-content-images keeps
  // OG/thumb copies in both source and public directories.
  const entries = await fs.readdir(postDir);
  for (const file of entries) {
    const ext = path.extname(file).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) continue;
    candidates.set(`posts/${slug}/${file}`, path.join(postDir, file));
  }

  // Prefer public mirrors for generated OG/thumb keys when present.
  const ogPath = path.join(PUBLIC_POSTS_DIR, slug, 'og.png');
  try { await fs.access(ogPath); candidates.set(`posts/${slug}/og.png`, ogPath); } catch {}

  const thumbPath = path.join(PUBLIC_POSTS_DIR, slug, 'cover-thumb.webp');
  try { await fs.access(thumbPath); candidates.set(`posts/${slug}/cover-thumb.webp`, thumbPath); } catch {}

  const queue = [...candidates.entries()];
  let cursor = 0;
  async function worker() {
    const result = { uploaded: 0, skipped: 0 };
    while (cursor < queue.length) {
      const current = cursor++;
      const [key, localPath] = queue[current];
      if (!force && await exists(key)) {
        result.skipped++;
        continue;
      }
      if (dryRun) {
        console.log(`  [dry-run] ${key}`);
      } else {
        await upload(localPath, key);
      }
      result.uploaded++;
    }
    return result;
  }

  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(1, queue.length)) },
    () => worker(),
  );
  const results = await Promise.all(workers);
  const uploaded = results.reduce((sum, result) => sum + result.uploaded, 0);
  const skipped = results.reduce((sum, result) => sum + result.skipped, 0);

  return { uploaded, skipped };
}

async function main() {
  console.log(`🚀 Uploading to R2: ${R2_BUCKET_NAME}`);
  console.log(`   Public URL: ${R2_PUBLIC_URL}`);
  if (dryRun) console.log('   (dry-run mode)');
  if (force) console.log('   (force re-upload)');
  console.log(`   Concurrency: ${concurrency}`);

  let posts = await getPostSlugs();
  if (slugArg) {
    posts = posts.filter(p => p.slug === slugArg);
    if (posts.length === 0) {
      console.error(`❌ Post not found: ${slugArg}`);
      process.exit(1);
    }
  }

  let totalUploaded = 0;
  let totalSkipped = 0;

  for (const post of posts) {
    const { uploaded, skipped } = await uploadPost(post);
    if (uploaded > 0) {
      console.log(`  ✓ ${post.slug}: ${uploaded} uploaded, ${skipped} skipped`);
    }
    totalUploaded += uploaded;
    totalSkipped += skipped;
  }

  console.log(`\n✅ Done: ${totalUploaded} uploaded, ${totalSkipped} skipped (${posts.length} posts)`);
}

main().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
