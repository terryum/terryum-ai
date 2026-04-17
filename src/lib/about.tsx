import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
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
