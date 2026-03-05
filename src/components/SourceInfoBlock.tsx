import { LinkBadge, InternalLinkBadge } from './LinkBadge';
import AuthorList from './AuthorList';
import type { Locale } from '@/lib/i18n';

export interface SourceInfoBlockProps {
  sourceUrl?: string;
  sourceTitle?: string;
  sourceAuthor?: string;
  sourceType?: string;
  sourceProjectUrl?: string;
  sourceAuthorsFull?: string[];
  firstAuthorScholarUrl?: string;
  sourceDate?: string;
  scholarUrl?: string;
  description?: string;
  postSlug?: string;
  locale?: Locale;
  className?: string;
  labels?: {
    source_label: string;
    author_label: string;
    view_all_authors: string;
  };
}

export function formatSourceDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getUTCFullYear()}. ${d.getUTCMonth() + 1}`;
}

function buildScholarUrl(title: string): string {
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(title)}`;
}

export default function SourceInfoBlock({
  sourceUrl,
  sourceTitle,
  sourceAuthor,
  sourceType,
  sourceProjectUrl,
  sourceAuthorsFull,
  firstAuthorScholarUrl,
  sourceDate,
  scholarUrl: scholarUrlProp,
  description,
  postSlug,
  locale,
  className,
  labels,
}: SourceInfoBlockProps) {
  if (!sourceUrl && !sourceTitle) return null;

  const dateStr = sourceDate ? formatSourceDate(sourceDate) : null;
  const scholarUrl = scholarUrlProp || (sourceTitle ? buildScholarUrl(sourceTitle) : null);
  const loc = locale || 'en';

  return (
    <div className={`border border-line-default rounded-lg p-4 md:p-5 text-sm bg-bg-surface/40${className ? ` ${className}` : ''}`}>
      {/* Link badges (top) */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {postSlug && (
          <InternalLinkBadge href={`/${loc}/research/${postSlug}`}>
            Post
          </InternalLinkBadge>
        )}
        {sourceUrl && <LinkBadge href={sourceUrl}>{sourceType || 'arXiv'}</LinkBadge>}
        {scholarUrl && <LinkBadge href={scholarUrl}>Google Scholar</LinkBadge>}
        {sourceProjectUrl && <LinkBadge href={sourceProjectUrl}>Project</LinkBadge>}
      </div>

      {/* Title */}
      {sourceTitle && (
        <p className="text-text-primary font-medium leading-snug">
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors"
            >
              {sourceTitle}
            </a>
          ) : (
            sourceTitle
          )}
        </p>
      )}

      {/* Author + Date */}
      {sourceAuthor && (
        sourceAuthorsFull && sourceAuthorsFull.length > 0 ? (
          <AuthorList
            sourceAuthor={sourceAuthor}
            firstAuthorScholarUrl={firstAuthorScholarUrl}
            publishedDate={dateStr}
            sourceAuthorsFull={sourceAuthorsFull}
          />
        ) : (
          <p className="text-text-muted text-xs mt-1">
            {sourceAuthor}
            {dateStr && <span className="ml-1">({dateStr})</span>}
          </p>
        )
      )}

      {/* Description (for reference cards) */}
      {description && (
        <p className="text-text-muted text-xs mt-1">{description}</p>
      )}
    </div>
  );
}
