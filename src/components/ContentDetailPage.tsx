import Image from 'next/image';
import Link from 'next/link';
import TagChip from './TagChip';
import SourceInfoBlock from './SourceInfoBlock';
import LanguageSwitcher from './LanguageSwitcher';
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
  };
}

export default function ContentDetailPage({
  locale,
  meta,
  children,
  alternateLocale,
  labels,
}: ContentDetailPageProps) {
  const section = meta.content_type === 'writing' ? 'write' : 'read';
  const dateStr = new Date(meta.published_at).toLocaleDateString(
    locale === 'ko' ? 'ko-KR' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );

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
          labels={labels}
        />
      )}

      {/* Cover image */}
      {meta.cover_image && (
        <div className="relative w-full aspect-video mb-8 rounded-lg overflow-hidden bg-gray-100">
          <Image
            src={meta.cover_image}
            alt={meta.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 672px"
            priority
          />
        </div>
      )}

      {/* MDX body */}
      <div className="prose prose-gray max-w-none">
        {children}
      </div>
    </article>
  );
}
