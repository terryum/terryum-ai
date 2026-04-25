#!/usr/bin/env node
/**
 * check-bundle-size.mjs — measure the Cloudflare Workers bundle that
 * `npx wrangler deploy` would actually upload, and warn if the gzipped
 * size approaches the Workers paid 10 MiB limit.
 *
 * We invoke `wrangler deploy --dry-run` (no auth required) and parse the
 * "Total Upload: X KiB / gzip: Y KiB" line. Defaulting to a 5 MiB gzipped
 * threshold (50% of paid limit) gives a wide margin before action is
 * actually required. Pass --strict to exit non-zero when the threshold is
 * crossed (suitable for CI).
 *
 * Prerequisite: `npm run build:cf` has run, so `.open-next/` exists.
 *
 * Usage:
 *   node scripts/check-bundle-size.mjs                  # info only
 *   node scripts/check-bundle-size.mjs --strict         # exit 1 on warn
 *   node scripts/check-bundle-size.mjs --threshold-mb 5
 */
import { spawnSync } from 'child_process';

function parseArgs(argv) {
  const args = { strict: false, thresholdMb: 5 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--strict') args.strict = true;
    else if (a === '--threshold-mb') args.thresholdMb = Number(argv[++i]);
    else if (a.startsWith('--threshold-mb=')) args.thresholdMb = Number(a.slice('--threshold-mb='.length));
    else throw new Error(`Unknown arg: ${a}`);
  }
  if (!Number.isFinite(args.thresholdMb) || args.thresholdMb <= 0) {
    throw new Error(`--threshold-mb must be a positive number (got ${args.thresholdMb}).`);
  }
  return args;
}

function runWranglerDryRun() {
  const r = spawnSync('npx', ['wrangler', 'deploy', '--dry-run'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // wrangler writes its progress to stderr too; concatenate both.
  const out = (r.stdout || '') + '\n' + (r.stderr || '');
  if (r.status !== 0 && !/Total Upload:/.test(out)) {
    console.error(out);
    throw new Error(`wrangler deploy --dry-run exited with status ${r.status}.`);
  }
  return out;
}

function parseTotals(out) {
  // Line shape: "Total Upload: 11420.73 KiB / gzip: 2469.21 KiB"
  const m = out.match(/Total Upload:\s*([\d.]+)\s*KiB\s*\/\s*gzip:\s*([\d.]+)\s*KiB/);
  if (!m) throw new Error('Could not parse "Total Upload" line from wrangler output.');
  return { rawKiB: Number(m[1]), gzipKiB: Number(m[2]) };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const out = runWranglerDryRun();
  const { rawKiB, gzipKiB } = parseTotals(out);
  const rawMiB = rawKiB / 1024;
  const gzipMiB = gzipKiB / 1024;

  console.log(`raw=${rawMiB.toFixed(2)} MiB  gzip=${gzipMiB.toFixed(2)} MiB`);

  if (gzipMiB > args.thresholdMb) {
    console.warn(`WARN: gzipped bundle ${gzipMiB.toFixed(2)} MiB exceeds threshold ${args.thresholdMb} MiB.`);
    if (args.strict) process.exit(1);
  } else {
    console.log(`OK: gzipped bundle ${gzipMiB.toFixed(2)} MiB under ${args.thresholdMb} MiB threshold.`);
  }
}

main();
