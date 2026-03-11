import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import type { Post, PostMeta, FigureItem, Reference, PostRelation, AISummary } from '@/types/post';
import { normalizeTagSlug } from '@/lib/tags';
import { resolvePostAssetPath } from '@/lib/paths';

const POSTS_DIR = path.join(process.cwd(), 'posts');
const CATEGORIES = ['research', 'idea', 'essay'] as const;

async function readMetaJson(postDir: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await fs.readFile(path.join(postDir, 'meta.json'), 'utf-8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
}
type PostCategory = (typeof CATEGORIES)[number];

const CATEGORY_TO_CONTENT_TYPE: Record<PostCategory, 'reading' | 'writing' | 'essay'> = {
  research: 'reading',
  idea: 'writing',
  essay: 'essay',
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

function resolveContentType(
  data: Record<string, unknown>,
  category?: PostCategory
): 'writing' | 'reading' | 'essay' {
  if (category) return CATEGORY_TO_CONTENT_TYPE[category];
  let ct = (data.content_type || data.kind || 'writing') as string;
  if (ct === 'write' || ct === 'ideas') ct = 'writing';
  if (ct === 'read' || ct === 'research') ct = 'reading';
  return ct as 'writing' | 'reading' | 'essay';
}

function normalizeTags(
  data: Record<string, unknown>,
  category?: PostCategory
): string[] {
  const rawTags: string[] = (data.tags as string[]) || [];
  const tagSlugs = rawTags.map((t) => normalizeTagSlug(t));
  const contentTypeTag = category === 'research' ? 'Research' : category === 'essay' ? 'Essays' : 'Ideas';
  if (!tagSlugs.includes(normalizeTagSlug(contentTypeTag))) {
    rawTags.unshift(contentTypeTag);
  }
  return rawTags;
}

function normalizeGalleryItems(
  items: FigureItem[] | undefined,
  slug: string
): FigureItem[] {
  return (items || []).map((item) => ({
    ...item,
    src: resolvePostAssetPath(item.src, slug),
  }));
}

function normalizeMeta(
  data: Record<string, unknown>,
  slug: string,
  category?: PostCategory
): PostMeta {
  const contentType = resolveContentType(data, category);
  const coverImage = resolvePostAssetPath((data.cover_image as string) || '', slug);
  const rawThumb = (data.cover_thumb as string) || undefined;
  const coverThumb = rawThumb
    ? resolvePostAssetPath(rawThumb, slug)
    : coverImage
      ? `/posts/${slug}/cover-thumb.webp`
      : undefined;
  const tags = normalizeTags(data, category);

  return {
    post_id: (data.post_id as string) || slug,
    locale: (data.locale as string) || 'ko',
    title: (data.title as string) || 'Untitled',
    summary: (data.summary as string) || '',
    slug,
    published_at: (data.published_at as string) || new Date().toISOString(),
    updated_at: (data.updated_at as string) || (data.published_at as string) || new Date().toISOString(),
    status: (data.status as 'draft' | 'published') || 'draft',
    content_type: contentType,
    tags,
    display_tags: data.display_tags as string[] | undefined,
    cover_image: coverImage,
    cover_caption: data.cover_caption as string | undefined,
    cover_thumb: coverThumb,
    thumb_fit: (data.thumb_fit as 'cover' | 'contain') || undefined,
    card_summary: data.card_summary as string | undefined,
    reading_time_min: data.reading_time_min as number | undefined,
    seo_title: data.seo_title as string | undefined,
    seo_description: data.seo_description as string | undefined,
    source_date: data.source_date as string | undefined,
    source_url: data.source_url as string | undefined,
    source_title: data.source_title as string | undefined,
    source_author: data.source_author as string | undefined,
    source_type: data.source_type as string | undefined,
    source_project_url: data.source_project_url as string | undefined,
    source_authors_full: data.source_authors_full as string[] | undefined,
    first_author_scholar_url: data.first_author_scholar_url as string | undefined,
    google_scholar_url: data.google_scholar_url as string | undefined,
    citation_count: data.citation_count as number | undefined,
    citation_status: data.citation_status as 'manual' | 'ok' | 'failed' | undefined,
    citation_manual: data.citation_manual as boolean | undefined,
    citation_updated_at: data.citation_updated_at as string | undefined,
    references: ((data.references as Reference[] | undefined) || [])?.map((ref) => ({
      ...ref,
      category: ref.category || undefined,
    })),
    figures: normalizeGalleryItems(data.figures as FigureItem[] | undefined, slug),
    tables: normalizeGalleryItems(data.tables as FigureItem[] | undefined, slug),
    terrys_memo: data.terrys_memo as string | undefined,
    translation_of: data.translation_of as string | null | undefined,
    translated_to: data.translated_to as string[] | undefined,
    newsletter_eligible: data.newsletter_eligible as boolean | undefined,
    featured: data.featured as boolean | undefined,
    // AI Memory fields
    post_number: data.post_number as number | undefined,
    domain: data.domain as string | undefined,
    subfields: data.subfields as string[] | undefined,
    key_concepts: data.key_concepts as string[] | undefined,
    methodology: data.methodology as string[] | undefined,
    contribution_type: data.contribution_type as PostMeta['contribution_type'],
    relations: data.relations as PostRelation[] | undefined,
    ai_summary: data.ai_summary as AISummary | undefined,
    idea_status: data.idea_status as PostMeta['idea_status'],
    related_posts: data.related_posts as string[] | undefined,
  };
}

export async function getPost(slug: string, locale: string): Promise<Post | null> {
  const resolved = await resolvePostPath(slug);
  if (!resolved) return null;
  const filePath = path.join(resolved.dir, `${locale}.mdx`);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const { data: frontmatter, content } = matter(raw);
    const shared = await readMetaJson(resolved.dir);
    const merged = shared
      ? { ...shared, ...stripUndefined(frontmatter) }
      : frontmatter;
    return {
      meta: normalizeMeta(merged, slug, resolved.category),
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
  contentType: 'writing' | 'reading' | 'essay'
): Promise<PostMeta[]> {
  const slugs = await getAllSlugs();
  const allMeta = await Promise.all(slugs.map((slug) => getPostMeta(slug, locale)));
  const posts = allMeta.filter(
    (meta): meta is PostMeta =>
      meta !== null && meta.status === 'published' && meta.content_type === contentType
  );

  return posts.sort((a, b) => {
    const dateDiff = new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    if (dateDiff !== 0) return dateDiff;
    return (b.post_number ?? 0) - (a.post_number ?? 0);
  });
}

export async function getLatestPosts(
  locale: string,
  contentType: 'writing' | 'reading' | 'essay',
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
  return posts.sort((a, b) => {
    const dateDiff = new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    if (dateDiff !== 0) return dateDiff;
    return (b.post_number ?? 0) - (a.post_number ?? 0);
  });
}

export async function getPostParamsByType(
  contentType: 'writing' | 'reading' | 'essay'
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
