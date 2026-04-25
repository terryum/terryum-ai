/**
 * R2 fetch helpers for private content (Node scripts).
 * Mirrors src/lib/r2-private.ts but kept .mjs because Node scripts can't
 * import .ts modules without a build step.
 *
 * Layout in R2:
 *   private/posts/<type>/<slug>/meta.json
 *   private/posts/<type>/<slug>/<lang>.mdx
 *
 * Caller must `await loadEnv()` (scripts/lib/env.mjs) and pass a non-empty
 * R2 base URL (typically getR2PublicUrl()).
 */

function privateBodyUrl(baseUrl, contentType, slug, lang) {
  return `${baseUrl}/private/posts/${contentType}/${slug}/${lang}.mdx`;
}

function privateMetaUrl(baseUrl, contentType, slug) {
  return `${baseUrl}/private/posts/${contentType}/${slug}/meta.json`;
}

export async function fetchPrivateMdx(baseUrl, contentType, slug, lang) {
  const url = privateBodyUrl(baseUrl, contentType, slug, lang);
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function fetchPrivateMeta(baseUrl, contentType, slug) {
  const url = privateMetaUrl(baseUrl, contentType, slug);
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return JSON.parse(await res.text());
  } catch {
    return null;
  }
}
