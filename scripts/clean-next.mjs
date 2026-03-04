import { rm } from 'fs/promises';

try {
  await Promise.all([
    rm('.next', { recursive: true, force: true }),
    rm('tsconfig.tsbuildinfo', { force: true }),
  ]);
  console.log('Cleaned .next cache + tsconfig.tsbuildinfo');
} catch {
  // files may not exist — no-op
}
