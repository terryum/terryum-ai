/**
 * Prebuild script: copies images from posts/<slug>/ to public/posts/<slug>/
 * so they are available as static assets at build time.
 *
 * Run: node scripts/copy-post-images.mjs
 */
import { readdir, copyFile, mkdir, stat } from 'fs/promises';
import { join, extname } from 'path';

const POSTS_DIR = join(process.cwd(), 'posts');
const PUBLIC_POSTS_DIR = join(process.cwd(), 'public', 'posts');

const IMAGE_EXTENSIONS = new Set(['.webp', '.png', '.jpg', '.jpeg', '.gif', '.svg']);

async function copyPostImages() {
  let slugs;
  try {
    slugs = await readdir(POSTS_DIR);
  } catch {
    console.log('No posts/ directory found, skipping image copy.');
    return;
  }

  let totalCopied = 0;

  for (const slug of slugs) {
    const postDir = join(POSTS_DIR, slug);
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

  console.log(`Copied ${totalCopied} image(s) from posts/ to public/posts/`);
}

copyPostImages().catch((err) => {
  console.error('Failed to copy post images:', err);
  process.exit(1);
});
