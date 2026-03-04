import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import type { Post, PostMeta } from '@/types/post';
import { normalizeTagSlug } from '@/lib/tags';

const POSTS_DIR = path.join(process.cwd(), 'posts');
const CATEGORIES = ['research', 'idea'] as const;
type PostCategory = (typeof CATEGORIES)[number];

const CATEGORY_TO_CONTENT_TYPE: Record<PostCategory, 'reading' | 'writing'> = {
  research: 'reading',
  idea: 'writing',
};

async function resolvePostPath(
  slug: string
): Promise<{ dir: string; category: PostCategory } | null> {
  for (const cat of CATEGORIES) {
    const dir = path.join(POSTS_DIR, cat, slug);
    try {
      const s = await fs.stat(dir);
      if (s.isDirectory()) return { dir, category: cat };
    } catch {
      continue;
    }
  }
  return null;
}

export async function getAllSlugs(): Promise<string[]> {
  const slugs: string[] = [];
  for (const cat of CATEGORIES) {
    const catDir = path.join(POSTS_DIR, cat);
    try {
      const entries = await fs.readdir(catDir, { withFileTypes: true });
      slugs.push(...entries.filter((e) => e.isDirectory()).map((e) => e.name));
    } catch {
      // category directory doesn't exist yet
    }
  }
  return slugs;
}

function normalizeMeta(
  data: Record<string, unknown>,
  slug: string,
  category?: PostCategory
): PostMeta {
  // Determine content_type from directory category (authoritative) or fallback to frontmatter
  let contentType: string;
  if (category) {
    contentType = CATEGORY_TO_CONTENT_TYPE[category];
  } else {
    contentType = (data.content_type || data.kind || 'writing') as string;
    if (contentType === 'write' || contentType === 'ideas') contentType = 'writing';
    if (contentType === 'read' || contentType === 'research') contentType = 'reading';
  }

  // Normalize cover_image path
  let coverImage = (data.cover_image as string) || '';
  if (coverImage.startsWith('./')) {
    coverImage = `/posts/${slug}/${coverImage.slice(2)}`;
  }

  // Normalize cover_thumb path
  let coverThumb = (data.cover_thumb as string) || undefined;
  if (coverThumb?.startsWith('./')) {
    coverThumb = `/posts/${slug}/${coverThumb.slice(2)}`;
  }

  // Auto-inject content_type tag based on folder
  const rawTags: string[] = (data.tags as string[]) || [];
  const tagSlugs = rawTags.map((t) => normalizeTagSlug(t));
  const contentTypeTag = category === 'research' ? 'Research' : 'Ideas';
  const contentTypeSlug = normalizeTagSlug(contentTypeTag);
  if (!tagSlugs.includes(contentTypeSlug)) {
    rawTags.unshift(contentTypeTag);
  }

  return {
    post_id: (data.post_id as string) || slug,
    locale: (data.locale as string) || 'ko',
    title: (data.title as string) || 'Untitled',
    summary: (data.summary as string) || '',
    slug,
    published_at: (data.published_at as string) || new Date().toISOString(),
    updated_at: (data.updated_at as string) || (data.published_at as string) || new Date().toISOString(),
    status: (data.status as 'draft' | 'published') || 'draft',
    content_type: contentType as 'writing' | 'reading',
    tags: rawTags,
    cover_image: coverImage,
    cover_caption: data.cover_caption as string | undefined,
    cover_thumb: coverThumb,
    card_summary: data.card_summary as string | undefined,
    reading_time_min: data.reading_time_min as number | undefined,
    seo_title: data.seo_title as string | undefined,
    seo_description: data.seo_description as string | undefined,
    source_url: data.source_url as string | undefined,
    source_title: data.source_title as string | undefined,
    source_author: data.source_author as string | undefined,
    source_type: data.source_type as string | undefined,
    source_project_url: data.source_project_url as string | undefined,
    source_authors_full: data.source_authors_full as string[] | undefined,
    references: data.references as PostMeta['references'],
    translation_of: data.translation_of as string | null | undefined,
    translated_to: data.translated_to as string[] | undefined,
    newsletter_eligible: data.newsletter_eligible as boolean | undefined,
    featured: data.featured as boolean | undefined,
  };
}

export async function getPost(slug: string, locale: string): Promise<Post | null> {
  const resolved = await resolvePostPath(slug);
  if (!resolved) return null;
  const filePath = path.join(resolved.dir, `${locale}.mdx`);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const { data, content } = matter(raw);
    return {
      meta: normalizeMeta(data, slug, resolved.category),
      content,
    };
  } catch {
    return null;
  }
}

export async function getPostMeta(slug: string, locale: string): Promise<PostMeta | null> {
  const post = await getPost(slug, locale);
  return post?.meta ?? null;
}

export async function getPostsByType(
  locale: string,
  contentType: 'writing' | 'reading'
): Promise<PostMeta[]> {
  const slugs = await getAllSlugs();
  const allMeta = await Promise.all(slugs.map((slug) => getPostMeta(slug, locale)));
  const posts = allMeta.filter(
    (meta): meta is PostMeta =>
      meta !== null && meta.status === 'published' && meta.content_type === contentType
  );

  return posts.sort(
    (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );
}

export async function getLatestPosts(
  locale: string,
  contentType: 'writing' | 'reading',
  limit: number
): Promise<PostMeta[]> {
  const posts = await getPostsByType(locale, contentType);
  return posts.slice(0, limit);
}

export async function postExistsForLocale(slug: string, locale: string): Promise<boolean> {
  const resolved = await resolvePostPath(slug);
  if (!resolved) return false;
  const filePath = path.join(resolved.dir, `${locale}.mdx`);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function getPostAlternateLocale(
  slug: string,
  currentLocale: string
): Promise<string | null> {
  const altLocale = currentLocale === 'ko' ? 'en' : 'ko';
  const exists = await postExistsForLocale(slug, altLocale);
  return exists ? altLocale : null;
}

export async function getAllPostParams(): Promise<{ lang: string; slug: string }[]> {
  const slugs = await getAllSlugs();
  const checks = slugs.flatMap((slug) =>
    (['ko', 'en'] as const).map(async (locale) => {
      const exists = await postExistsForLocale(slug, locale);
      return exists ? { lang: locale as string, slug } : null;
    })
  );
  const results = await Promise.all(checks);
  return results.filter((r): r is { lang: string; slug: string } => r !== null);
}

export async function getAllPosts(locale: string): Promise<PostMeta[]> {
  const slugs = await getAllSlugs();
  const allMeta = await Promise.all(slugs.map((slug) => getPostMeta(slug, locale)));
  const posts = allMeta.filter(
    (meta): meta is PostMeta => meta !== null && meta.status === 'published'
  );
  return posts.sort(
    (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );
}

export async function getPostParamsByType(
  contentType: 'writing' | 'reading'
): Promise<{ lang: string; slug: string }[]> {
  const slugs = await getAllSlugs();
  const checks = slugs.flatMap((slug) =>
    (['ko', 'en'] as const).map(async (locale) => {
      const meta = await getPostMeta(slug, locale);
      return meta && meta.content_type === contentType ? { lang: locale as string, slug } : null;
    })
  );
  const results = await Promise.all(checks);
  return results.filter((r): r is { lang: string; slug: string } => r !== null);
}
