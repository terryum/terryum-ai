import { notFound, redirect } from 'next/navigation';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { getDictionary, type Dictionary } from '@/lib/dictionaries';
import { getAllPosts, getPost, getPostAlternateLocale, postExistsForLocale, loadIndexJson, loadTaxonomyJson, getAdjacentPosts, type AdjacentPosts } from '@/lib/posts';
import { computeTagCounts, sortTagsByCount, getTagLabel } from '@/lib/tags';
import { renderMDX } from '@/lib/mdx';
import { TAB_CONFIG, TAB_TAG_SLUGS } from '@/lib/site-config';
import type { PostMeta } from '@/types/post';
import type { TagItem } from '@/types/tag';

/* ─── Index page helpers ─── */

interface TabTitleEntry {
  title: string;
  description: string;
}

export interface TaxonomyNodeData {
  label: { ko: string; en: string };
  children: string[];
}

export interface ContentIndexProps {
  locale: string;
  title: string;
  description: string;
  posts: PostMeta[];
  allTags: TagItem[];
  initialSelectedTags: string[];
  filterDict: Dictionary['filter'];
  tabTitles: Record<string, TabTitleEntry>;
  taxonomyNodes: Record<string, TaxonomyNodeData>;
  taxonomyStats: Record<string, number>;
}

export async function buildContentIndexProps(
  lang: string,
): Promise<ContentIndexProps | null> {
  if (!isValidLocale(lang)) return null;

  const dict = await getDictionary(lang);
  const posts = await getAllPosts(lang);

  const tagCounts = computeTagCounts(posts);
  const sorted = sortTagsByCount(tagCounts);
  const allTags = sorted.map(({ slug, count }) => ({
    slug,
    label: getTagLabel(slug, lang),
    count,
  }));

  // Remove tab tags from the tag list (tab filtering is handled by navigation)
  const filteredTags = allTags.filter((t) => !TAB_TAG_SLUGS.has(t.slug));
  allTags.length = 0;
  allTags.push(...filteredTags);

  // Sort by count
  allTags.sort((a, b) => b.count - a.count);

  const section = dict.posts_index;

  // Build tabTitles from dictionary tabs_index
  const tabTitles: Record<string, TabTitleEntry> = {};
  const tabsIndex = (dict as Record<string, unknown>).tabs_index as
    Record<string, { title: string; description: string }> | undefined;
  if (tabsIndex) {
    for (const tab of TAB_CONFIG) {
      const entry = tabsIndex[tab.slug];
      if (entry) {
        tabTitles[tab.slug] = { title: entry.title, description: entry.description };
      }
    }
  }

  // Load taxonomy data
  let taxonomyNodes: Record<string, TaxonomyNodeData> = {};
  let taxonomyStats: Record<string, number> = {};
  try {
    const [taxonomyData, indexData] = await Promise.all([loadTaxonomyJson(), loadIndexJson()]);
    taxonomyNodes = (taxonomyData as { nodes: Record<string, TaxonomyNodeData> }).nodes ?? {};
    const rawStats = (indexData as { taxonomy_stats?: Record<string, number> }).taxonomy_stats ?? {};
    // Filter out ':secondary' keys for display
    for (const [k, v] of Object.entries(rawStats)) {
      if (!k.endsWith(':secondary')) {
        taxonomyStats[k] = v;
      }
    }
  } catch {
    // taxonomy files not available — skip
  }

  return {
    locale: lang,
    title: section.title,
    description: section.description,
    posts,
    allTags,
    initialSelectedTags: [],
    filterDict: dict.filter,
    tabTitles,
    taxonomyNodes,
    taxonomyStats,
  };
}

/* ─── Detail page helpers ─── */

export interface RelatedPostData {
  slug: string;
  title: string;
  oneLiner: string;
  relationType: string;
  postNumber?: number | null;
}

export type { AdjacentPosts };

export interface ContentDetailProps {
  locale: Locale;
  post: Awaited<ReturnType<typeof getPost>> & {};
  content: React.ReactNode;
  alternateLocale: string | null;
  labels: Dictionary['detail'];
  relatedPosts: RelatedPostData[];
  taxonomyBreadcrumb: { id: string; label: { ko: string; en: string } }[];
  adjacentPosts: AdjacentPosts;
}

export async function buildContentDetailProps(
  lang: string,
  slug: string,
): Promise<ContentDetailProps> {
  if (!isValidLocale(lang)) notFound();

  const post = await getPost(slug, lang);

  if (!post) {
    const altLocale = lang === 'ko' ? 'en' : 'ko';
    const existsInAlt = await postExistsForLocale(slug, altLocale);
    if (existsInAlt) {
      redirect(`/${altLocale}/posts/${slug}`);
    }
    notFound();
  }

  const dict = await getDictionary(lang);
  const { content } = await renderMDX(post.content, slug);
  const alternateLocale = await getPostAlternateLocale(slug, lang);

  // Build related posts from index.json
  let relatedPosts: RelatedPostData[] = [];
  let taxonomyBreadcrumb: { id: string; label: { ko: string; en: string } }[] = [];

  if (post.meta.content_type === 'papers') {
    const [indexData, taxonomyData] = await Promise.all([loadIndexJson(), loadTaxonomyJson()]);
    const posts = indexData.posts as Array<{
      slug: string;
      title_ko: string;
      title_en: string;
      post_number: number | null;
      relations: Array<{ target: string; type: string }>;
      ai_summary?: { one_liner: string } | null;
    }>;

    // Find current post's relations in index.json
    const currentIndexPost = posts.find(p => p.slug === slug);
    if (currentIndexPost?.relations?.length) {
      relatedPosts = currentIndexPost.relations
        .flatMap(rel => {
          const target = posts.find(p => p.slug === rel.target);
          if (!target) return [];
          const item: RelatedPostData = {
            slug: target.slug,
            title: lang === 'ko' ? target.title_ko : target.title_en,
            oneLiner: target.ai_summary?.one_liner ?? '',
            relationType: rel.type,
            postNumber: target.post_number ?? undefined,
          };
          return [item];
        });
    }

    // Build taxonomy breadcrumb
    const taxonomyPrimary = post.meta.taxonomy_primary;
    if (taxonomyPrimary) {
      const nodes = (taxonomyData as { nodes: Record<string, { label: { ko: string; en: string }; children: string[] }> }).nodes;
      // Find parent node
      const parentId = taxonomyPrimary.includes('/')
        ? taxonomyPrimary.split('/')[0]
        : null;
      if (parentId && nodes[parentId]) {
        taxonomyBreadcrumb.push({ id: parentId, label: nodes[parentId].label });
      }
      if (nodes[taxonomyPrimary]) {
        taxonomyBreadcrumb.push({ id: taxonomyPrimary, label: nodes[taxonomyPrimary].label });
      }
    }
  }

  const adjacentPosts = await getAdjacentPosts(slug, lang);

  return {
    locale: lang,
    post,
    content,
    alternateLocale,
    labels: dict.detail,
    relatedPosts,
    taxonomyBreadcrumb,
    adjacentPosts,
  };
}
