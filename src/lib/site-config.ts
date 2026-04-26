export const SITE_CONFIG = {
  name: 'On the Manifold',
  profileImage: '/images/profile_terry.webp',
  profileImageOriginal: '/images/profile_terry_original.jpg',
  social: {
    linkedin: 'https://linkedin.com/in/terryum',
    github: 'https://github.com/terryum',
    facebook: 'https://facebook.com/terry.artlab',
    instagram: 'https://instagram.com/terry.artlab',
    threads: 'https://www.threads.net/@terry.artlab',
    youtube: 'https://www.youtube.com/@TerryTaeWoongUm',
    x: 'https://x.com/TerryUm_ML',
    bluesky: 'https://bsky.app/profile/terryum.bsky.social',
    substack: 'https://substack.com/@terryum',
    email: '#', // obfuscated in SocialIcons component
    googleScholar: 'https://scholar.google.com/citations?user=9Zgeg14AAAAJ',
  },
} as const;

/* ─── Tab system ─── */

export interface TabDefinition {
  slug: string;        // URL param value & tag slug
  matchTags: string[]; // posts matching ANY of these tags belong to this tab
  order: number;       // display order in nav menu
}

// Header order: Essays · Surveys · Papers · Notes (depth/weight descending).
// Surveys is rendered separately (top-level route), not via TAB_CONFIG.
export const TAB_CONFIG: TabDefinition[] = [
  { slug: 'essays', matchTags: ['essays'],            order: 0 },
  { slug: 'papers', matchTags: ['papers'],            order: 1 },
  { slug: 'notes',  matchTags: ['memos', 'threads'],  order: 2 },
];

/** All tab matchTags combined — used to hide tab tags from TagFilterBar & ContentCard */
export const TAB_TAG_SLUGS = new Set(TAB_CONFIG.flatMap(t => t.matchTags));

/** Resolve a post's content_type to its nav tab slug (e.g. "memos" → "notes"). */
export function getTabSlugForContentType(contentType: string | undefined | null): string | null {
  if (!contentType) return null;
  const tab = TAB_CONFIG.find(
    t => t.slug === contentType || t.matchTags.includes(contentType),
  );
  return tab?.slug ?? null;
}

export const ETC_TAB_SLUG = 'etc';

/** Max tags to show in TagFilterBar before "show more" */
export const TAG_DISPLAY_LIMIT = 6;

/** Default figure/image dimensions for MDX rendering */
export const FIGURE_DIMENSIONS = { width: 800, height: 450 } as const;
