/**
 * Shared path constants for all scripts.
 * Replaces repeated __dirname/ROOT/POSTS_DIR boilerplate.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '../..');
export const POSTS_DIR = path.join(ROOT, 'posts');
export const PUBLIC_POSTS_DIR = path.join(ROOT, 'public', 'posts');
export const SCRIPTS_DIR = path.join(ROOT, 'scripts');

// Load content.config.json
const configPath = path.join(ROOT, 'content.config.json');
let _contentConfig = null;

export async function getContentConfig() {
  if (!_contentConfig) {
    _contentConfig = JSON.parse(await fs.readFile(configPath, 'utf-8'));
  }
  return _contentConfig;
}

export async function getContentDirs() {
  const config = await getContentConfig();
  return config.allContentDirs || ['papers', 'essays', 'memos'];
}
