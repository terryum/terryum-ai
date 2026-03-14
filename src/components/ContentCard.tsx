import Link from 'next/link';
import Image from 'next/image';
import TagChip from './TagChip';
import { normalizeTagSlug } from '@/lib/tags';
import { TAB_TAG_SLUGS } from '@/lib/site-config';
import tagsData from '@/data/tags.json';
import type { PostMeta } from '@/types/post';

interface ContentCardProps {
  post: PostMeta;
  locale: string;
  showTabTag?: boolean;
  hidePubDate?: boolean;
}

function getTabLabel(post: PostMeta, locale: string): string | null {
  const tabSlug = post.tags
    .map(normalizeTagSlug)
    .find(tag => TAB_TAG_SLUGS.has(tag));
  if (!tabSlug) return null;
  const tagDef = tagsData.tags.find(t => t.slug === tabSlug);
  return tagDef?.label[locale as 'ko' | 'en'] ?? tabSlug;
}

function formatSourceDateShort(dateStr: string, locale: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'short',
  });
}

export default function ContentCard({ post, locale, showTabTag, hidePubDate }: ContentCardProps) {
  const href = `/${locale}/posts/${post.slug}`;
  const isReading = post.content_type === 'reading';

  // Reading: show source_date (or published_at fallback) in year/month format
  // Writing/Essay: show published_at with full date
  const metaDateStr = isReading
    ? formatSourceDateShort(post.source_date || post.published_at, locale)
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
            {post.thumb_fit === 'contain' ? (
              // absolute inset-3 creates a CSS containing block for the fill Image,
              // so bg-bg-surface shows in the 12px gap — no image transparency needed
              <div className="absolute inset-3 bg-bg-surface">
                <Image
                  src={post.cover_thumb || post.cover_image}
                  alt={post.title}
                  fill
                  className="object-contain"
                  sizes="120px"
                  unoptimized
                />
              </div>
            ) : (
              <Image
                src={post.cover_thumb || post.cover_image}
                alt={post.title}
                fill
                className="object-cover"
                sizes="144px"
              />
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-[480] text-text-primary group-hover:text-accent transition-colors leading-snug">
            {post.post_number != null && (
              <span className="font-mono text-xs text-text-muted mr-1.5">#{post.post_number}</span>
            )}
            {post.title}
          </h3>
          {isReading && post.source_author && (
            <p className="text-xs text-text-muted mt-0.5">
              {post.source_author}
              {` · ${metaDateStr}`}
            </p>
          )}
          <p className="text-sm text-text-muted mt-1 line-clamp-4 sm:line-clamp-3">
            {summary}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {!isReading && !hidePubDate && <time className="text-xs text-text-muted">{metaDateStr}</time>}
            {(() => {
              const tabLabel = showTabTag ? getTabLabel(post, locale) : null;
              const otherTags = (post.display_tags?.length ? post.display_tags : post.tags)
                .filter((tag) => !TAB_TAG_SLUGS.has(normalizeTagSlug(tag)))
                .slice(0, tabLabel ? 2 : 3);
              return (
                <>
                  {tabLabel && <TagChip tag={tabLabel} />}
                  {otherTags.map((tag) => (
                    <TagChip key={tag} tag={tag} />
                  ))}
                </>
              );
            })()}
          </div>
        </div>
      </article>
    </Link>
  );
}
