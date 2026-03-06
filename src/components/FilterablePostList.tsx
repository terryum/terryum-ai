'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import TagFilterBar from './TagFilterBar';
import ContentCard from './ContentCard';
import { normalizeTagSlug } from '@/lib/tags';
import { TAB_TAG_SLUGS } from '@/lib/site-config';
import { getPostsForTab } from '@/lib/tabs';
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
  const [selectedTab, setSelectedTab] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      // Backward compat: ?tags=research → treat as ?tab=research
      const tagsParam = params.get('tags');
      if (tagsParam && TAB_TAG_SLUGS.has(tagsParam)) {
        return tagsParam;
      }
      return params.get('tab');
    }
    return null;
  });

  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tagsParam = params.get('tags');
      if (tagsParam) {
        // Filter out tab tags from ?tags= param
        return tagsParam.split(',').filter(t => t && !TAB_TAG_SLUGS.has(t));
      }
    }
    return initialSelectedTags;
  });

  // Sync URL query params
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedTab) {
      params.set('tab', selectedTab);
    }
    if (selectedTags.length > 0) {
      params.set('tags', selectedTags.join(','));
    }
    const qs = params.toString();
    const newUrl = qs
      ? `${window.location.pathname}?${qs}`
      : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [selectedTab, selectedTags]);

  // Listen for popstate (back/forward) to sync tab from URL
  useEffect(() => {
    function onPopState() {
      const params = new URLSearchParams(window.location.search);
      setSelectedTab(params.get('tab'));
      const tags = params.get('tags');
      setSelectedTags(tags ? tags.split(',').filter(t => t && !TAB_TAG_SLUGS.has(t)) : []);
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleToggle = useCallback((slug: string) => {
    setSelectedTags((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }, []);

  // 1st pass: filter by tab
  const tabFilteredPosts = useMemo(() => {
    if (!selectedTab) return posts;
    return getPostsForTab(posts, selectedTab);
  }, [posts, selectedTab]);

  // 2nd pass: AND filter by topic tags
  const filteredPosts = useMemo(() => {
    if (selectedTags.length === 0) return tabFilteredPosts;
    return tabFilteredPosts.filter((post) => {
      const postTagSlugs = post.tags.map((t) => normalizeTagSlug(t));
      return selectedTags.every((sel) => postTagSlugs.includes(sel));
    });
  }, [tabFilteredPosts, selectedTags]);

  // Compute available topic tags (excluding tab tags)
  const availableTags = useMemo(() => {
    const tagCounts = new Map<string, number>();
    for (const post of tabFilteredPosts) {
      for (const tag of post.tags) {
        const slug = normalizeTagSlug(tag);
        if (!TAB_TAG_SLUGS.has(slug)) {
          tagCounts.set(slug, (tagCounts.get(slug) || 0) + 1);
        }
      }
    }

    return Array.from(tagCounts.entries())
      .map(([slug, count]) => {
        const existing = allTags.find((t) => t.slug === slug);
        return { slug, label: existing?.label || slug, count };
      })
      .sort((a, b) => b.count - a.count);
  }, [allTags, tabFilteredPosts]);

  return (
    <div>
      <TagFilterBar
        availableTags={availableTags}
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
