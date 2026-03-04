import Link from 'next/link';
import TagChip from './TagChip';
import SourceInfoBlock from './SourceInfoBlock';
import AppendixSection from './AppendixSection';
import Figure from './Figure';
import LanguageSwitcher from './LanguageSwitcher';
import { localizeGalleryItems } from '@/lib/localize';
import type { PostMeta } from '@/types/post';
import type { Locale } from '@/lib/i18n';

interface ContentDetailPageProps {
  locale: Locale;
  meta: PostMeta;
  children: React.ReactNode;
  alternateLocale?: string | null;
  labels: {
    back_to_list: string;
    source_label: string;
    author_label: string;
    view_all_authors: string;
    references_label: string;
    references_foundational?: string;
    references_recent?: string;
    figures_gallery?: string;
    tables_gallery?: string;
    appendix_label?: string;
    terrys_memo_label?: string;
  };
}

export default function ContentDetailPage({
  locale,
  meta,
  children,
  alternateLocale,
  labels,
}: ContentDetailPageProps) {
  const section = meta.content_type === 'writing' ? 'ideas' : 'research';
  const dateStr = new Date(meta.published_at).toLocaleDateString(
    locale === 'ko' ? 'ko-KR' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );

  const localizedFigures = localizeGalleryItems(meta.figures, locale);
  const localizedTables = localizeGalleryItems(meta.tables, locale);

  // Resolve cover caption with i18n: match cover_caption text against figures[], fallback to cover_caption as-is
  let coverCaption = meta.cover_caption;
  let coverFigureNumber: number | undefined;
  if (meta.cover_caption && meta.figures) {
    const match = meta.figures.find((f) => f.caption === meta.cover_caption);
    if (match) {
      coverCaption = locale === 'ko' && match.caption_ko ? match.caption_ko : match.caption;
      coverFigureNumber = match.number;
    }
  }

  return (
    <article className="max-w-2xl mx-auto px-4 md:px-6 lg:px-8 py-10">
      {/* Back to list */}
      <Link
        href={`/${locale}/${section}`}
        className="text-sm text-text-muted hover:text-accent transition-colors inline-flex items-center gap-1 mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {labels.back_to_list}
      </Link>

      {/* Header meta */}
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight leading-snug">
          {meta.title}
        </h1>
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <time className="text-sm text-text-muted">{dateStr}</time>
          {meta.reading_time_min && (
            <span className="text-sm text-text-muted">
              {meta.reading_time_min} min read
            </span>
          )}
          <LanguageSwitcher locale={locale} />
        </div>
        {meta.tags.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {meta.tags.map((tag) => (
              <TagChip key={tag} tag={tag} />
            ))}
          </div>
        )}
      </header>

      {/* Source info block (reading only) */}
      {meta.content_type === 'reading' && (
        <SourceInfoBlock
          sourceUrl={meta.source_url}
          sourceTitle={meta.source_title}
          sourceAuthor={meta.source_author}
          sourceType={meta.source_type}
          sourceProjectUrl={meta.source_project_url}
          sourceAuthorsFull={meta.source_authors_full}
          firstAuthorScholarUrl={meta.first_author_scholar_url}
          publishedAt={meta.published_at}
          labels={labels}
        />
      )}

      {/* Cover image */}
      {meta.cover_image && (
        <Figure
          src={meta.cover_image}
          caption={coverCaption || ''}
          alt={meta.title}
          number={coverFigureNumber}
          isCover
        />
      )}

      {/* MDX body */}
      <div className="prose max-w-none">
        {children}
      </div>

      {/* Appendix */}
      <AppendixSection
        locale={locale}
        figures={localizedFigures}
        tables={localizedTables}
        references={meta.references}
        terrys_memo={meta.terrys_memo}
        labels={labels}
      />
    </article>
  );
}
