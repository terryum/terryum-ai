export const SITE_CONFIG = {
  name: 'Terry Um',
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

/** Tag slugs that represent content types — filtered out in ContentCard tag display */
export const CONTENT_TYPE_TAG_SLUGS = new Set(['research', 'ideas', 'essays']);

/** Max tags to show in TagFilterBar before "show more" */
export const TAG_DISPLAY_LIMIT = 6;

/** Default figure/image dimensions for MDX rendering */
export const FIGURE_DIMENSIONS = { width: 800, height: 450 } as const;
