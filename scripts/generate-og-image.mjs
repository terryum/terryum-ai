#!/usr/bin/env node
/**
 * OG 이미지 생성 스크립트
 *
 * posts/{content_type}/{slug}/cover.webp → public/posts/{slug}/og.png (1200×630)
 * 소셜미디어 OG 태그용 PNG 이미지 생성 (WebP 미지원 플랫폼 대응)
 *
 * 사용법:
 *   node scripts/generate-og-image.mjs                          # 신규/변경된 파일만
 *   node scripts/generate-og-image.mjs --all                    # 전체 포스트 재생성
 *   node scripts/generate-og-image.mjs posts/essays/260310-...  # 특정 포스트 디렉토리
 */

import sharp from 'sharp';
import { readdir, mkdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const POSTS_DIR = join(REPO_ROOT, 'posts');
const PUBLIC_DIR = join(REPO_ROOT, 'public', 'posts');

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

async function findCoverFiles() {
  const results = [];
  const contentTypes = await readdir(POSTS_DIR);

  for (const contentType of contentTypes) {
    const typeDir = join(POSTS_DIR, contentType);
    let slugs;
    try {
      slugs = await readdir(typeDir);
    } catch {
      continue; // 파일이면 건너뜀
    }

    for (const slug of slugs) {
      const coverPath = join(typeDir, slug, 'cover.webp');
      if (existsSync(coverPath)) {
        results.push({ slug, coverPath });
      }
    }
  }

  return results;
}

async function generateOgImage(slug, coverPath, force = false) {
  const outDir = join(PUBLIC_DIR, slug);
  const outPath = join(outDir, 'og.png');

  // 이미 최신 파일이 있으면 건너뜀 (--all 없을 때)
  if (!force && existsSync(outPath)) {
    const coverStat = await stat(coverPath);
    const ogStat = await stat(outPath);
    if (ogStat.mtimeMs >= coverStat.mtimeMs) {
      return 'skip';
    }
  }

  await mkdir(outDir, { recursive: true });

  await sharp(coverPath)
    .resize(OG_WIDTH, OG_HEIGHT, {
      fit: 'cover',
      position: 'centre',
    })
    .png({ quality: 90, compressionLevel: 8 })
    .toFile(outPath);

  return 'created';
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--all');
  const specificDir = args.find((a) => !a.startsWith('--'));

  let targets;

  if (specificDir) {
    // 특정 디렉토리 지정: posts/essays/slug 형태
    const parts = specificDir.replace(/\\/g, '/').split('/');
    const slug = parts[parts.length - 1];
    const coverPath = join(REPO_ROOT, specificDir, 'cover.webp');
    if (!existsSync(coverPath)) {
      console.error(`Error: cover.webp not found at ${coverPath}`);
      process.exit(1);
    }
    targets = [{ slug, coverPath }];
  } else {
    targets = await findCoverFiles();
  }

  if (targets.length === 0) {
    console.log('처리할 포스트가 없습니다.');
    return;
  }

  console.log(`OG 이미지 생성 (${force ? '전체 재생성' : '신규/변경만'}) — ${targets.length}개 포스트 확인`);
  console.log(`출력 크기: ${OG_WIDTH}×${OG_HEIGHT}px\n`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const { slug, coverPath } of targets) {
    try {
      const result = await generateOgImage(slug, coverPath, force);
      if (result === 'skip') {
        console.log(`  [skip] ${slug}`);
        skipped++;
      } else {
        console.log(`  [ok]   ${slug} → public/posts/${slug}/og.png`);
        created++;
      }
    } catch (err) {
      console.error(`  [fail] ${slug}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n─── 결과 ───`);
  console.log(`  생성: ${created}  건너뜀: ${skipped}  실패: ${failed}`);

  if (created > 0) {
    console.log(`\n다음 단계: git add public/posts/*/og.png && git commit -m "chore: og.png 생성"`);
  }

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
