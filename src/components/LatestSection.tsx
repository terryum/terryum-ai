'use client';

import { useState } from 'react';
import Link from 'next/link';
import ContentCard from './ContentCard';
import type { PostMeta } from '@/types/post';

const PAGE_SIZE = 3;

interface LatestSectionProps {
  title: string;
  viewAllHref: string;
  viewAllText: string;
  posts: PostMeta[];
  locale: string;
  showMoreText?: string;
  emptyText?: string;
  showTabTag?: boolean;
  hidePubDate?: boolean;
}

export default function LatestSection({
  title,
  viewAllHref,
  viewAllText,
  posts,
  locale,
  showMoreText,
  emptyText,
  showTabTag,
  hidePubDate,
}: LatestSectionProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visiblePosts = posts.slice(0, visibleCount);
  const hasMore = visibleCount < posts.length;

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-[540] text-text-primary tracking-tight">
          {title}
        </h2>
        <Link
          href={viewAllHref}
          className="text-sm text-text-muted hover:text-accent transition-colors"
        >
          {viewAllText} &rarr;
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="text-text-muted text-sm py-4">{emptyText ?? 'No posts yet.'}</p>
      ) : (
        <div>
          {visiblePosts.map((post) => (
            <ContentCard key={post.post_id} post={post} locale={locale} showTabTag={showTabTag} hidePubDate={hidePubDate} />
          ))}
          {hasMore && (
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="mt-4 w-full py-2 text-sm text-text-muted hover:text-accent transition-colors border border-line-default rounded-md"
            >
              {showMoreText ?? `+${Math.min(PAGE_SIZE, posts.length - visibleCount)} more`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
