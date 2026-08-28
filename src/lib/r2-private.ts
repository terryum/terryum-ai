import 'server-only';
import { getCloudflareContext } from '@opennextjs/cloudflare';

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

interface PrivateR2Object {
  text(): Promise<string>;
  json<T>(): Promise<T>;
}

interface PrivateR2Binding {
  get(key: string): Promise<PrivateR2Object | null>;
}

async function getPrivateObject(key: string): Promise<PrivateR2Object | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const bucket = (env as CloudflareEnv & { PRIVATE_CONTENT_R2?: PrivateR2Binding }).PRIVATE_CONTENT_R2;
    if (!bucket) {
      console.error('[r2-private] PRIVATE_CONTENT_R2 binding is missing');
      return null;
    }
    return await bucket.get(key);
  } catch (e) {
    console.error(`[r2-private] R2 read failed for ${key}:`, e instanceof Error ? `${e.name}: ${e.message}` : e);
    return null;
  }
}

/**
 * Fetch a private MDX body from R2 and return it as a string.
 * Returns null if the object is missing or R2 is not configured.
 * Server-side only. The bucket has no public r2.dev URL.
 */
export async function fetchPrivateMdx(
  domain: PrivateDomain,
  type: string | null,
  slug: string,
  lang: string
): Promise<string | null> {
  const object = await getPrivateObject(privateBodyKey(domain, type, slug, lang));
  return object ? await object.text() : null;
}

/**
 * Fetch a private meta.json (optional) from R2 as a parsed object.
 */
export async function fetchPrivateMeta<T = unknown>(
  domain: PrivateDomain,
  type: string | null,
  slug: string
): Promise<T | null> {
  const object = await getPrivateObject(privateMetaKey(domain, type, slug));
  if (!object) return null;
  try {
    return await object.json<T>();
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
  return !!(await getPrivateObject(privateBodyKey(domain, type, slug, lang)));
}
