export const SITE_CONFIG = {
  name: 'On the Manifold',
  profileImage: '/images/profile_terry.webp',
  profileImageOriginal: '/images/profile_terry_original.jpg',
  social: {
    linkedin: 'https://linkedin.com/in/terryum',
    github: 'https://github.com/terryum',
    facebook: 'https://facebook.com/terry.artlab',
    instagram: 'https://instagram.com/terry.artlab',
    youtube: 'https://www.youtube.com/@TerryTaeWoongUm',
    x: 'https://x.com/TerryUm_ML',
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

export const TAB_CONFIG: TabDefinition[] = [
  { slug: 'ideas',    matchTags: ['ideas'],    order: 0 },
  { slug: 'essays',   matchTags: ['essays'],   order: 1 },
  { slug: 'research', matchTags: ['research'], order: 2 },
];

/** All tab matchTags combined — used to hide tab tags from TagFilterBar & ContentCard */
export const TAB_TAG_SLUGS = new Set(TAB_CONFIG.flatMap(t => t.matchTags));

export const ETC_TAB_SLUG = 'etc';

/** Max tags to show in TagFilterBar before "show more" */
export const TAG_DISPLAY_LIMIT = 6;

/** Default figure/image dimensions for MDX rendering */
export const FIGURE_DIMENSIONS = { width: 800, height: 450 } as const;
