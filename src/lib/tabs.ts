import { TAB_CONFIG, TAB_TAG_SLUGS, ETC_TAB_SLUG } from '@/lib/site-config';
import { normalizeTagSlug, getTagLabel } from '@/lib/tags';
import type { PostMeta } from '@/types/post';

/** Get posts belonging to a specific tab */
export function getPostsForTab(posts: PostMeta[], tabSlug: string): PostMeta[] {
  if (tabSlug === ETC_TAB_SLUG) return getEtcPosts(posts);
  const tab = TAB_CONFIG.find(t => t.slug === tabSlug);
  if (!tab) return [];
  const matchSet = new Set(tab.matchTags);
  return posts.filter(post =>
    post.tags.some(tag => matchSet.has(normalizeTagSlug(tag)))
  );
}

/** Posts not belonging to any tab */
export function getEtcPosts(posts: PostMeta[]): PostMeta[] {
  return posts.filter(post => {
    const slugs = post.tags.map(normalizeTagSlug);
    return !slugs.some(s => TAB_TAG_SLUGS.has(s));
  });
}

export interface ActiveTab {
  slug: string;
  matchTags: string[];
  order: number;
  label: string;
  count: number;
}

/** Active tabs list (Etc. only when uncategorized posts exist) */
export function getActiveTabs(posts: PostMeta[], locale: string): ActiveTab[] {
  const tabs: ActiveTab[] = TAB_CONFIG
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(tab => ({
      ...tab,
      label: getTagLabel(tab.slug, locale),
      count: getPostsForTab(posts, tab.slug).length,
    }));

  const etcPosts = getEtcPosts(posts);
  if (etcPosts.length > 0) {
    tabs.push({
      slug: ETC_TAB_SLUG,
      matchTags: [],
      order: 999,
      label: 'Etc.',
      count: etcPosts.length,
    });
  }

  return tabs;
}

export interface NavTabItem {
  href: string;
  label: string;
  tabSlug: string;
}

/** Generate nav menu items for tabs */
export function getNavTabs(posts: PostMeta[], locale: string): NavTabItem[] {
  return getActiveTabs(posts, locale).map(tab => ({
    href: `/${locale}/posts?tab=${tab.slug}`,
    label: tab.label,
    tabSlug: tab.slug,
  }));
}
