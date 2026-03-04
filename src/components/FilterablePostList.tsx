'use client';

import { useState, useCallback, useEffect } from 'react';
import TagFilterBar from './TagFilterBar';
import ContentCard from './ContentCard';
import { normalizeTagSlug } from '@/lib/tags';
import type { PostMeta } from '@/types/post';

interface TagItem {
  slug: string;
  label: string;
  count: number;
}

interface FilterablePostListProps {
  locale: string;
  posts: PostMeta[];
  allTags: TagItem[];
  initialSelectedTags: string[];
  showMoreLabel: string;
  showLessLabel: string;
  noResultsLabel: string;
}

export default function FilterablePostList({
  locale,
  posts,
  allTags,
  initialSelectedTags,
  showMoreLabel,
  showLessLabel,
  noResultsLabel,
}: FilterablePostListProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    // Check URL params on init (client-side only)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tagsParam = params.get('tags');
      if (tagsParam) {
        return tagsParam.split(',').filter(Boolean);
      }
    }
    return initialSelectedTags;
  });

  // Sync to URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (selectedTags.length > 0) {
      params.set('tags', selectedTags.join(','));
    } else {
      params.delete('tags');
    }
    const qs = params.toString();
    const newUrl = qs
      ? `${window.location.pathname}?${qs}`
      : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [selectedTags]);

  const handleToggle = useCallback((slug: string) => {
    setSelectedTags((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }, []);

  // AND filtering: post must have ALL selected tags
  const filteredPosts =
    selectedTags.length === 0
      ? posts
      : posts.filter((post) => {
          const postTagSlugs = post.tags.map((t) => normalizeTagSlug(t));
          return selectedTags.every((sel) => postTagSlugs.includes(sel));
        });

  return (
    <div>
      <TagFilterBar
        availableTags={allTags}
        selectedSlugs={selectedTags}
        onToggle={handleToggle}
        showMoreLabel={showMoreLabel}
        showLessLabel={showLessLabel}
      />

      {filteredPosts.length === 0 ? (
        <p className="text-text-muted py-8 text-center">{noResultsLabel}</p>
      ) : (
        <div>
          {filteredPosts.map((post) => (
            <ContentCard key={post.post_id} post={post} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
