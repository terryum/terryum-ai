import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import type { Post, PostMeta } from '@/types/post';

const POSTS_DIR = path.join(process.cwd(), 'posts');

export async function getAllSlugs(): Promise<string[]> {
  const entries = await fs.readdir(POSTS_DIR, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

function normalizeMeta(data: Record<string, unknown>, slug: string): PostMeta {
  // Support both content_type and kind fields
  let contentType = (data.content_type || data.kind || 'writing') as string;
  if (contentType === 'write') contentType = 'writing';
  if (contentType === 'read') contentType = 'reading';

  // Normalize cover_image path
  let coverImage = (data.cover_image as string) || '';
  if (coverImage.startsWith('./')) {
    coverImage = `/posts/${slug}/${coverImage.slice(2)}`;
  }

  return {
    post_id: (data.post_id as string) || slug,
    locale: (data.locale as string) || 'ko',
    title: (data.title as string) || 'Untitled',
    summary: (data.summary as string) || '',
    slug: (data.slug as string) || slug,
    published_at: (data.published_at as string) || new Date().toISOString(),
    updated_at: (data.updated_at as string) || (data.published_at as string) || new Date().toISOString(),
    status: (data.status as 'draft' | 'published') || 'draft',
    content_type: contentType as 'writing' | 'reading',
    tags: (data.tags as string[]) || [],
    cover_image: coverImage,
    reading_time_min: data.reading_time_min as number | undefined,
    seo_title: data.seo_title as string | undefined,
    seo_description: data.seo_description as string | undefined,
    source_url: data.source_url as string | undefined,
    source_title: data.source_title as string | undefined,
    source_author: data.source_author as string | undefined,
    source_type: data.source_type as string | undefined,
    translation_of: data.translation_of as string | null | undefined,
    translated_to: data.translated_to as string[] | undefined,
    newsletter_eligible: data.newsletter_eligible as boolean | undefined,
    featured: data.featured as boolean | undefined,
  };
}

export async function getPost(slug: string, locale: string): Promise<Post | null> {
  const filePath = path.join(POSTS_DIR, slug, `${locale}.mdx`);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const { data, content } = matter(raw);
    return {
      meta: normalizeMeta(data, slug),
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
  const posts: PostMeta[] = [];

  for (const slug of slugs) {
    const meta = await getPostMeta(slug, locale);
    if (meta && meta.status === 'published' && meta.content_type === contentType) {
      posts.push(meta);
    }
  }

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
  const filePath = path.join(POSTS_DIR, slug, `${locale}.mdx`);
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
  const params: { lang: string; slug: string }[] = [];

  for (const slug of slugs) {
    for (const locale of ['ko', 'en']) {
      const exists = await postExistsForLocale(slug, locale);
      if (exists) {
        params.push({ lang: locale, slug });
      }
    }
  }

  return params;
}

export async function getPostParamsByType(
  contentType: 'writing' | 'reading'
): Promise<{ lang: string; slug: string }[]> {
  const slugs = await getAllSlugs();
  const params: { lang: string; slug: string }[] = [];

  for (const slug of slugs) {
    for (const locale of ['ko', 'en']) {
      const meta = await getPostMeta(slug, locale);
      if (meta && meta.content_type === contentType) {
        params.push({ lang: locale, slug });
      }
    }
  }

  return params;
}
