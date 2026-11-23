#!/usr/bin/env node

import assert from 'node:assert/strict';
import { accessPlan } from './lib/cloudflare-survey-access.mjs';

const first = accessPlan({ projectExists: false, application: null, policies: [] });
assert.deepEqual(first, { createProject: true, createApplication: true, createAdminPolicy: true, createServicePolicy: true });
const second = accessPlan({ projectExists: true, application: { id: 'app' }, policies: [{ name: 'terryum-admin' }, { name: 'terryum-service-token' }] });
assert.deepEqual(second, { createProject: false, createApplication: false, createAdminPolicy: false, createServicePolicy: false });
const output = JSON.stringify(second);
assert(!/secret|token_id|cookie|authorization/i.test(output));
console.log('✓ preview Access reconciliation is idempotent and secret-free');

const { provisionSurveyPreview } = await import('./lib/cloudflare-survey-access.mjs');
const origin = 'example-preview.pages.dev';
const apps = [];
const policies = new Map();
let project = false;
let posts = 0;
globalThis.fetch = async (url, request) => {
  const path = new URL(url).pathname;
  const write = request.method === 'POST';
  const body = write ? JSON.parse(request.body) : null;
  if (write) posts += 1;
  const ok = (result) => Response.json({ success: true, result });
  if (path.endsWith('/pages/projects/example-preview')) {
    return project ? ok({ id: 'project' }) : Response.json({ success: false }, { status: 404 });
  }
  if (path.endsWith('/pages/projects') && write) {
    project = true;
    return ok({ id: 'project' });
  }
  if (path.endsWith('/access/apps')) {
    if (!write) return ok(apps);
    const app = { ...body, id: String(apps.length) };
    apps.push(app);
    policies.set(app.id, []);
    return ok(app);
  }
  const id = path.match(/\/apps\/(\d+)\/policies$/)?.[1];
  if (id === undefined) throw new Error(`Unexpected endpoint ${path}`);
  if (write) policies.get(id).push(body);
  return ok(policies.get(id));
};
const input = { accountId: 'test', apiToken: 'test', project: 'example-preview', hostname: origin, adminEmail: 'admin@example.com', serviceTokenId: 'existing-token' };
const dryRun = await provisionSurveyPreview({ ...input, dryRun: true });
assert.deepEqual(dryRun.plans.map(({ host }) => host), [origin, `*.${origin}`]);
assert.equal(posts, 0);
assert.deepEqual((await provisionSurveyPreview(input)).hosts, [origin, `*.${origin}`]);
assert.equal(posts, 7);
assert.equal(policies.get('1').length, 2);
await provisionSurveyPreview(input);
assert.equal(posts, 7);
policies.get('1').push({ name: 'public-bypass', decision: 'bypass', include: [{ everyone: {} }] });
await assert.rejects(() => provisionSurveyPreview(input), /unexpected grant/);
assert.equal(posts, 7);
