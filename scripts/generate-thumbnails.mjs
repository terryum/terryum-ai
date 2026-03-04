/**
 * Prebuild script: generates 112×112 center-cropped thumbnails for post cards.
 *
 * Source priority:
 *   1. meta.json `thumb_source` field (e.g. "./fig-6.jpg") — for robot photos etc.
 *   2. cover.webp fallback
 *
 * Run: node scripts/generate-thumbnails.mjs
 */
import { readdir, readFile, stat, mkdir } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';

const POSTS_DIR = join(process.cwd(), 'posts');
const PUBLIC_POSTS_DIR = join(process.cwd(), 'public', 'posts');
const SIZE = 112;
const CONTENT_DIRS = ['research', 'idea'];

/** Read thumb_source from meta.json, returns resolved path or null */
async function getThumbSource(postDir) {
  try {
    const raw = await readFile(join(postDir, 'meta.json'), 'utf-8');
    const meta = JSON.parse(raw);
    if (meta.thumb_source) {
      // resolve "./fig-6.jpg" relative to postDir
      return join(postDir, meta.thumb_source.replace(/^\.\//, ''));
    }
  } catch {
    /* no meta.json or no thumb_source */
  }
  return null;
}

async function generateThumbnails() {
  let generated = 0;
  let skipped = 0;

  for (const type of CONTENT_DIRS) {
    const dir = join(POSTS_DIR, type);
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const slug = e.name;
      const postDir = join(dir, slug);
      const outDir = join(PUBLIC_POSTS_DIR, slug);
      const thumbPath = join(outDir, 'cover-thumb.webp');

      // Determine source: thumb_source > cover.webp
      const customSrc = await getThumbSource(postDir);
      const coverPath = join(postDir, 'cover.webp');
      const srcPath = customSrc || coverPath;

      let srcStat;
      try {
        srcStat = await stat(srcPath);
      } catch {
        continue; // source doesn't exist
      }

      // Staleness: skip if thumb is newer than source
      try {
        const ts = await stat(thumbPath);
        if (ts.mtimeMs >= srcStat.mtimeMs) {
          skipped++;
          continue;
        }
      } catch {
        /* thumb doesn't exist yet */
      }

      try {
        await mkdir(outDir, { recursive: true });
        await sharp(srcPath)
          .resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
          .webp({ quality: 80 })
          .toFile(thumbPath);
        generated++;
      } catch (err) {
        console.warn(`Failed: ${slug}:`, err.message);
      }
    }
  }

  console.log(`Thumbnails: ${generated} generated, ${skipped} up-to-date.`);
}

generateThumbnails().catch((err) => {
  console.error('Thumbnail generation failed:', err);
  process.exit(1);
});
