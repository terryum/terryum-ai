import Link from 'next/link';
import TagChip from './TagChip';
import SourceInfoBlock from './SourceInfoBlock';
import AppendixSection from './AppendixSection';
import Figure from './Figure';
import LanguageSwitcher from './LanguageSwitcher';
import ShareButton from './ShareButton';
import RelatedPapers from './RelatedPapers';
import SubstackSubscribe from './SubstackSubscribe';
import { localizeGalleryItems } from '@/lib/localize';
import { FigureGroupProvider } from '@/contexts/FigureGroupContext';
import { formatPostDate } from '@/lib/display';
import type { PostMeta } from '@/types/post';
import type { Locale } from '@/lib/i18n';
import type { RelatedPostData, AdjacentPosts } from '@/lib/content-page-helpers';

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
    prev?: string;
    next?: string;
  };
  relatedPosts?: RelatedPostData[];
  taxonomyBreadcrumb?: { id: string; label: { ko: string; en: string } }[];
  adjacentPosts?: AdjacentPosts;
}

export default function ContentDetailPage({
  locale,
  meta,
  children,
  alternateLocale,
  labels,
  relatedPosts = [],
  taxonomyBreadcrumb = [],
  adjacentPosts,
}: ContentDetailPageProps) {
  const tabSlug = meta.content_type;
  const section = `posts?tab=${tabSlug}`;
  const dateStr = formatPostDate(meta.published_at, locale);

  const localizedFigures = localizeGalleryItems(meta.figures, locale);
  const localizedTables = localizeGalleryItems(meta.tables, locale);

  // Resolve cover caption with i18n: use cover_figure_number → figures lookup, fallback to cover_caption as-is
  let coverCaption = meta.cover_caption;
  let coverFigureNumber: number | undefined = meta.cover_figure_number;
  if (meta.figures) {
    const match = meta.cover_figure_number != null
      ? meta.figures.find((f) => f.number === meta.cover_figure_number)
      : meta.cover_caption
        ? meta.figures.find((f) => f.caption === meta.cover_caption)
        : undefined;
    if (match) {
      coverCaption = locale === 'ko' && match.caption_ko ? match.caption_ko : match.caption;
      coverFigureNumber = match.number;
    }
  }

  return (
    <article className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8 py-10">
      {/* Back to list / Taxonomy breadcrumb */}
      <div className="flex items-center gap-1.5 flex-wrap mb-6">
        <Link
          href={`/${locale}/${section}`}
          className="text-sm text-text-muted hover:text-accent transition-colors inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {labels.back_to_list}
        </Link>
        {taxonomyBreadcrumb.map((node) => (
          <span key={node.id} className="flex items-center gap-1.5">
            <span className="text-text-muted text-sm">/</span>
            <span className="text-sm text-text-muted">
              {locale === 'ko' ? node.label.ko : node.label.en}
            </span>
          </span>
        ))}
      </div>

      {/* Header meta */}
      <header className="mb-8">
        {meta.post_number != null && (
          <span className="font-mono text-xs text-text-muted">#{meta.post_number}</span>
        )}
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
          <ShareButton />
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
      {meta.content_type === 'papers' && (
        <SourceInfoBlock
          sourceUrl={meta.source_url}
          sourceTitle={meta.source_title}
          sourceAuthor={meta.source_author}
          sourceType={meta.source_type}
          sourceProjectUrl={meta.source_project_url}
          sourceAuthorsFull={meta.source_authors_full}
          firstAuthorScholarUrl={meta.first_author_scholar_url}
          scholarUrl={meta.google_scholar_url}
          sourceDate={meta.source_date}
          className="mb-8"
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
      <FigureGroupProvider figures={localizedFigures}>
        <div className="prose max-w-none">
          {children}
        </div>
      </FigureGroupProvider>

      {/* Appendix */}
      <AppendixSection
        locale={locale}
        figures={localizedFigures}
        tables={localizedTables}
        references={meta.references}
        terrys_memo={meta.terrys_memo}
        labels={labels}
      />

      {/* Related Papers (reading type only) */}
      {meta.content_type === 'papers' && (
        <RelatedPapers locale={locale} relatedPosts={relatedPosts} />
      )}

      {/* Substack subscribe (essays/tech only) */}
      {(meta.content_type === 'essays' || meta.content_type === 'memos') && (
        <SubstackSubscribe locale={locale} variant="article" />
      )}

      {/* Bottom navigation: prev / back-to-list / next */}
      <div className="mt-12 pt-6 border-t border-line-default">
        <div className="flex items-start justify-between gap-4">
          {/* 이전 글 (older post) */}
          <div className="flex-1 min-w-0">
            {adjacentPosts?.prev ? (
              <Link
                href={`/${locale}/posts/${adjacentPosts.prev.slug}`}
                className="group flex flex-col gap-0.5"
              >
                <span className="text-xs text-text-muted inline-flex items-center gap-1">
                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  {labels.prev ?? '이전 글'}
                </span>
                <span className="text-sm text-text-secondary group-hover:text-accent transition-colors line-clamp-2 leading-snug">
                  {adjacentPosts.prev.title}
                </span>
              </Link>
            ) : (
              <div />
            )}
          </div>

          {/* 목록으로 */}
          <div className="shrink-0 pt-0.5">
            <Link
              href={`/${locale}/${section}`}
              className="text-sm text-text-muted hover:text-accent transition-colors inline-flex items-center gap-1 whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {labels.back_to_list}
            </Link>
          </div>

          {/* 다음 글 (newer post) */}
          <div className="flex-1 min-w-0 text-right">
            {adjacentPosts?.next ? (
              <Link
                href={`/${locale}/posts/${adjacentPosts.next.slug}`}
                className="group flex flex-col gap-0.5 items-end"
              >
                <span className="text-xs text-text-muted inline-flex items-center gap-1">
                  {labels.next ?? '다음 글'}
                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
                <span className="text-sm text-text-secondary group-hover:text-accent transition-colors line-clamp-2 leading-snug">
                  {adjacentPosts.next.title}
                </span>
              </Link>
            ) : (
              <div />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
