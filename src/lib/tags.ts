import tagsData from '@/data/tags.json';
import type { TagDefinition } from '@/types/tag';
import type { PostMeta } from '@/types/post';

const tagDefs: TagDefinition[] = tagsData.tags as TagDefinition[];

const tagMap = new Map<string, TagDefinition>(
  tagDefs.map((t) => [t.slug, t])
);

export function normalizeTagSlug(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function getTagLabel(slug: string, locale: string): string {
  const def = tagMap.get(slug);
  if (def) {
    return locale === 'en' ? def.label.en : def.label.ko;
  }
  // Graceful fallback: return raw slug titlecased
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function getAllTagDefinitions(): TagDefinition[] {
  return tagDefs;
}

export function computeTagCounts(posts: PostMeta[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags) {
      const slug = normalizeTagSlug(tag);
      counts.set(slug, (counts.get(slug) || 0) + 1);
    }
  }
  return counts;
}

export function sortTagsByCount(
  tagCounts: Map<string, number>
): { slug: string; count: number }[] {
  return Array.from(tagCounts.entries())
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => b.count - a.count);
}
