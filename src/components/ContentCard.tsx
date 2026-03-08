import Link from 'next/link';
import Image from 'next/image';
import TagChip from './TagChip';
import { normalizeTagSlug } from '@/lib/tags';
import { TAB_TAG_SLUGS } from '@/lib/site-config';
import type { PostMeta } from '@/types/post';

interface ContentCardProps {
  post: PostMeta;
  locale: string;
}

function formatSourceDateShort(dateStr: string, locale: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'short',
  });
}

export default function ContentCard({ post, locale }: ContentCardProps) {
  const href = `/${locale}/posts/${post.slug}`;
  const isReading = post.content_type === 'reading';

  // Reading: show source_date (paper publish date); Writing/Essay: show published_at (posting date)
  const metaDateStr = isReading && post.source_date
    ? formatSourceDateShort(post.source_date, locale)
    : new Date(post.published_at).toLocaleDateString(
        locale === 'ko' ? 'ko-KR' : 'en-US',
        { year: 'numeric', month: 'short', day: 'numeric' }
      );

  const summary = post.card_summary || post.summary;

  return (
    <Link href={href} className="block group py-4 first:pt-0">
      <article className="flex gap-6">
        {/* Thumbnail */}
        {(post.cover_thumb || post.cover_image) && (
          <div className="hidden sm:block flex-shrink-0 w-36 h-36 relative rounded overflow-hidden bg-bg-surface">
            <Image
              src={post.cover_thumb || post.cover_image}
              alt={post.title}
              fill
              className="object-cover"
              sizes="144px"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-[480] text-text-primary group-hover:text-accent transition-colors leading-snug">
            {post.title}
          </h3>
          {isReading && post.source_author && (
            <p className="text-xs text-text-muted mt-0.5">
              {post.source_author}
              {post.source_date && ` · ${formatSourceDateShort(post.source_date, locale)}`}
              {post.citation_status === 'failed'
                ? ' · Cited 00'
                : post.citation_count != null && post.citation_count > 0
                  ? ` · Cited ${post.citation_count}`
                  : null}
            </p>
          )}
          <p className="text-sm text-text-muted mt-1 line-clamp-4 sm:line-clamp-3">
            {summary}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {!isReading && <time className="text-xs text-text-muted">{metaDateStr}</time>}
            {post.tags
              .filter((tag) => !TAB_TAG_SLUGS.has(normalizeTagSlug(tag)))
              .slice(0, 3)
              .map((tag) => (
                <TagChip key={tag} tag={tag} />
              ))}
          </div>
        </div>
      </article>
    </Link>
  );
}
