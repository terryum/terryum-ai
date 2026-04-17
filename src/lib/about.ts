import { compileMDX } from 'next-mdx-remote/rsc';
import type { Locale } from '@/lib/i18n';

// @ts-expect-error — webpack raw loader returns string
import aboutKoRaw from '../../content/about/ko.mdx?raw';
// @ts-expect-error — webpack raw loader returns string
import aboutEnRaw from '../../content/about/en.mdx?raw';
// @ts-expect-error — webpack raw loader returns string
import bioKoRaw from '../../content/bio/ko.mdx?raw';
// @ts-expect-error — webpack raw loader returns string
import bioEnRaw from '../../content/bio/en.mdx?raw';

const SOURCES: Record<'about' | 'bio', Record<Locale, string>> = {
  about: { ko: aboutKoRaw as string, en: aboutEnRaw as string },
  bio: { ko: bioKoRaw as string, en: bioEnRaw as string },
};

async function renderMDXContent(dir: 'about' | 'bio', locale: Locale) {
  const source = SOURCES[dir][locale];
  const { content } = await compileMDX({
    source,
    options: { parseFrontmatter: false },
  });
  return content;
}

function readPlainText(dir: 'about' | 'bio', locale: Locale) {
  return SOURCES[dir][locale].trim();
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
