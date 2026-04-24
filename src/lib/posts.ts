import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import type { Post, PostMeta, FigureItem, Reference, PostRelation, AISummary } from '@/types/post';
import { normalizeTagSlug } from '@/lib/tags';
import { resolvePostAssetPath, resolvePostCdnPath } from '@/lib/paths';
import { TAB_CONFIG } from '@/lib/site-config';
import indexJson from '../../posts/index.json';
import taxonomyJson from '../../posts/taxonomy.json';
import contentConfig from '../../content.config.json';
// Private bodies (visibility: private|group) live in R2 under `private/posts/<type>/<slug>/<lang>.mdx`.
// Dynamic import to avoid pulling server-only into static paths.

export async function loadIndexJson(): Promise<Record<string, unknown>> {
  return indexJson as unknown as Record<string, unknown>;
}

export async function loadTaxonomyJson(): Promise<Record<string, unknown>> {
  return taxonomyJson as unknown as Record<string, unknown>;
}

const POSTS_DIR = path.join(process.cwd(), 'posts');
const CATEGORIES = contentConfig.activeTabs;

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

const CATEGORY_TO_CONTENT_TYPE = Object.fromEntries(
  CATEGORIES.map(c => [c, c])
) as Record<PostCategory, PostCategory>;

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
): PostCategory {
  if (category) return CATEGORY_TO_CONTENT_TYPE[category];
  const ct = (data.content_type as string) || 'essays';
  if ((CATEGORIES as readonly string[]).includes(ct)) return ct as PostCategory;
  return 'essays';
}

function normalizeTags(
  data: Record<string, unknown>,
  category?: PostCategory
): string[] {
  const rawTags: string[] = (data.tags as string[]) || [];
  const tagSlugs = rawTags.map((t) => normalizeTagSlug(t));
  const contentTypeTagMap: Record<PostCategory, string> = {
    papers: 'Papers',
    threads: 'Threads',
    memos: 'Memos',
    essays: 'Essays',
  };
  const contentTypeTag = category ? contentTypeTagMap[category] : 'Essays';
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
    cover_figure_number: data.cover_figure_number as number | undefined,
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
    taxonomy_primary: data.taxonomy_primary as string | undefined,
    taxonomy_secondary: data.taxonomy_secondary as string[] | undefined,
    visibility: (data.visibility as PostMeta['visibility']) || 'public',
    allowed_groups: data.allowed_groups as string[] | undefined,
  };
}

export async function getPost(slug: string, locale: string): Promise<Post | null> {
  // Try filesystem first (public posts)
  const resolved = await resolvePostPath(slug);
  if (resolved) {
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
      // fall through to R2 private fetch
    }
  }

  // Fallback: private body in R2 under private/posts/<type>/<slug>/<lang>.mdx.
  const index = await loadIndexJson();
  const entry = (index as { posts?: Array<Record<string, unknown>> }).posts?.find(
    (p) => p.slug === slug
  );
  if (!entry) return null;
  const contentType = (entry.content_type as string) || 'essays';
  const { fetchPrivateMdx } = await import('@/lib/r2-private');
  const raw = await fetchPrivateMdx('posts', contentType, slug, locale);
  if (!raw) return null;
  const { data: frontmatter, content } = matter(raw);
  // Merge precedence: frontmatter wins for content fields, but the index
  // entry wins for paths (cover_image/cover_thumb) because those may point
  // at a different bucket/API than the R2 body itself.
  const merged: Record<string, unknown> = { ...entry, ...stripUndefined(frontmatter) };
  if (entry.cover_image) merged.cover_image = entry.cover_image;
  if (entry.cover_thumb) merged.cover_thumb = entry.cover_thumb;
  return {
    meta: normalizeMeta(merged, slug, contentType as PostCategory),
    content,
  };
}

export async function getPostMeta(slug: string, locale: string): Promise<PostMeta | null> {
  const post = await getPost(slug, locale);
  return post?.meta ?? null;
}

export async function getPostsByType(
  locale: string,
  contentType: PostCategory
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
  contentType: PostCategory,
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
  // index.json is the single source of truth for both public and private post
  // metadata; private bodies live in R2 and are fetched only on the detail page.
  return getAllPostsFromIndex(locale);
}

/**
 * Lightweight post loader using pre-built index.json.
 * Reads a single JSON file instead of 50+ MDX files.
 * Does NOT call cookies() — safe for ISR/static pages.
 *
 * Returns BOTH public and private/group entries. List pages render a 🔒 badge
 * for non-public items, and detail pages gate access via requireReadAccess.
 */
