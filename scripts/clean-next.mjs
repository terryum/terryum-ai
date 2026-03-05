import { rm, access } from 'fs/promises';

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
