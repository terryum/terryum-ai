/**
 * generate-logos.mjs
 * 브랜드 아이콘으로 사이트 전체에서 사용되는 로고 변형 파일을 일괄 생성합니다.
 *
 * 사용법:
 *   node scripts/generate-logos.mjs [소스이미지경로]
 *
 * 소스이미지 생략 시 기본값: public/images/Icon-Terry-Homepage.png
 *
 * 예시:
 *   node scripts/generate-logos.mjs                              # 기본 소스 사용
 *   node scripts/generate-logos.mjs public/images/NewIcon.png   # 새 아이콘으로 교체
 */

import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { writeFileSync } from 'fs';
import { resolve, dirname, isAbsolute } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// CLI 인수로 소스 이미지 경로 지정 가능
const srcArg = process.argv[2];
const SRC = srcArg
  ? (isAbsolute(srcArg) ? srcArg : resolve(process.cwd(), srcArg))
  : resolve(ROOT, 'public/images/Icon-Terry-Homepage.png');

const IMG_OUT = resolve(ROOT, 'public/images');
const APP_OUT = resolve(ROOT, 'src/app');

// 원형 SVG 마스크 생성
function circleMask(size) {
  const r = size / 2;
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">` +
    `<circle cx="${r}" cy="${r}" r="${r}" fill="white"/>` +
    `</svg>`
  );
}

// 둥근 사각형 SVG 마스크 생성 (반지름 = 크기의 20%)
function roundedMask(size) {
  const rx = Math.round(size * 0.2);
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${size}" height="${size}" rx="${rx}" ry="${rx}" fill="white"/>` +
    `</svg>`
  );
}

// 투명 배경으로 리사이즈
async function makeTransparent(size) {
  return sharp(SRC)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha();
}

// 원형 마스크 적용
async function makeCircle(size) {
  const base = await makeTransparent(size);
  return base.composite([{ input: circleMask(size), blend: 'dest-in' }]);
}

// 흰 배경으로 flatten
async function makeWhite(size) {
  const base = await makeTransparent(size);
  return base
    .flatten({ background: { r: 255, g: 255, b: 255 } });
}

// 흰 배경 + 둥근 모서리
async function makeWhiteRounded(size) {
  const base = await makeTransparent(size);
  // 1) 둥근 마스크 적용 (투명 배경)
  const masked = await base
    .composite([{ input: roundedMask(size), blend: 'dest-in' }])
    .toBuffer();
  // 2) 흰 배경 위에 합성
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  }).composite([{ input: masked, blend: 'over' }]);
}

async function run() {
  console.log('🎨 로고 변형 파일 생성 시작...\n');

  // ── transparent ──────────────────────────────────
  const transparentJobs = [
    { name: 'logo-transparent-128.webp', size: 128, fmt: 'webp' },
    { name: 'logo-transparent-256.webp', size: 256, fmt: 'webp' },
    { name: 'logo-transparent-180.png',  size: 180, fmt: 'png'  },
    { name: 'logo-transparent-512.png',  size: 512, fmt: 'png'  },
  ];
  for (const { name, size, fmt } of transparentJobs) {
    const img = await makeTransparent(size);
    const out = resolve(IMG_OUT, name);
    if (fmt === 'webp') await img.webp({ lossless: true }).toFile(out);
    else                await img.png().toFile(out);
    console.log(`  ✓ ${name}`);
  }

  // ── circle ───────────────────────────────────────
  const circleJobs = [
    { name: 'logo-circle-128.webp', size: 128, fmt: 'webp' },
    { name: 'logo-circle-180.png',  size: 180, fmt: 'png'  },
    { name: 'logo-circle-512.png',  size: 512, fmt: 'png'  },
  ];
  for (const { name, size, fmt } of circleJobs) {
    const img = await makeCircle(size);
    const out = resolve(IMG_OUT, name);
    if (fmt === 'webp') await img.webp({ lossless: true }).toFile(out);
    else                await img.png().toFile(out);
    console.log(`  ✓ ${name}`);
  }

  // ── white ─────────────────────────────────────────
  const whiteJobs = [
    { name: 'logo-white-128.webp', size: 128, fmt: 'webp' },
    { name: 'logo-white-512.png',  size: 512, fmt: 'png'  },
  ];
  for (const { name, size, fmt } of whiteJobs) {
    const img = await makeWhite(size);
    const out = resolve(IMG_OUT, name);
    if (fmt === 'webp') await img.webp({ lossless: true }).toFile(out);
    else                await img.png().toFile(out);
    console.log(`  ✓ ${name}`);
  }

  // ── white-rounded ─────────────────────────────────
  const whiteRoundedJobs = [
    { name: 'logo-white-rounded-128.webp', size: 128, fmt: 'webp' },
    { name: 'logo-white-rounded-512.png',  size: 512, fmt: 'png'  },
  ];
  for (const { name, size, fmt } of whiteRoundedJobs) {
    const img = await makeWhiteRounded(size);
    const out = resolve(IMG_OUT, name);
    if (fmt === 'webp') await img.webp({ lossless: true }).toFile(out);
    else                await img.png().toFile(out);
    console.log(`  ✓ ${name}`);
  }

  // ── logo-t.webp (헤더 소형, CDN 캐시 버스팅 이름 유지) ─
  {
    const img = await makeTransparent(128);
    const out = resolve(IMG_OUT, 'logo-t.webp');
    await img.webp({ lossless: true }).toFile(out);
    console.log('  ✓ logo-t.webp');
  }

  // ── src/app/ Next.js 파비콘 ───────────────────────
  // icon.png (512×512)
  {
    const img = await makeTransparent(512);
    const out = resolve(APP_OUT, 'icon.png');
    await img.png().toFile(out);
    console.log('  ✓ src/app/icon.png');
  }

  // apple-icon.png (180×180)
  {
    const img = await makeTransparent(180);
    const out = resolve(APP_OUT, 'apple-icon.png');
    await img.png().toFile(out);
    console.log('  ✓ src/app/apple-icon.png');
  }

  // favicon.ico (32×32 PNG → ICO)
  {
    const pngBuf = await (await makeTransparent(32)).png().toBuffer();
    const icoBuf = await pngToIco([pngBuf]);
    writeFileSync(resolve(APP_OUT, 'favicon.ico'), icoBuf);
    console.log('  ✓ src/app/favicon.ico');
  }

  console.log('\n✅ 완료! 총 15개 파일 생성됨.');
}

run().catch((err) => {
  console.error('❌ 오류:', err);
  process.exit(1);
});
