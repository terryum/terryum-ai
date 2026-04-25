import type { MetadataRoute } from 'next';
import { getAllSlugs, getPostMeta } from '@/lib/posts';
import { loadPublicSurveys } from '@/lib/surveys';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.terryum.ai';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // Static pages
  for (const lang of ['ko', 'en']) {
    entries.push(
      { url: `${BASE_URL}/${lang}`, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
      { url: `${BASE_URL}/${lang}/posts`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
      { url: `${BASE_URL}/${lang}/surveys`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
      { url: `${BASE_URL}/${lang}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    );
  }

  // Dynamic post pages
  const slugs = await getAllSlugs();
  for (const slug of slugs) {
    for (const lang of ['ko', 'en']) {
      const meta = await getPostMeta(slug, lang);
      if (meta && meta.status === 'published' && (!meta.visibility || meta.visibility === 'public')) {
        entries.push({
          url: `${BASE_URL}/${lang}/posts/${meta.slug}`,
          lastModified: new Date(meta.updated_at),
          changeFrequency: 'monthly',
          priority: 0.7,
        });
      }
    }
  }

  // Survey pages (public only)
  const surveys = await loadPublicSurveys();
  for (const survey of surveys) {
    if (survey.embed_url) {
      for (const lang of ['ko', 'en']) {
        entries.push({
          url: `${BASE_URL}/${lang}/surveys/${survey.slug}`,
          lastModified: new Date(survey.published_at),
          changeFrequency: 'monthly',
          priority: 0.7,
        });
      }
    }
  }

  return entries;
}
