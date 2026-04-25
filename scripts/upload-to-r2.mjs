#!/usr/bin/env node

/**
 * upload-to-r2.mjs
 * Upload post images/thumbnails/OG images to Cloudflare R2.
 *
 * Usage:
 *   node scripts/upload-to-r2.mjs                # upload all posts
 *   node scripts/upload-to-r2.mjs --slug=xxx     # upload single post
 *   node scripts/upload-to-r2.mjs --dry-run      # preview only
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
  let uploaded = 0;
  let skipped = 0;

  // 1. Upload images from posts/<type>/<slug>/
  const entries = await fs.readdir(postDir);
  for (const file of entries) {
    const ext = path.extname(file).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) continue;

    const localPath = path.join(postDir, file);
    const key = `posts/${slug}/${file}`;

    if (!force && await exists(key)) {
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`  [dry-run] ${key}`);
      uploaded++;
      continue;
    }

    await upload(localPath, key);
    uploaded++;
  }

  // 2. Upload OG image from public/posts/<slug>/og.png
  const ogPath = path.join(PUBLIC_POSTS_DIR, slug, 'og.png');
  try {
    await fs.access(ogPath);
    const ogKey = `posts/${slug}/og.png`;
    if (force || !(await exists(ogKey))) {
      if (dryRun) {
        console.log(`  [dry-run] ${ogKey} (OG)`);
      } else {
        await upload(ogPath, ogKey);
      }
      uploaded++;
    } else {
      skipped++;
    }
  } catch { /* no OG image */ }

  // 3. Upload cover-thumb from public/posts/<slug>/cover-thumb.webp
  const thumbPath = path.join(PUBLIC_POSTS_DIR, slug, 'cover-thumb.webp');
  try {
    await fs.access(thumbPath);
    const thumbKey = `posts/${slug}/cover-thumb.webp`;
    if (force || !(await exists(thumbKey))) {
      if (dryRun) {
        console.log(`  [dry-run] ${thumbKey} (thumb)`);
      } else {
        await upload(thumbPath, thumbKey);
      }
      uploaded++;
    } else {
      skipped++;
    }
  } catch { /* no thumb */ }

  return { uploaded, skipped };
}

async function main() {
  console.log(`🚀 Uploading to R2: ${R2_BUCKET_NAME}`);
  console.log(`   Public URL: ${R2_PUBLIC_URL}`);
  if (dryRun) console.log('   (dry-run mode)');
  if (force) console.log('   (force re-upload)');

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
