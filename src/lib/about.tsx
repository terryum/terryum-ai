import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import type { Locale } from '@/lib/i18n';

import aboutKoRaw from '../../content/about/ko.mdx?raw';
import aboutEnRaw from '../../content/about/en.mdx?raw';
import bioKoRaw from '../../content/bio/ko.mdx?raw';
import bioEnRaw from '../../content/bio/en.mdx?raw';
import mediaJson from '../../content/about/media.json';

export interface MediaItem {
  title_ko: string;
  title_en: string;
  source?: string; // e.g. "YouTube", "Podcast", magazine name
  year?: string | number;
  url: string;
}

export interface AboutMedia {
  currently: { ko: string; en: string };
  talks: MediaItem[];
  writing: MediaItem[];
  books: MediaItem[];
  code: MediaItem[];
}

export interface LocalizedMediaItem {
  title: string;
  source?: string;
  year?: string;
  url: string;
}

export interface LocalizedAboutMedia {
  currently: string;
  talks: LocalizedMediaItem[];
  writing: LocalizedMediaItem[];
  books: LocalizedMediaItem[];
  code: LocalizedMediaItem[];
  hasAnyMedia: boolean;
}

const SOURCES: Record<'about' | 'bio', Record<Locale, string>> = {
  about: { ko: aboutKoRaw, en: aboutEnRaw },
  bio: { ko: bioKoRaw, en: bioEnRaw },
};

// Convert JSX-style attributes (className="...") to HTML (class="...") so rehype-raw
// can parse them. These MDX files use <br className="..."/> for responsive line breaks.
function normalizeMdxForHtml(src: string): string {
  return src.replace(/className=/g, 'class=');
}

function renderMarkdown(dir: 'about' | 'bio', locale: Locale) {
  const source = normalizeMdxForHtml(SOURCES[dir][locale]);
  return (
    <ReactMarkdown rehypePlugins={[rehypeRaw]}>
      {source}
    </ReactMarkdown>
  );
}

function readPlainText(dir: 'about' | 'bio', locale: Locale) {
  return SOURCES[dir][locale].trim();
}

export async function getAboutContent(locale: Locale) {
  return renderMarkdown('about', locale);
}

export async function getBioContent(locale: Locale) {
  return renderMarkdown('bio', locale);
}

export async function getBioPlainText(locale: Locale) {
  return readPlainText('bio', locale);
}

function localizeItem(item: MediaItem, locale: Locale): LocalizedMediaItem {
  return {
    title: (locale === 'ko' ? item.title_ko : item.title_en) || item.title_en || item.title_ko,
    source: item.source,
    year: item.year != null ? String(item.year) : undefined,
    url: item.url,
  };
}

export async function getAboutMedia(locale: Locale): Promise<LocalizedAboutMedia> {
  const data = mediaJson as AboutMedia;
  const talks = (data.talks ?? []).map(i => localizeItem(i, locale));
  const writing = (data.writing ?? []).map(i => localizeItem(i, locale));
  const books = (data.books ?? []).map(i => localizeItem(i, locale));
  const code = (data.code ?? []).map(i => localizeItem(i, locale));
  const currently = (data.currently?.[locale] ?? '').trim();
  return {
    currently,
    talks,
    writing,
    books,
    code,
    hasAnyMedia: talks.length + writing.length + books.length + code.length > 0,
  };
}
