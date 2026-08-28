#!/usr/bin/env node

import crypto from 'crypto';
import { loadEnv } from './lib/env.mjs';

await loadEnv();

const baseUrl = process.env.TEST_BASE_URL ?? 'http://localhost:3040';
const privateSurveys = [
  ['robot-motion-101', '로봇 움직이기 101 (1/3)'],
  ['robot-motion-101-part-2', '로봇 움직이기 101 (2/3)'],
  ['robot-motion-101-part-3', '로봇 움직이기 101 (3/3)'],
  ['chinese-robot-company-map', '중국 로봇기업 지도'],
];

function assert(value, message) {
  if (!value) throw new Error(message);
}

function adminCookie() {
  const email = process.env.ADMIN_EMAIL;
  const secret = process.env.SESSION_SECRET;
  if (!email || !secret) throw new Error('ADMIN_EMAIL and SESSION_SECRET are required');
  const payload = `user:${email.toLowerCase()}:admin::${Date.now()}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `id-session=${payload}.${signature}`;
}

async function request(path, cookie) {
  return fetch(`${baseUrl}${path}`, {
    redirect: 'manual',
    headers: cookie ? { cookie } : {},
  });
}

const anonymousHome = await request('/ko');
const anonymousHtml = await anonymousHome.text();
assert(anonymousHome.status === 200, `anonymous home returned ${anonymousHome.status}`);
for (const [, title] of privateSurveys) {
  assert(!anonymousHtml.includes(title), `anonymous home leaked ${title}`);
}

for (const [slug] of privateSurveys) {
  const response = await request(`/ko/surveys/${slug}`);
  assert(response.status === 307, `${slug}: anonymous detail returned ${response.status}`);
  assert(response.headers.get('location')?.startsWith('/login?redirect='), `${slug}: anonymous detail did not redirect to login`);
}

const cookie = adminCookie();
const adminHome = await request('/ko', cookie);
const adminHtml = await adminHome.text();
assert(adminHome.status === 200, `admin home returned ${adminHome.status}`);
for (const [, title] of privateSurveys) {
  assert(adminHtml.includes(title), `admin home omitted ${title}`);
}
assert(adminHtml.includes('aria-label="비공개"'), 'admin home omitted the private lock icon');

for (const [slug] of privateSurveys) {
  const response = await request(`/ko/surveys/${slug}`, cookie);
  const redirectEvidence = `${response.headers.get('location') ?? ''}\n${await response.text()}`;
  // A redirect thrown after a dynamic Server Component starts streaming is
  // encoded in the RSC/HTML response (HTTP 200) instead of a bare HTTP 307.
  assert([200, 307].includes(response.status), `${slug}: admin detail returned ${response.status}`);
  assert(redirectEvidence.includes(`${slug}.pages.dev/ko/`), `${slug}: admin detail did not redirect to protected Pages`);
}

const publicSurvey = await request('/ko/surveys/large-data-manipulation');
assert(publicSurvey.status === 200, `public survey regression: returned ${publicSurvey.status}`);

console.log('✓ Anonymous/admin visibility and survey routing checks passed');
