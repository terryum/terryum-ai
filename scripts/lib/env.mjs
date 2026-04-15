/**
 * Load .env.local without dotenv dependency.
 * Call once at script entry to populate process.env.
 */
import fs from 'fs/promises';
import path from 'path';
import { ROOT } from './paths.mjs';

export async function loadEnv() {
  const envPath = path.join(ROOT, '.env.local');
  try {
    const content = await fs.readFile(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* .env.local not found */ }
}
