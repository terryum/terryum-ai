import type { MetadataRoute } from 'next';
import { getAllSlugs, getPostMeta } from '@/lib/posts';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://terryum.io';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // Static pages
  for (const lang of ['ko', 'en']) {
    entries.push(
      { url: `${BASE_URL}/${lang}`, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
      { url: `${BASE_URL}/${lang}/write`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
      { url: `${BASE_URL}/${lang}/read`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
      { url: `${BASE_URL}/${lang}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    );
  }

  // Dynamic post pages
  const slugs = await getAllSlugs();
  for (const slug of slugs) {
    for (const lang of ['ko', 'en']) {
      const meta = await getPostMeta(slug, lang);
      if (meta && meta.status === 'published') {
        const section = meta.content_type === 'writing' ? 'write' : 'read';
        entries.push({
          url: `${BASE_URL}/${lang}/${section}/${meta.slug}`,
          lastModified: new Date(meta.updated_at),
          changeFrequency: 'monthly',
          priority: 0.7,
        });
      }
    }
  }

  return entries;
}
