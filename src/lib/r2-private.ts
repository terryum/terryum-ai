import 'server-only';

const R2_URL = process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_URL || '';

export type PrivateDomain = 'posts' | 'projects';

/**
 * Build the R2 key for a private content body.
 *
 * posts: private/posts/<type>/<slug>/<lang>.mdx
 * projects: private/projects/<slug>/<lang>.mdx
 */
export function privateBodyKey(
  domain: PrivateDomain,
  type: string | null,
  slug: string,
  lang: string
): string {
  if (domain === 'posts') {
    if (!type) throw new Error('posts domain requires a content type');
    return `private/posts/${type}/${slug}/${lang}.mdx`;
  }
  return `private/projects/${slug}/${lang}.mdx`;
}

/**
 * Build the R2 key for a private meta.json (optional rich metadata).
 */
export function privateMetaKey(
  domain: PrivateDomain,
  type: string | null,
  slug: string
): string {
  if (domain === 'posts') {
    if (!type) throw new Error('posts domain requires a content type');
    return `private/posts/${type}/${slug}/meta.json`;
  }
  return `private/projects/${slug}/meta.json`;
}

async function fetchR2(key: string): Promise<Response | null> {
  if (!R2_URL) return null;
  try {
    // Use plain fetch with no cache hint: `cache:'no-store'` flips the page
    // to dynamic and throws "static to dynamic" on Workers; `next.revalidate`
    // also triggers the dynamic-rendering path in some OpenNext code paths.
    // Default fetch on Workers is uncached per-request, which is fine here.
    const res = await fetch(`${R2_URL}/${key}`);
    if (!res.ok) return null;
    return res;
  } catch (e) {
    console.error(`[r2-private] fetch failed for ${key}:`, e instanceof Error ? `${e.name}: ${e.message}` : e);
    return null;
  }
}

/**
 * Fetch a private MDX body from R2 and return it as a string.
 * Returns null if the object is missing or R2 is not configured.
 * Server-side only — the URL must never be exposed to the client.
 */
export async function fetchPrivateMdx(
  domain: PrivateDomain,
  type: string | null,
  slug: string,
  lang: string
): Promise<string | null> {
  const res = await fetchR2(privateBodyKey(domain, type, slug, lang));
  return res ? await res.text() : null;
}

/**
 * Fetch a private meta.json (optional) from R2 as a parsed object.
 */
export async function fetchPrivateMeta<T = unknown>(
  domain: PrivateDomain,
  type: string | null,
  slug: string
): Promise<T | null> {
  const res = await fetchR2(privateMetaKey(domain, type, slug));
  if (!res) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Check whether a private body exists in R2 (HEAD equivalent via GET).
 */
export async function privateBodyExists(
  domain: PrivateDomain,
  type: string | null,
  slug: string,
  lang: string
): Promise<boolean> {
  const res = await fetchR2(privateBodyKey(domain, type, slug, lang));
  return !!res;
}
