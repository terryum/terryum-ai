/**
 * Prebuild script: generates 112×112 center-cropped thumbnails from cover images.
 * Reads cover.webp → sharp center crop (1:1) → resize 112 → webp quality 80.
 *
 * Run: node scripts/generate-thumbnails.mjs
 */
import { readdir, stat, mkdir } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';

const POSTS_DIR = join(process.cwd(), 'posts');
const PUBLIC_POSTS_DIR = join(process.cwd(), 'public', 'posts');
const SIZE = 112;
const CONTENT_DIRS = ['research', 'idea'];

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
      const coverPath = join(postDir, 'cover.webp');
      const outDir = join(PUBLIC_POSTS_DIR, slug);
      const thumbPath = join(outDir, 'cover-thumb.webp');

      // Check cover.webp exists
      let coverStat;
      try {
        coverStat = await stat(coverPath);
      } catch {
        continue; // no cover image
      }

      // Staleness: skip if thumb is newer than cover.webp
      try {
        const ts = await stat(thumbPath);
        if (ts.mtimeMs >= coverStat.mtimeMs) {
          skipped++;
          continue;
        }
      } catch {
        /* thumb doesn't exist yet */
      }

      try {
        await mkdir(outDir, { recursive: true });
        await sharp(coverPath)
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
