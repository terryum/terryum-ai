/**
 * Prebuild script: copies images from posts/{research,idea}/<slug>/ to public/posts/<slug>/
 * so they are available as static assets at build time.
 *
 * Run: node scripts/copy-post-images.mjs
 */
import { readdir, copyFile, mkdir, stat } from 'fs/promises';
import { join, extname } from 'path';

const POSTS_DIR = join(process.cwd(), 'posts');
const PUBLIC_POSTS_DIR = join(process.cwd(), 'public', 'posts');
const CATEGORIES = ['papers', 'notes', 'tech', 'essays'];

const IMAGE_EXTENSIONS = new Set(['.webp', '.png', '.jpg', '.jpeg', '.gif', '.svg']);

async function copyPostImages() {
  let totalCopied = 0;

  for (const category of CATEGORIES) {
    const catDir = join(POSTS_DIR, category);
    let slugs;
    try {
      slugs = await readdir(catDir);
    } catch {
      continue; // category directory doesn't exist yet
    }

    for (const slug of slugs) {
      const postDir = join(catDir, slug);
      const postStat = await stat(postDir);
      if (!postStat.isDirectory()) continue;

      const files = await readdir(postDir);
      const imageFiles = files.filter((f) => IMAGE_EXTENSIONS.has(extname(f).toLowerCase()));

      if (imageFiles.length === 0) continue;

      const targetDir = join(PUBLIC_POSTS_DIR, slug);
      await mkdir(targetDir, { recursive: true });

      for (const file of imageFiles) {
        await copyFile(join(postDir, file), join(targetDir, file));
        totalCopied++;
      }
    }
  }

  console.log(`Copied ${totalCopied} image(s) from posts/ to public/posts/`);
}

copyPostImages().catch((err) => {
  console.error('Failed to copy post images:', err);
  process.exit(1);
});