export async function getAllPostsFromIndex(locale: string): Promise<PostMeta[]> {
  const index = await loadIndexJson();
  const posts = (index as { posts: Array<Record<string, unknown>> }).posts;
  if (!posts) return getAllPublicPosts(locale);

  const CONTENT_TYPE_TAG: Record<string, string> = {
    papers: 'Papers',
    notes: 'Notes',
    memos: 'Memos',
    essays: 'Essays',
  };
  const result: PostMeta[] = posts
    .map((p) => {
      // Inject content-type tag if missing (parity with normalizeTags for filesystem posts)
      const contentType = p.content_type as string;
      const rawTags = (p.tags as string[]) ?? [];
      const ctTag = CONTENT_TYPE_TAG[contentType];
      const tagSlugs = new Set(rawTags.map(normalizeTagSlug));
      const tags = ctTag && !tagSlugs.has(normalizeTagSlug(ctTag))
        ? [ctTag, ...rawTags]
        : rawTags;
      return {
      post_id: p.slug as string,
      locale,
      title: (locale === 'ko' ? p.title_ko : p.title_en) as string,
      summary: (locale === 'ko' ? p.summary_ko as string : p.summary_en as string) || (p.ai_summary as Record<string, string>)?.one_liner || '',
      slug: p.slug as string,
      published_at: p.published_at as string,
      updated_at: p.published_at as string,
      status: 'published' as const,
      content_type: p.content_type as PostMeta['content_type'],
      tags,
      cover_image: (p.cover_image as string) || resolvePostCdnPath(p.slug as string, 'cover.webp'),
      cover_thumb: (p.cover_thumb as string) || resolvePostCdnPath(p.slug as string, 'cover-thumb.webp'),
      post_number: p.post_number as number,
      domain: p.domain as string,
      subfields: (p.subfields as string[]) ?? [],
      key_concepts: (p.key_concepts as string[]) ?? [],
      methodology: (p.methodology as string[]) ?? [],
      contribution_type: p.contribution_type as PostMeta['contribution_type'],
      relations: (p.relations as PostMeta['relations']) ?? [],
      ai_summary: p.ai_summary as PostMeta['ai_summary'],
      taxonomy_primary: p.taxonomy_primary as string,
      taxonomy_secondary: (p.taxonomy_secondary as string[]) ?? [],
      source_author: p.source_author as string,
      source_date: p.source_date as string,
      source_type: p.source_type as string,
      visibility: (p.visibility as PostMeta['visibility']) || 'public',
      allowed_groups: (p.allowed_groups as string[]) || undefined,
      };
    });

  return result.sort((a, b) => {
    const dateDiff = new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    if (dateDiff !== 0) return dateDiff;
    return (b.post_number ?? 0) - (a.post_number ?? 0);
  });
}

/** Public posts only — no cookies() call, safe for ISR/static rendering */
function getAllPublicPosts(locale: string): Promise<PostMeta[]> {
  return getAllSlugs().then(async (slugs) => {
    const allMeta = await Promise.all(slugs.map((slug) => getPostMeta(slug, locale)));
    return allMeta
      .filter((meta): meta is PostMeta => meta !== null && meta.status === 'published')
      .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  });
}

export interface AdjacentPost {
  slug: string;
  title: string;
}

export interface AdjacentPosts {
  prev: AdjacentPost | null; // 이전 글: older post (published before current)
  next: AdjacentPost | null; // 다음 글: newer post (published after current)
}

/**
 * Returns adjacent posts within the same author group (AI or Terry).
 * Grouping is driven by TAB_CONFIG.author — adding a new tab with the correct
 * author field automatically includes it in the right prev/next navigation group.
 */
export async function getAdjacentPosts(
  slug: string,
  locale: string
): Promise<AdjacentPosts> {
  // IMPORTANT: Use getAllPostsFromIndex (public-only, reads index.json via static import)
  // instead of getAllPosts (which calls cookies() → forces route to be dynamic on Workers).
  // Public post detail pages must stay fully SSG so Cloudflare serves pre-rendered HTML.
  const allPosts = await getAllPostsFromIndex(locale);

  const currentMeta = allPosts.find(p => p.slug === slug);
  if (!currentMeta) return { prev: null, next: null };

  const currentTab = TAB_CONFIG.find(t => t.slug === currentMeta.content_type);
  if (!currentTab) return { prev: null, next: null };

  const authorGroup = currentTab.author;
  const authorContentTypes = new Set(
    TAB_CONFIG.filter(t => t.author === authorGroup).map(t => t.slug)
  );

  const groupPosts = allPosts.filter(p => authorContentTypes.has(p.content_type));

  const idx = groupPosts.findIndex(p => p.slug === slug);
  if (idx === -1) return { prev: null, next: null };

  // Desc-sorted: idx+1 = older post (이전 글), idx-1 = newer post (다음 글)
  const prevPost = idx + 1 < groupPosts.length ? groupPosts[idx + 1] : null;
  const nextPost = idx > 0 ? groupPosts[idx - 1] : null;

  return {
    prev: prevPost ? { slug: prevPost.slug, title: prevPost.title } : null,
    next: nextPost ? { slug: nextPost.slug, title: nextPost.title } : null,
  };
}

export async function getPostParamsByType(
  contentType: PostCategory
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

/**
 * Filter posts by visibility based on the user's authenticated group and admin status.
 * - public (or undefined): always visible
 * - group: visible only if user's group is in allowed_groups, or user is admin
 */
export function filterByVisibility(
  posts: PostMeta[],
  authenticatedGroup: string | null,
  isAdmin: boolean,
): PostMeta[] {
  if (isAdmin) return posts;
  return posts.filter((p) => {
    if (!p.visibility || p.visibility === 'public') return true;
    if (p.visibility === 'group' && authenticatedGroup) {
      return p.allowed_groups?.includes(authenticatedGroup) ?? false;
    }
    return false;
  });
}
