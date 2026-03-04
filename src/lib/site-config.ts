export const SITE_CONFIG = {
  name: 'Terry Um',
  profileImage: '/images/profile_terry.jpeg',
  social: {
    github: 'https://github.com/terry-um',
    linkedin: 'https://linkedin.com/in/terryum',
    x: 'https://x.com/terryum_ai',
    email: 'mailto:hello@terryum.io',
  },
} as const;

/** Tag slugs that represent content types — filtered out in ContentCard tag display */
export const CONTENT_TYPE_TAG_SLUGS = new Set(['research', 'ideas']);

/** Max tags to show in TagFilterBar before "show more" */
export const TAG_DISPLAY_LIMIT = 6;

/** Default figure/image dimensions for MDX rendering */
export const FIGURE_DIMENSIONS = { width: 800, height: 450 } as const;
