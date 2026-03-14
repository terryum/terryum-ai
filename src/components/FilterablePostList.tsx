'use client';

import { useState, useCallback, useMemo, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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

interface TabTitleEntry {
  title: string;
  description: string;
}

interface FilterablePostListProps {
  locale: string;
  posts: PostMeta[];
  allTags: TagItem[];
  initialSelectedTags: string[];
  showMoreLabel: string;
  showLessLabel: string;
  noResultsLabel: string;
  defaultTitle: string;
  defaultDescription: string;
  tabTitles?: Record<string, TabTitleEntry>;
}

function FilterablePostListInner({
  locale,
  posts,
  allTags,
  initialSelectedTags,
  showMoreLabel,
  showLessLabel,
  noResultsLabel,
  defaultTitle,
  defaultDescription,
  tabTitles,
}: FilterablePostListProps) {
  const searchParams = useSearchParams();
  const selectedTab = searchParams.get('tab');

  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tagsParam = params.get('tags');
      if (tagsParam) {
        return tagsParam.split(',').filter(t => t && !TAB_TAG_SLUGS.has(t));
      }
    }
    return initialSelectedTags;
  });

  const [starredOnly, setStarredOnly] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('starred') === 'true';
    }
    return false;
  });

  // Reset tags and starred when tab changes
  const prevTabRef = useRef(selectedTab);
  useEffect(() => {
    if (prevTabRef.current !== selectedTab) {
      prevTabRef.current = selectedTab;
      setSelectedTags([]);
      setStarredOnly(false);
    }
  }, [selectedTab]);

  // Sync tags and starred to URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Preserve existing tab param
    const currentTab = params.get('tab');
    const newParams = new URLSearchParams();
    if (currentTab) newParams.set('tab', currentTab);
    if (selectedTags.length > 0) {
      newParams.set('tags', selectedTags.join(','));
    }
    if (starredOnly) newParams.set('starred', 'true');
    const qs = newParams.toString();
    const newUrl = qs
      ? `${window.location.pathname}?${qs}`
      : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [selectedTags, starredOnly]);

  // Listen for popstate (back/forward)
  useEffect(() => {
    function onPopState() {
      const params = new URLSearchParams(window.location.search);
      const tags = params.get('tags');
      setSelectedTags(tags ? tags.split(',').filter(t => t && !TAB_TAG_SLUGS.has(t)) : []);
      setStarredOnly(params.get('starred') === 'true');
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

  // 2nd pass: AND filter by topic tags (display_tags takes priority over tags)
  const filteredPosts = useMemo(() => {
    if (selectedTags.length === 0) return tabFilteredPosts;
    return tabFilteredPosts.filter((post) => {
      const tagsToUse = post.display_tags?.length ? post.display_tags : post.tags;
      const postTagSlugs = tagsToUse.map((t) => normalizeTagSlug(t));
      return selectedTags.every((sel) => postTagSlugs.includes(sel));
    });
  }, [tabFilteredPosts, selectedTags]);

  // 3rd pass: filter by starred
  const finalPosts = useMemo(() => {
    if (!starredOnly) return filteredPosts;
    return filteredPosts.filter(p => p.starred);
  }, [filteredPosts, starredOnly]);

  // Compute available topic tags (excluding tab tags, display_tags takes priority)
  const availableTags = useMemo(() => {
    const tagCounts = new Map<string, number>();
    for (const post of tabFilteredPosts) {
      const tagsToUse = post.display_tags?.length ? post.display_tags : post.tags;
      for (const tag of tagsToUse) {
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

  // Resolve title/description based on current tab
  const currentTitle = (selectedTab && tabTitles?.[selectedTab]?.title) || defaultTitle;
  const currentDescription = (selectedTab && tabTitles?.[selectedTab]?.description) || defaultDescription;

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary tracking-tight">{currentTitle}</h1>
      <p className="text-sm text-text-muted mt-2 mb-8">{currentDescription}</p>

      {selectedTab === 'research' && (
        <button
          onClick={() => setStarredOnly(v => !v)}
          className={`mb-3 inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full border transition-colors ${
            starredOnly
              ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-400'
              : 'border-line-default text-text-muted hover:border-amber-300 hover:text-amber-600'
          }`}
        >
          <span>★</span>
          <span>Seminal</span>
        </button>
      )}

      <TagFilterBar
        availableTags={availableTags}
        selectedSlugs={selectedTags}
        onToggle={handleToggle}
        showMoreLabel={showMoreLabel}
        showLessLabel={showLessLabel}
      />

      {finalPosts.length === 0 ? (
        <p className="text-text-muted py-8 text-center">{noResultsLabel}</p>
      ) : (
        <div>
          {finalPosts.map((post) => (
            <ContentCard key={post.post_id} post={post} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FilterablePostList(props: FilterablePostListProps) {
  return (
    <Suspense fallback={
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">{props.defaultTitle}</h1>
        <p className="text-sm text-text-muted mt-2 mb-8">{props.defaultDescription}</p>
      </div>
    }>
      <FilterablePostListInner {...props} />
    </Suspense>
  );
}
