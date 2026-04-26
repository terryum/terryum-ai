import { rm, access, readdir } from 'fs/promises';
import { execSync } from 'child_process';
import { join } from 'path';

// Refuse to wipe .next while another build/deploy is touching the same dirs.
// The classic failure mode is: a previous `opennextjs-cloudflare deploy` is
// still uploading R2 cache objects in the background while a new build:cf
// rm -rf's .next out from under it, producing a parade of random ENOENTs
// (font-manifest, pages-manifest, .nft.json, standalone copy, …) that look
// like a flaky build. Detect and bail out with the matched PIDs instead.
try {
  // Build the set of ancestor PIDs (self → parent → … → init). pgrep -f
  // matches against the FULL cmdline, so a parent shell invoked as
  // `sh -c "node scripts/clean-next.mjs && … && opennextjs-cloudflare build"`
  // matches our pattern via its own arguments — that's a false positive on
  // CI where `npm run build:cf` is the wrapper. Exclude the entire ancestor
  // chain instead of only `process.pid`.
  const ancestors = new Set([process.pid]);
  let cur = process.pid;
  for (let i = 0; i < 16; i++) {
    let ppid;
    try {
      ppid = parseInt(
        execSync(`ps -o ppid= -p ${cur}`, { stdio: ['ignore', 'pipe', 'ignore'] })
          .toString()
          .trim(),
        10,
      );
    } catch { break; }
    if (!ppid || ppid <= 1 || ancestors.has(ppid)) break;
    ancestors.add(ppid);
    cur = ppid;
  }

  const conflicts = execSync(
    'pgrep -fl "opennextjs-cloudflare|next build|next-server|wrangler r2 object put|wrangler deploy" || true',
    { stdio: ['ignore', 'pipe', 'ignore'] },
  )
    .toString()
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => {
      if (!l || l.includes('clean-next.mjs')) return false;
      const m = l.match(/^(\d+)\s+(.+)$/);
      if (!m) return false;
      const [, pidStr, cmd] = m;
      if (ancestors.has(parseInt(pidStr, 10))) return false;
      // Bare shell wrappers (e.g. `sh -c "node clean-next.mjs && opennextjs-cloudflare build"`
      // invoked by `npm run build:cf`) match our pattern via their args, not
      // because they're actually doing I/O on .next. Strip them out.
      const firstBin = (cmd.split(/\s+/)[0] ?? '').split('/').pop() ?? '';
      if (/^(?:sh|bash|dash|zsh|ash)$/.test(firstBin)) return false;
      return true;
    });
  if (conflicts.length) {
    console.error('[clean-next] another build/deploy is still running:');
    for (const line of conflicts) console.error('  ' + line);
    console.error(
      '[clean-next] refusing to wipe .next/.open-next while these are alive.\n' +
        '             pkill -f "opennextjs-cloudflare deploy" / "wrangler r2 object put" first.',
    );
    process.exit(1);
  }
} catch {
  // pgrep missing (non-Unix) — skip the guard rather than fail the build.
}

// CI runners are ephemeral and have no concurrent build/deploy, so we keep
// `.next/cache` to let `actions/cache` accelerate the next `next build` via
// Next.js incremental compile. Locally we still wipe `.next` entirely to
// avoid the random-ENOENT failure mode the conflict guard above describes.
const isCI = process.env.CI === 'true';

let targets;
if (isCI) {
  const entries = await readdir('.next').catch(() => []);
  targets = entries.filter((e) => e !== 'cache').map((e) => join('.next', e));
  targets.push('tsconfig.tsbuildinfo');
} else {
  targets = ['.next', 'tsconfig.tsbuildinfo'];
}

const results = await Promise.allSettled(
  targets.map((t) => rm(t, { recursive: true, force: true }))
);

const removed = [];
const failed = [];
for (let i = 0; i < targets.length; i++) {
  if (results[i].status === 'fulfilled') {
    try {
      await access(targets[i]);
      failed.push(targets[i]);
    } catch {
      removed.push(targets[i]);
    }
  } else {
    failed.push(targets[i]);
  }
}

if (removed.length) console.log(`Cleaned: ${removed.join(', ')}`);
if (failed.length) console.warn(`Failed to clean: ${failed.join(', ')}`);
if (isCI) console.log('[clean-next] CI mode — preserved .next/cache for incremental compile');
