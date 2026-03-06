import Link from 'next/link';
import Image from 'next/image';
import TagChip from './TagChip';
import SourceBadge from './SourceBadge';
import { normalizeTagSlug } from '@/lib/tags';
import { TAB_TAG_SLUGS } from '@/lib/site-config';
import type { PostMeta } from '@/types/post';

interface ContentCardProps {
  post: PostMeta;
  locale: string;
}

function formatSourceDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}. ${d.getMonth() + 1}`;
}

export default function ContentCard({ post, locale }: ContentCardProps) {
  const href = `/${locale}/posts/${post.slug}`;
  const dateStr = new Date(post.published_at).toLocaleDateString(
    locale === 'ko' ? 'ko-KR' : 'en-US',
    { year: 'numeric', month: 'short', day: 'numeric' }
  );

  const summary = post.card_summary || post.summary;
  const sourceDateLabel =
    post.content_type === 'reading' && post.source_date
      ? formatSourceDate(post.source_date)
      : null;

  return (
    <Link href={href} className="block group border-b border-line-default py-6 first:pt-0 last:border-b-0">
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
            {sourceDateLabel && (
              <span className="text-xs font-normal text-text-muted ml-1.5">{sourceDateLabel}</span>
            )}
          </h3>
          <p className="text-sm text-text-muted mt-1 line-clamp-8 sm:line-clamp-4">
            {summary}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <time className="text-xs text-text-muted">{dateStr}</time>
            {post.content_type === 'reading' && post.source_type && (
              <SourceBadge sourceType={post.source_type} />
            )}
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
