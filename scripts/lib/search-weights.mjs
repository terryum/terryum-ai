import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

let cache;

export async function loadWeights() {
  if (cache) return cache;
  const kb = process.env.RESEARCH_KB_PATH
    || path.join(os.homedir(), 'Codes', 'personal', 'terry-papers');
  const raw = await fs.readFile(path.join(kb, 'config', 'search-weights.json'), 'utf8');
  cache = JSON.parse(raw);
  return cache;
}
