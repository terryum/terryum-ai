'use client';

import { useMemo } from 'react';
import { normalizeTagSlug } from '@/lib/tags';
import { TAB_TAG_SLUGS } from '@/lib/site-config';
import { getPostsForTab } from '@/lib/tabs';
import { getDisplayTags } from '@/lib/display';
import type { PostMeta } from '@/types/post';
import type { TagItem } from '@/types/tag';
import type { TaxonomyNodeData } from '@/lib/content-page-helpers';

interface FilterInputs {
  posts: PostMeta[];
  allTags: TagItem[];
  selectedTab: string | null;
  selectedTaxonomy: string | null;
  taxonomyNodes: Record<string, TaxonomyNodeData>;
  selectedTags: string[];
  starredOnly: boolean;
}

/**
 * Four-stage filter chain (tab → taxonomy → tags → starred) plus a
 * derived `availableTags` list scoped to the taxonomy filter so the chip
 * bar only surfaces tags that can match the current scope.
 */
export function useFilteredPosts({
  posts,
  allTags,
  selectedTab,
  selectedTaxonomy,
  taxonomyNodes,
  selectedTags,
  starredOnly,
}: FilterInputs) {
  const tabFilteredPosts = useMemo(() => {
    if (selectedTab) return getPostsForTab(posts, selectedTab);
    return posts;
  }, [posts, selectedTab]);

  const taxonomyFilteredPosts = useMemo(() => {
    if (!selectedTaxonomy) return tabFilteredPosts;
    const matchNodes = new Set<string>();
    function collectDescendants(nodeId: string) {
      matchNodes.add(nodeId);
      const n = taxonomyNodes[nodeId];
      for (const child of n?.children ?? []) collectDescendants(child);
    }
    collectDescendants(selectedTaxonomy);
    return tabFilteredPosts.filter(
      (p) =>
        (p.taxonomy_primary && matchNodes.has(p.taxonomy_primary)) ||
        (p.taxonomy_secondary || []).some((s) => matchNodes.has(s)),
    );
  }, [tabFilteredPosts, selectedTaxonomy, taxonomyNodes]);

  const tagFilteredPosts = useMemo(() => {
    if (selectedTags.length === 0) return taxonomyFilteredPosts;
    return taxonomyFilteredPosts.filter((post) => {
      const postTagSlugs = getDisplayTags(post).map((t) => normalizeTagSlug(t));
      return selectedTags.every((sel) => postTagSlugs.includes(sel));
    });
  }, [taxonomyFilteredPosts, selectedTags]);

  const finalPosts = useMemo(() => {
    if (!starredOnly) return tagFilteredPosts;
    return tagFilteredPosts.filter((p) => p.starred);
  }, [tagFilteredPosts, starredOnly]);

  const availableTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of taxonomyFilteredPosts) {
      for (const tag of getDisplayTags(post)) {
        const slug = normalizeTagSlug(tag);
        if (!TAB_TAG_SLUGS.has(slug)) {
          counts.set(slug, (counts.get(slug) || 0) + 1);
        }
      }
    }
    return Array.from(counts.entries())
      .map(([slug, count]) => {
        const existing = allTags.find((t) => t.slug === slug);
        return { slug, label: existing?.label || slug, count };
      })
      .sort((a, b) => b.count - a.count);
  }, [allTags, taxonomyFilteredPosts]);

  return { taxonomyFilteredPosts, finalPosts, availableTags };
}
