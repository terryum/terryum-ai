import TagChip from './TagChip';
import BaseCard from './cards/BaseCard';
import LockBadge from './cards/LockBadge';
import { normalizeTagSlug } from '@/lib/tags';
import { TAB_TAG_SLUGS } from '@/lib/site-config';
import { getDisplayTags, formatPostDate } from '@/lib/display';
import tagsData from '@/data/tags.json';
import type { PostMeta } from '@/types/post';

export interface PostCardStats {
  likes: number;
  comments: number;
  views: number;
}

interface ContentCardProps {
  post: PostMeta;
  locale: string;
  showTabTag?: boolean;
  hidePubDate?: boolean;
  stats?: PostCardStats;
}

function StatsRow({ stats }: { stats: PostCardStats }) {
  return (
    <div className="flex items-center gap-3 mt-2 text-xs text-text-muted tabular-nums">
      <span className="inline-flex items-center gap-1" aria-label={`${stats.likes} likes`}>
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
        </svg>
        {stats.likes}
      </span>
      <span className="inline-flex items-center gap-1" aria-label={`${stats.comments} comments`}>
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        {stats.comments}
      </span>
      <span className="inline-flex items-center gap-1" aria-label={`${stats.views} views`}>
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        {stats.views}
      </span>
    </div>
  );
}

function getTabLabel(post: PostMeta, locale: string): string | null {
  const tabSlug = post.tags.map(normalizeTagSlug).find((tag) => TAB_TAG_SLUGS.has(tag));
  if (!tabSlug) return null;
  const tagDef = tagsData.tags.find((t) => t.slug === tabSlug);
  return tagDef?.label[locale as 'ko' | 'en'] ?? tabSlug;
}

export default function ContentCard({ post, locale, showTabTag, hidePubDate, stats }: ContentCardProps) {
  const href = `/${locale}/posts/${post.slug}`;
  const isReading = post.content_type === 'papers';

  const metaDateStr = isReading
    ? formatPostDate(post.source_date || post.published_at, locale, { year: 'numeric', month: 'short' })
    : formatPostDate(post.published_at, locale, { year: 'numeric', month: 'short', day: 'numeric' });

  const summary = post.card_summary || post.summary;
  const tabLabel = showTabTag ? getTabLabel(post, locale) : null;
  const otherTags = getDisplayTags(post)
    .filter((tag) => !TAB_TAG_SLUGS.has(normalizeTagSlug(tag)))
    .slice(0, tabLabel ? 2 : 3);

  return (
    <BaseCard
      href={href}
      thumbnailSrc={post.cover_thumb || post.cover_image}
      thumbnailAlt={post.title}
      thumbnailFit={post.thumb_fit === 'contain' ? 'contain' : 'cover'}
    >
      {post.post_number != null && (
        <div className="text-xs text-text-muted">
          <span className="font-mono">#{post.post_number}</span>
        </div>
      )}
      <h3 className="flex items-start gap-1.5 text-base font-[480] text-text-primary group-hover:text-accent transition-colors leading-snug mt-0.5">
        <span>
          {post.starred && (
            <span className="inline-block mr-1 text-amber-400" title="Seminal Paper">★</span>
          )}
          {post.title}
        </span>
        <LockBadge
          visibility={post.visibility}
          allowedGroups={post.allowed_groups}
          locale={locale}
          className="inline-flex mt-1 text-accent/70 flex-shrink-0"
        />
      </h3>
      {isReading && post.source_author && (
        <p className="text-xs text-text-muted mt-0.5">
          {post.source_author}
          {` · ${metaDateStr}`}
        </p>
      )}
      <p className="text-sm text-text-muted mt-1 line-clamp-4 sm:line-clamp-3">{summary}</p>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {!isReading && !hidePubDate && <time className="text-xs text-text-muted">{metaDateStr}</time>}
        {tabLabel && <TagChip tag={tabLabel} />}
        {otherTags.map((tag) => (
          <TagChip key={tag} tag={tag} />
        ))}
      </div>
      {stats && <StatsRow stats={stats} />}
    </BaseCard>
  );
}
