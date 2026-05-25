#!/usr/bin/env node

/**
 * Guarded Cloudflare deploy for local and CI use.
 *
 * OpenNext can fall back to many sequential R2 uploads when the batch-upload
 * credentials are missing. That fallback is correct but far too slow for
 * routine publishing, so this script fails before deploy unless the fast path
 * environment is present.
 */

import { spawn } from 'node:child_process';
import { mkdir, appendFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './lib/env.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const TIMING_LOG = join(REPO_ROOT, '.tmp', 'publish-timings.jsonl');

const args = process.argv.slice(2);
const checkOnly = args.includes('--check-env');
const passthroughArgs = args.filter((arg) => arg !== '--check-env');

await loadEnv();

if (!process.env.CF_ACCOUNT_ID && process.env.CLOUDFLARE_ACCOUNT_ID) {
  process.env.CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
}

const required = [
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'CF_ACCOUNT_ID',
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error('[deploy-cf-fast] Refusing to deploy without fast R2 batch-upload env.');
  console.error(`[deploy-cf-fast] Missing: ${missing.join(', ')}`);
  console.error(
    '[deploy-cf-fast] Load .env.local or use GitHub Actions. This avoids OpenNext sequential R2 cache uploads.',
  );
  process.exit(2);
}

console.log('[deploy-cf-fast] Fast R2 batch-upload env present.');

if (checkOnly) {
  process.exit(0);
}

async function recordTiming(ms, status) {
  try {
    await mkdir(dirname(TIMING_LOG), { recursive: true });
    await appendFile(
      TIMING_LOG,
      `${JSON.stringify({
        ts: new Date().toISOString(),
        phase: 'cloudflare-deploy',
        command: 'opennextjs-cloudflare deploy',
        status,
        duration_ms: ms,
      })}\n`,
    );
  } catch {
    // Timing logs are best effort; do not fail deploy because of local logging.
  }
}

const start = Date.now();
const child = spawn('npx', ['opennextjs-cloudflare', 'deploy', ...passthroughArgs], {
  cwd: REPO_ROOT,
  env: process.env,
  stdio: 'inherit',
});

child.on('exit', async (code) => {
  const ms = Date.now() - start;
  await recordTiming(ms, code === 0 ? 'ok' : `exit-${code}`);
  process.exit(code ?? 1);
});

child.on('error', async (err) => {
  const ms = Date.now() - start;
  await recordTiming(ms, `error:${err.code || err.message}`);
  console.error('[deploy-cf-fast] Failed to start deploy:', err.message);
  process.exit(1);
});
