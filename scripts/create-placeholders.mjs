import { writeFileSync, copyFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const publicImages = join(root, 'public', 'images');

mkdirSync(publicImages, { recursive: true });

// Profile placeholder SVG (400x400, gray, 1:1 square)
const profileSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#9CA3AF"/>
  <text x="200" y="200" text-anchor="middle" dominant-baseline="middle" fill="#FFFFFF" font-family="Arial,sans-serif" font-size="48">Profile</text>
</svg>`;
writeFileSync(join(publicImages, 'profile-placeholder.svg'), profileSvg);
console.log('Created profile-placeholder.svg');

// OG default SVG (1200x630)
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#F3F4F6"/>
  <text x="600" y="290" text-anchor="middle" dominant-baseline="middle" fill="#111827" font-family="Arial,sans-serif" font-size="64" font-weight="bold">Terry Um</text>
  <text x="600" y="370" text-anchor="middle" dominant-baseline="middle" fill="#6B7280" font-family="Arial,sans-serif" font-size="28">AI &amp; Robotics | Physical AI</text>
</svg>`;
writeFileSync(join(publicImages, 'og-default.svg'), ogSvg);
console.log('Created og-default.svg');

// Copy existing cover.webp to all sample posts
const sourceCover = join(root, 'posts', '2026-03-03-physical-ai-factory-note', 'cover.webp');
const samplePosts = [
  'sample-startup-ai-transformation',
  'sample-vla-for-manufacturing',
  'sample-arxiv-robot-manipulation-survey',
  'sample-diffusion-policy-notes',
  'sample-rt2-vision-language-action',
];

for (const slug of samplePosts) {
  const targetCover = join(root, 'posts', slug, 'cover.webp');
  if (!existsSync(targetCover)) {
    copyFileSync(sourceCover, targetCover);
    console.log(`Copied cover.webp to ${slug}`);
  }
}

console.log('Done!');
