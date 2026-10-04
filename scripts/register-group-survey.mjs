#!/usr/bin/env node
/**
 * Register a survey as SNU group-private in Supabase private_content.
 * Usage: node scripts/register-group-survey.mjs
 */
import fs from 'fs/promises';
import path from 'path';
import { getSupabase } from './lib/supabase.mjs';

const sb = getSupabase();
const BUCKET = 'private-covers';
const SLUG = 'physical-ai-manufacturing';

const meta = {
  slug: SLUG,
  content_type: 'surveys',
  visibility: 'group',
  allowed_groups: ['snu'],
  title: { ko: '제조업 피지컬AI 전략 서베이', en: 'Physical AI in Manufacturing: A Strategic Survey' },
  short_title: { ko: '제조업 피지컬AI', en: 'Physical AI Manufacturing' },
  subtitle: { ko: '코스맥스가 알아야 할 2025년 이후 피지컬AI의 현재와 전략', en: 'What Cosmax Needs to Know: Physical AI in Manufacturing 2025+' },
  description: { ko: '공장이 스스로 생각하기 시작했다 — NVIDIA부터 코스맥스까지. — 3 Parts, 9 Chapters', en: 'Factories are starting to think for themselves — from NVIDIA to Cosmax. — 3 Parts, 9 Chapters' },
  embed_url: 'https://physical-ai-manufacturing.pages.dev',
  status: 'active',
  featured: false,
  published_at: '2026-04-28',
  toc: [
    { ko: '피지컬AI 패러다임', en: 'What Is Physical AI' },
    { ko: 'NVIDIA 전략', en: 'NVIDIA Mfg Strategy' },
    { ko: 'OT기업의 전환', en: 'Legacy OT Adapts' },
    { ko: '컨설팅 AI ROI', en: 'McKinsey BCG on ROI' },
    { ko: '자동차·반도체 AI', en: 'Vanguard Industries' },
    { ko: '물류 창고 자율화', en: 'Warehouse AI Lab' },
    { ko: '수작업 산업 AI', en: 'Consumer Mfg AI' },
    { ko: '화장품 기업 과제', en: 'Cosmetics AI Reality' },
    { ko: '코스맥스 전략', en: 'Cosmax AI Strategy' },
  ],
  links: [
    { type: 'demo', url: 'https://physical-ai-manufacturing.pages.dev', label: 'Read Survey' },
  ],
  tech_stack: ['Physical AI', 'Manufacturing', 'Robotics', 'Industry 4.0'],
  survey_number: null,
  cover_image: `${SLUG}/cover.webp`,
};

async function ensureBucket() {
  const { data: buckets } = await sb.storage.listBuckets();
  if (!buckets?.find(b => b.name === BUCKET)) {
    const { error } = await sb.storage.createBucket(BUCKET, { public: false });
    if (error) console.warn('Bucket already exists or error:', error?.message);
  }
}

async function uploadCover() {
  const surveyDir = '/Users/terrytaewoongum/Codes/personal/terryum-ai/terry-surveys/framework/surveys/physical-ai-manufacturing/assets';
  const assets = [
    { file: path.join(surveyDir, 'cover.webp'), key: `${SLUG}/cover.webp`, contentType: 'image/webp' },
    { file: path.join(surveyDir, 'og.png'),    key: `${SLUG}/og.png`,    contentType: 'image/png' },
    { file: path.join(surveyDir, 'thumb.webp'), key: `${SLUG}/thumb.webp`, contentType: 'image/webp' },
  ];

  for (const { file, key, contentType } of assets) {
    try {
      const data = await fs.readFile(file);
      const { error } = await sb.storage.from(BUCKET).upload(key, data, { contentType, upsert: true });
      if (error) console.warn(`  ⚠ Upload ${key}:`, error.message);
      else console.log(`  ✓ Uploaded ${key} (${(data.length/1024).toFixed(0)}KB)`);
    } catch (e) {
      console.warn(`  ⚠ File not found: ${file}`);
    }
  }
}

async function registerSurvey() {
  const { error } = await sb.from('private_content').upsert({
    slug: SLUG,
    content_type: 'surveys',
    group_slug: 'snu',
    title_ko: meta.title.ko,
    title_en: meta.title.en,
    content_ko: meta.description.ko,
    content_en: meta.description.en,
    meta_json: meta,
    cover_image_url: `${SLUG}/cover.webp`,
    status: 'published',
  }, { onConflict: 'slug' });

  if (error) throw new Error(`Upsert survey: ${error.message}`);
  console.log(`✓ Registered survey: ${SLUG} → SNU group private`);
}

async function main() {
  console.log(`Registering ${SLUG} as SNU group-private survey...`);
  await ensureBucket();
  await uploadCover();
  await registerSurvey();
  console.log('Done!');
}

main().catch(e => { console.error(e); process.exit(1); });
