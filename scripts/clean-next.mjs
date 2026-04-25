import { rm, access } from 'fs/promises';
import { execSync } from 'child_process';

// Refuse to wipe .next while another build/deploy is touching the same dirs.
// The classic failure mode is: a previous `opennextjs-cloudflare deploy` is
// still uploading R2 cache objects in the background while a new build:cf
// rm -rf's .next out from under it, producing a parade of random ENOENTs
// (font-manifest, pages-manifest, .nft.json, standalone copy, …) that look
// like a flaky build. Detect and bail out with the matched PIDs instead.
try {
  const conflicts = execSync(
    'pgrep -fl "opennextjs-cloudflare|next build|next-server|wrangler r2 object put|wrangler deploy" || true',
    { stdio: ['ignore', 'pipe', 'ignore'] },
  )
    .toString()
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.includes('clean-next.mjs') && !l.includes(`pid ${process.pid}`));
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

const targets = ['.next', 'tsconfig.tsbuildinfo'];

const results = await Promise.allSettled(
  targets.map((t) => rm(t, { recursive: true, force: true }))
);

const removed = [];
const failed = [];
for (let i = 0; i < targets.length; i++) {
  if (results[i].status === 'fulfilled') {
    // Verify it's actually gone
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
