/**
 * Prebuild script: generates 288×288 square thumbnails for post cards.
 * Uses cover crop by default; meta.json can override crop position.
 *
 * meta.json fields:
 *   - thumb_source: source image (e.g. "./fig-6.jpg"), fallback: cover.webp
 *   - thumb_position: sharp crop position (e.g. "top", "left", "centre")
 *   - thumb_extract: {left, top, width, height} for manual crop region
 *   - thumb_fit: 'cover' (default, crops to fill) or 'contain' (shrink+transparent pad)
 *   - thumb_padding: 0–1 fill ratio for contain fit (e.g. 0.75 = image fills 75% of canvas)
 *   - thumb_background: override padding color {r,g,b,alpha}, default transparent for contain
 *
 * Run: node scripts/generate-thumbnails.mjs
 */
import { readdir, readFile, stat, mkdir } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';

const POSTS_DIR = join(process.cwd(), 'posts');
const PUBLIC_POSTS_DIR = join(process.cwd(), 'public', 'posts');
const SIZE = 288; // 2x retina for 144px display
const CONTENT_DIRS = ['papers', 'essays', 'tech', 'memos'];

/** Read thumbnail config from meta.json */
async function getThumbConfig(postDir) {
  try {
    const raw = await readFile(join(postDir, 'meta.json'), 'utf-8');
    const meta = JSON.parse(raw);
    return {
      source: meta.thumb_source
        ? join(postDir, meta.thumb_source.replace(/^\.\//, ''))
        : null,
      position: meta.thumb_position || 'centre',
      extract: meta.thumb_extract || null, // {left, top, width, height}
      fit: meta.thumb_fit || 'cover', // 'cover' (crop) or 'contain' (shrink+pad)
      padding: meta.thumb_padding ?? 1.0, // 0–1: fill ratio for contain (1 = full canvas)
      background: meta.thumb_background || (meta.thumb_fit === 'contain'
        ? { r: 0, g: 0, b: 0, alpha: 0 }   // transparent for contain (blends with card bg)
        : { r: 255, g: 255, b: 255, alpha: 1 }),
    };
  } catch {
    return { source: null, position: 'centre', extract: null };
  }
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

      // Determine source and crop config
      const config = await getThumbConfig(postDir);
      const coverPath = join(postDir, 'cover.webp');
      const srcPath = config.source || coverPath;

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
        let pipeline = sharp(srcPath);
        // Manual extract region takes priority over position-based crop
        if (config.extract) {
          pipeline = pipeline.extract(config.extract);
        }
        if (config.fit === 'contain' && config.padding < 1.0) {
          // Resize to padded inner size, then extend to full canvas with transparent bg
          const inner = Math.round(SIZE * config.padding);
          const padA = Math.floor((SIZE - inner) / 2);
          const padB = SIZE - inner - padA;
          pipeline = pipeline
            .resize(inner, inner, { fit: 'contain', background: config.background })
            .extend({ top: padA, bottom: padB, left: padA, right: padB, background: config.background });
        } else {
          pipeline = pipeline
            .resize(SIZE, SIZE, { fit: config.fit, position: config.position, background: config.background });
        }
        pipeline = pipeline.webp({ quality: 80 });
        await pipeline.toFile(thumbPath);
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
