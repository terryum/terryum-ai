import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n';
import { getSurvey, loadPublicSurveys } from '@/lib/surveys';
import { requireReadAccess } from '@/lib/access-guard';
import { getCurrentIdentity } from '@/lib/identity';
import ProjectEmbed from '@/components/ProjectEmbed';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

async function privateSurveyEmbedUrl(slug: string, preview = false): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get('host') ?? '';
  const isTerryumHost = host === 'terryum.ai' || host.endsWith('.terryum.ai');
  const protocol = requestHeaders.get('x-forwarded-proto') ?? 'http';
  const origin = isTerryumHost
    ? 'https://private-surveys.terryum.ai'
    : `${protocol}://${host || 'localhost:3040'}`;
  return `${origin}/api/private-surveys/${encodeURIComponent(slug)}/${preview ? '__preview/' : ''}`;
}

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
  if (!survey || (!survey.embed_url && !survey.preview_embed_url)) notFound();
  const title = survey.title[lang as 'ko' | 'en'] || survey.title.en;
  const description = survey.description[lang as 'ko' | 'en'] || survey.description.en;
  const ogImage = survey.cover_image?.replace(/-cover\.webp$/, '-og.png');

  return {
    title,
    description,
    ...(survey.visibility === 'group' || survey.visibility === 'private'
      ? { robots: { index: false, follow: false } }
      : {}),
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
  if (!survey || (!survey.embed_url && !survey.preview_embed_url)) notFound();

  if (survey.visibility === 'private') {
    const id = await getCurrentIdentity();
    if (!id) {
      redirect(`/login?redirect=${encodeURIComponent(`/${lang}/surveys/${slug}`)}`);
    }
    if (id.role !== 'admin') notFound();
  } else {
    await requireReadAccess(survey, `/${lang}/surveys/${slug}`);
  }

  const title = survey.title[lang as 'ko' | 'en'] || survey.title.en;
  const embedUrl = survey.visibility === 'private'
    ? await privateSurveyEmbedUrl(survey.slug, Boolean(survey.preview_embed_url))
    : survey.embed_url;
  if (!embedUrl) notFound();

  return (
    <ProjectEmbed
      slug={survey.slug}
      title={title}
      embedUrl={embedUrl}
      locale={lang}
    />
  );
}
