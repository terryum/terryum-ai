/**
 * Helpers for validating post slugs and reading post visibility metadata
 * inside API routes. Backed by `posts/index.json` (same source of truth as
 * the visibility middleware).
 */
import crypto from 'crypto';
import indexJson from '../../posts/index.json';

interface IndexedPost {
  slug: string;
  visibility?: 'public' | 'group' | 'private';
  allowed_groups?: string[];
  title_ko?: string;
  title_en?: string;
}

const POSTS: IndexedPost[] = ((indexJson as { posts?: IndexedPost[] }).posts ?? []).map((p) => ({
  slug: p.slug,
  visibility: p.visibility ?? 'public',
  allowed_groups: p.allowed_groups ?? [],
  title_ko: p.title_ko,
  title_en: p.title_en,
}));

const POSTS_BY_SLUG: Record<string, IndexedPost> = Object.fromEntries(POSTS.map((p) => [p.slug, p]));

export function getIndexedPost(slug: string): IndexedPost | null {
  return POSTS_BY_SLUG[slug] ?? null;
}

export function isKnownSlug(slug: string): boolean {
  return slug in POSTS_BY_SLUG;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('cf-connecting-ip') ?? 'unknown';
}

export function hashIp(ip: string): string {
  const secret = process.env.SESSION_SECRET || 'dev-only-fallback-secret';
  return crypto.createHmac('sha256', secret).update(ip).digest('hex').slice(0, 16);
}
