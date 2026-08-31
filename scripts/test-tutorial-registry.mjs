#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'tutorial-registry-'));
await fs.mkdir(path.join(temp, 'projects/surveys'), { recursive: true });
const registryPath = path.join(temp, 'projects/surveys/surveys.json');
await fs.writeFile(registryPath, JSON.stringify({ next_survey_number: 15, next_tutorial_number: 1, surveys: [] }));
const metadataPath = path.join(temp, 'survey.json');
await fs.writeFile(metadataPath, JSON.stringify({
  id: 'demo-tutorial', content_type: 'tutorial', tutorial_number: 1,
  title: { ko: '데모', en: 'Demo' }, description: { ko: '설명', en: 'Description' },
  status: 'wip', parts: [{ chapters: [{ title: { ko: '시작', en: 'Start' }, status: 'planned' }] }],
}));
const command = [path.join(ROOT, 'scripts/register-tutorial.mjs'), `--survey-json=${metadataPath}`, '--preview-url=https://demo-tutorial-preview.pages.dev/', '--cover-image=/cover.webp', '--apply'];
for (let iteration = 0; iteration < 2; iteration += 1) {
  const result = spawnSync(process.execPath, command, { env: { ...process.env, TERRYUM_AI_ROOT: temp }, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}
const registry = JSON.parse(await fs.readFile(registryPath, 'utf8'));
assert.equal(registry.next_survey_number, 15);
assert.equal(registry.next_tutorial_number, 2);
assert.equal(registry.surveys.length, 1);
assert.equal(registry.surveys[0].tutorial_number, 1);
assert.equal(registry.surveys[0].toc[0].status, 'planned');
console.log('✓ tutorial registration is idempotent and does not consume survey numbers');
