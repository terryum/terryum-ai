#!/usr/bin/env node

import crypto from 'crypto';
import { loadEnv } from './lib/env.mjs';

await loadEnv();

const baseUrl = process.env.TEST_BASE_URL ?? 'http://localhost:3040';
const isLocalTarget = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/.test(baseUrl);
const privateSurveyBaseUrl = isLocalTarget
  ? baseUrl
  : 'https://private-surveys.terryum.ai';
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
  return identityCookie('admin', null);
}

function memberCookie(group = null) {
  return identityCookie('member', group);
}

function identityCookie(role, group) {
  const email = process.env.ADMIN_EMAIL;
  const secret = process.env.SESSION_SECRET;
  if (!email || !secret) throw new Error('ADMIN_EMAIL and SESSION_SECRET are required');
  const identityEmail = role === 'admin' ? email.toLowerCase() : 'member@example.com';
  const payload = `user:${identityEmail}:${role}:${group ?? ''}:${Date.now()}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `id-session=${payload}.${signature}`;
}

async function request(path, cookie) {
  return requestUrl(`${baseUrl}${path}`, cookie);
}

async function privateSurveyRequest(path, cookie) {
  return requestUrl(`${privateSurveyBaseUrl}${path}`, cookie);
}

async function requestUrl(url, cookie) {
  return fetch(url, {
    redirect: 'manual',
    headers: cookie ? { cookie } : {},
  });
}

const anonymousHome = await request('/ko');
const anonymousHtml = await anonymousHome.text();
assert(anonymousHome.status === 200, `anonymous home returned ${anonymousHome.status}`);
const anonymousSurveyList = await request('/ko/surveys');
const anonymousSurveyListHtml = await anonymousSurveyList.text();
assert(anonymousSurveyList.status === 200, `anonymous survey list returned ${anonymousSurveyList.status}`);
for (const [slug, title] of privateSurveys) {
  assert(!anonymousHtml.includes(title), `anonymous home leaked ${title}`);
  assert(!anonymousSurveyListHtml.includes(slug), `anonymous survey list leaked ${slug}`);
}

for (const [slug] of privateSurveys) {
  const response = await request(`/ko/surveys/${slug}?chapter=ch03.html&y=640`);
  assert(response.status === 307, `${slug}: anonymous detail returned ${response.status}`);
  assert(response.headers.get('location')?.startsWith('/login?redirect='), `${slug}: anonymous detail did not redirect to login`);
  assert(response.headers.get('location')?.includes('chapter%3Dch03.html'), `${slug}: login return lost chapter`);
  assert(response.headers.get('location')?.includes('y%3D640'), `${slug}: login return lost scroll position`);
}

const cookie = adminCookie();
const member = memberCookie();
const memberHome = await request('/ko', member);
const memberHomeHtml = await memberHome.text();
const memberSurveyList = await request('/ko/surveys', member);
const memberSurveyListHtml = await memberSurveyList.text();
assert(memberHome.status === 200, `member home returned ${memberHome.status}`);
assert(memberSurveyList.status === 200, `member survey list returned ${memberSurveyList.status}`);
for (const [slug, title] of privateSurveys) {
  assert(!memberHomeHtml.includes(title), `member home leaked ${title}`);
  assert(!memberSurveyListHtml.includes(slug), `member survey list leaked ${slug}`);
}

const adminHome = await request('/ko', cookie);
const adminHtml = await adminHome.text();
assert(adminHome.status === 200, `admin home returned ${adminHome.status}`);
for (const [, title] of privateSurveys) {
  assert(adminHtml.includes(title), `admin home omitted ${title}`);
}
assert(adminHtml.includes('aria-label="비공개"'), 'admin home omitted the private lock icon');

for (const [slug] of privateSurveys) {
  const memberResponse = await request(`/ko/surveys/${slug}`, member);
  assert(memberResponse.status === 404, `${slug}: member detail returned ${memberResponse.status}`);

  for (const locale of ['ko', 'en']) {
    const response = await request(`/${locale}/surveys/${slug}`, cookie);
    const html = await response.text();
    assert(response.status === 200, `${slug}/${locale}: admin detail returned ${response.status}`);
    assert(
      html.includes(`/api/private-surveys/${slug}/${locale}/`),
      `${slug}/${locale}: admin detail omitted the private proxy iframe`,
    );
    assert(!html.includes(`${slug}.pages.dev`), `${slug}/${locale}: detail leaked the Pages URL`);
  }

  const proxyPath = `/api/private-surveys/${slug}/ko/`;
  const anonymousProxy = await privateSurveyRequest(proxyPath);
  assert(anonymousProxy.status === 404, `${slug}: anonymous proxy returned ${anonymousProxy.status}`);
  assert((await anonymousProxy.text()) === '', `${slug}: anonymous proxy returned a body`);

  const memberProxy = await privateSurveyRequest(proxyPath, member);
  assert(memberProxy.status === 404, `${slug}: member proxy returned ${memberProxy.status}`);
  assert((await memberProxy.text()) === '', `${slug}: member proxy returned a body`);

  const adminProxy = await privateSurveyRequest(proxyPath, cookie);
  // Production credentials intentionally exist only as Worker secrets, so a
  // production target must serve the origin even though they are absent from
  // the local process environment.
  const accessConfigured = !isLocalTarget
    || Boolean(process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET);
  assert(
    adminProxy.status === (accessConfigured ? 200 : 503),
    `${slug}: admin proxy returned ${adminProxy.status}`,
  );
  assert(adminProxy.headers.get('cache-control') === 'private, no-store', `${slug}: unsafe proxy caching`);
  assert(!adminProxy.headers.has('set-cookie'), `${slug}: proxy leaked an origin cookie`);
  assert(!adminProxy.headers.has('cf-access-client-id'), `${slug}: proxy leaked the Service Token ID`);
  assert(!adminProxy.headers.has('cf-access-client-secret'), `${slug}: proxy leaked the Service Token secret`);
  if (accessConfigured) {
    assert(
      adminProxy.headers.get('x-robots-tag') === 'noindex, noarchive',
      `${slug}: proxy omitted noindex/noarchive`,
    );
    assert(
      adminProxy.headers.get('content-security-policy')?.includes('frame-ancestors'),
      `${slug}: proxy omitted frame-ancestors`,
    );

    const englishProxy = await privateSurveyRequest(`/api/private-surveys/${slug}/en/`, cookie);
    assert(englishProxy.status === 200, `${slug}: English admin proxy returned ${englishProxy.status}`);
  }
}

const unknownProxy = await privateSurveyRequest('/api/private-surveys/not-a-survey/ko/', cookie);
assert(unknownProxy.status === 404, `unknown private proxy returned ${unknownProxy.status}`);
assert((await unknownProxy.text()) === '', 'unknown private proxy returned a body');

if (!isLocalTarget) {
  const wrongHostProxy = await request('/api/private-surveys/robot-motion-101/ko/', cookie);
  assert(wrongHostProxy.status === 404, `www-hosted private proxy returned ${wrongHostProxy.status}`);
}

const publicSurvey = await request('/ko/surveys/large-data-manipulation');
assert(publicSurvey.status === 200, `public survey regression: returned ${publicSurvey.status}`);

console.log('✓ Anonymous/member/admin visibility and private survey proxy checks passed');
