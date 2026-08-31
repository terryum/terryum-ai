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
