import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import type { Locale } from '@/lib/i18n';

import aboutKoRaw from '../../content/about/ko.mdx?raw';
import aboutEnRaw from '../../content/about/en.mdx?raw';
import missionKoRaw from '../../content/about/mission/ko.mdx?raw';
import missionEnRaw from '../../content/about/mission/en.mdx?raw';
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
  enFeatured?: MediaItem[]; // curated cards for the English Featured Elsewhere row
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
  enSection: LocalizedMediaItem[]; // single curated row driven by media.json `enFeatured`
  hasAnyMedia: boolean;
}

type AboutSource = 'about' | 'bio' | 'mission';

const SOURCES: Record<AboutSource, Record<Locale, string>> = {
  about: { ko: aboutKoRaw, en: aboutEnRaw },
  bio: { ko: bioKoRaw, en: bioEnRaw },
  mission: { ko: missionKoRaw, en: missionEnRaw },
};

// Convert JSX-style attributes (className="...") to HTML (class="...") so rehype-raw
// can parse them. These MDX files use <br className="..."/> for responsive line breaks.
function normalizeMdxForHtml(src: string): string {
  return src.replace(/className=/g, 'class=');
}

function renderMarkdown(dir: AboutSource, locale: Locale) {
  const source = normalizeMdxForHtml(SOURCES[dir][locale]);
  return (
    <ReactMarkdown rehypePlugins={[rehypeRaw]}>
      {source}
    </ReactMarkdown>
  );
}

function readPlainText(dir: AboutSource, locale: Locale) {
  return SOURCES[dir][locale]
    .replace(/<br\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\*_`#>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function getAboutContent(locale: Locale) {
  return renderMarkdown('about', locale);
}

export async function getBioContent(locale: Locale) {
  return renderMarkdown('bio', locale);
}

export async function getMissionContent(locale: Locale) {
  return renderMarkdown('mission', locale);
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

// Auto-derive a thumbnail URL from a YouTube watch/short URL when none is set.
// Uses mqdefault (320×180) which is the only size guaranteed to be 16:9 across
// every video — hqdefault has letterboxing and maxresdefault isn't always present.
function getYouTubeThumbnail(url: string): string | undefined {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : undefined;
}

function localizeItem(item: MediaItem, locale: Locale): LocalizedMediaItem {
  const thumbnail =
    item.thumbnail_url
    ?? (item.url.includes('youtube.com') || item.url.includes('youtu.be')
        ? getYouTubeThumbnail(item.url)
        : undefined);
  return {
    title: (locale === 'ko' ? item.title_ko : item.title_en) || item.title_en || item.title_ko,
    source: item.source,
    year: formatYearMonth(item.year),
    url: item.url,
    thumbnail_url: thumbnail,
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

  // English section: a hand-curated row defined by `enFeatured` in media.json.
  // Order is preserved as-authored — no sorting or filtering.
  const enSection: LocalizedMediaItem[] =
    (data.enFeatured ?? []).map(i => localizeItem(i, locale));

  const currently = (data.currently?.[locale] ?? '').trim();
  const koSectionCount =
    koSection.media.talks.length + koSection.media.interviews.length + koSection.media.speaking.length +
    koSection.books.length + koSection.etc.research.length + koSection.etc.code.length;
  const hasAnyMedia = koSectionCount + enSection.length > 0;

  return { currently, koSection, enSection, hasAnyMedia };
}
