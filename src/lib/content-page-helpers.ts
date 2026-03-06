import { notFound, redirect } from 'next/navigation';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { getDictionary, type Dictionary } from '@/lib/dictionaries';
import { getAllPosts, getPost, getPostAlternateLocale, postExistsForLocale } from '@/lib/posts';
import { computeTagCounts, sortTagsByCount, getTagLabel } from '@/lib/tags';
import { renderMDX } from '@/lib/mdx';
import { TAB_TAG_SLUGS } from '@/lib/site-config';
import type { PostMeta } from '@/types/post';

/* ─── Index page helpers ─── */

interface TagItem {
  slug: string;
  label: string;
  count: number;
}

export interface ContentIndexProps {
  locale: string;
  title: string;
  description: string;
  posts: PostMeta[];
  allTags: TagItem[];
  initialSelectedTags: string[];
  filterDict: Dictionary['filter'];
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

  return {
    locale: lang,
    title: section.title,
    description: section.description,
    posts,
    allTags,
    initialSelectedTags: [],
    filterDict: dict.filter,
  };
}

/* ─── Detail page helpers ─── */

export interface ContentDetailProps {
  locale: Locale;
  post: Awaited<ReturnType<typeof getPost>> & {};
  content: React.ReactNode;
  alternateLocale: string | null;
  labels: Dictionary['detail'];
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

  return {
    locale: lang,
    post,
    content,
    alternateLocale,
    labels: dict.detail,
  };
}
