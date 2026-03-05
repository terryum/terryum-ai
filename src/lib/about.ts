import fs from 'fs/promises';
import path from 'path';
import { compileMDX } from 'next-mdx-remote/rsc';
import type { Locale } from '@/lib/i18n';

const CONTENT_DIR = path.join(process.cwd(), 'content');

async function renderMDXContent(dir: string, locale: Locale) {
  const filePath = path.join(CONTENT_DIR, dir, `${locale}.mdx`);
  const source = await fs.readFile(filePath, 'utf-8');
  const { content } = await compileMDX({
    source,
    options: { parseFrontmatter: false },
  });
  return content;
}

/** Read plain text from MDX (no rendering, for meta description etc.) */
async function readPlainText(dir: string, locale: Locale) {
  const filePath = path.join(CONTENT_DIR, dir, `${locale}.mdx`);
  const source = await fs.readFile(filePath, 'utf-8');
  return source.trim();
}

export async function getAboutContent(locale: Locale) {
  return renderMDXContent('about', locale);
}

export async function getBioContent(locale: Locale) {
  return renderMDXContent('bio', locale);
}

export async function getBioPlainText(locale: Locale) {
  return readPlainText('bio', locale);
}
