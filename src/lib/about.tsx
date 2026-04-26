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
  content_lang?: 'ko' | 'en'; // language of the content; routes the item into the matching section
  thumbnail_url?: string;     // optional cover image (used by the Books gallery)
  role?: string;              // e.g. "집필", "참여", "감수" — shown in the meta line for Books
}

export interface AboutMedia {
  currently: { ko: string; en: string };
  talks: MediaItem[];
  interviews: MediaItem[];
  speaking: MediaItem[];   // 강연/세미나 한 줄 — Media 그룹의 한 sub-section
  writing: MediaItem[];    // hidden for now (empty); kept for future use
  books: MediaItem[];
  research: MediaItem[];   // 대표 논문 — Etc. 그룹
  code: MediaItem[];       // GitHub repos — Etc. 그룹
}

export interface LocalizedMediaItem {
  title: string;
  source?: string;
  year?: string;
  url: string;
  thumbnail_url?: string;
  role?: string;
}

// Korean section is grouped: Media (Talks / Interviews / Speaking),
// Books & Writings (gallery), and Etc. (Research / Code).
export interface KoSectionMedia {
  media: {
    talks: LocalizedMediaItem[];
    interviews: LocalizedMediaItem[];
    speaking: LocalizedMediaItem[];
  };
  books: LocalizedMediaItem[];
  etc: {
    research: LocalizedMediaItem[];
    code: LocalizedMediaItem[];
  };
}

export interface LocalizedAboutMedia {
  currently: string;
  koSection: KoSectionMedia;
  enSection: LocalizedMediaItem[]; // single flat list — English content is sparse
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

// "2025-05" → "May 2025", "2024" → "2024", "2024–" → "2024–" (passthrough for non-ISO).
function formatYearMonth(input?: string | number): string | undefined {
  if (input == null) return undefined;
  const raw = String(input).trim();
  if (!raw) return undefined;
  const m = raw.match(/^(\d{4})-(\d{1,2})/);
  if (!m) return raw;
  const date = new Date(`${m[1]}-${m[2].padStart(2, '0')}-01T00:00:00Z`);
  if (isNaN(date.getTime())) return raw;
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

// Sortable key: "YYYY-MM" stripped from any year-like prefix; missing → "0000-00".
function getSortKey(item: MediaItem): string {
  if (item.year == null) return '0000-00';
  const m = String(item.year).match(/^(\d{4})(?:-(\d{1,2}))?/);
  if (!m) return '0000-00';
  return `${m[1]}-${(m[2] ?? '00').padStart(2, '0')}`;
}

function sortNewestFirst(items: MediaItem[]): MediaItem[] {
  return items.slice().sort((a, b) => getSortKey(b).localeCompare(getSortKey(a)));
}

function localizeItem(item: MediaItem, locale: Locale): LocalizedMediaItem {
  return {
    title: (locale === 'ko' ? item.title_ko : item.title_en) || item.title_en || item.title_ko,
    source: item.source,
    year: formatYearMonth(item.year),
    url: item.url,
    thumbnail_url: item.thumbnail_url,
    role: item.role,
  };
}

// Routes items into Korean / English sections by content_lang. Items without
// content_lang (e.g. bilingual books) appear in BOTH sections.
function splitByContentLang(items: MediaItem[]): { ko: MediaItem[]; en: MediaItem[] } {
  const ko: MediaItem[] = [];
  const en: MediaItem[] = [];
  for (const item of items) {
    if (item.content_lang === 'en') en.push(item);
    else if (item.content_lang === 'ko') ko.push(item);
    else { ko.push(item); en.push(item); }
  }
  return { ko, en };
}

export async function getAboutMedia(locale: Locale): Promise<LocalizedAboutMedia> {
  const data = mediaJson as AboutMedia;
  const allCategories = {
    talks:      sortNewestFirst(data.talks      ?? []),
    interviews: sortNewestFirst(data.interviews ?? []),
    speaking:   sortNewestFirst(data.speaking   ?? []),
    writing:    sortNewestFirst(data.writing    ?? []),
    books:      sortNewestFirst(data.books      ?? []),
    research:   sortNewestFirst(data.research   ?? []),
    code:       sortNewestFirst(data.code       ?? []),
  };

  // Korean section keeps category structure
  const koSplits = {
    talks:      splitByContentLang(allCategories.talks),
    interviews: splitByContentLang(allCategories.interviews),
    speaking:   splitByContentLang(allCategories.speaking),
    writing:    splitByContentLang(allCategories.writing),
    books:      splitByContentLang(allCategories.books),
    research:   splitByContentLang(allCategories.research),
    code:       splitByContentLang(allCategories.code),
  };

  const koSection: KoSectionMedia = {
    media: {
      talks:      koSplits.talks.ko.map(i => localizeItem(i, locale)),
      interviews: koSplits.interviews.ko.map(i => localizeItem(i, locale)),
      speaking:   koSplits.speaking.ko.map(i => localizeItem(i, locale)),
    },
    books: koSplits.books.ko.map(i => localizeItem(i, locale)),
    etc: {
      research: koSplits.research.ko.map(i => localizeItem(i, locale)),
      code:     koSplits.code.ko.map(i => localizeItem(i, locale)),
    },
  };

  // English section: flatten all categories, sort newest-first as one list
  const enRaw = [
    ...koSplits.talks.en,
    ...koSplits.interviews.en,
    ...koSplits.speaking.en,
    ...koSplits.writing.en,
    ...koSplits.books.en,
    ...koSplits.research.en,
    ...koSplits.code.en,
  ];
  const enSection = sortNewestFirst(enRaw).map(i => localizeItem(i, locale));

  const currently = (data.currently?.[locale] ?? '').trim();
  const koCount =
    koSection.media.talks.length +
    koSection.media.interviews.length +
    koSection.media.speaking.length +
    koSection.books.length +
    koSection.etc.research.length +
    koSection.etc.code.length;
  const hasAnyMedia = koCount + enSection.length > 0;

  return { currently, koSection, enSection, hasAnyMedia };
}
