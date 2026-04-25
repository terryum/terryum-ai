import { notFound } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n';
import { getSurvey, loadPublicSurveys } from '@/lib/surveys';
import { requireReadAccess } from '@/lib/access-guard';
import ProjectEmbed from '@/components/ProjectEmbed';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  const surveys = await loadPublicSurveys();
  const params: { lang: string; slug: string }[] = [];
  for (const s of surveys) {
    if (s.embed_url) {
      params.push({ lang: 'ko', slug: s.slug });
      params.push({ lang: 'en', slug: s.slug });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const survey = await getSurvey(slug);
  // notFound() in generateMetadata so the framework sets HTTP 404 before
  // the page render; otherwise the response commits at 200 even with the
  // not-found tree rendered.
  if (!survey || !survey.embed_url) notFound();
  const title = survey.title[lang as 'ko' | 'en'] || survey.title.en;
  const description = survey.description[lang as 'ko' | 'en'] || survey.description.en;
  const ogImage = survey.cover_image?.replace(/-cover\.webp$/, '-og.jpg');

  return {
    title,
    description,
    ...(survey.visibility === 'group' ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title,
      description,
      type: 'website',
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: title }] : [],
    },
  };
}

export default async function SurveyDetailPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!isValidLocale(lang)) return null;

  const survey = await getSurvey(slug);
  if (!survey || !survey.embed_url) notFound();

  // List/metadata can be public (per user policy); only the iframe content is gated.
  await requireReadAccess(survey, `/${lang}/surveys/${slug}`);

  const title = survey.title[lang as 'ko' | 'en'] || survey.title.en;

  return (
    <ProjectEmbed
      slug={survey.slug}
      title={title}
      embedUrl={survey.embed_url}
      locale={lang}
    />
  );
}
