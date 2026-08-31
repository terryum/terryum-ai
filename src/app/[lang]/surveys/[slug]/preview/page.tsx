import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n';
import { getSurvey } from '@/lib/surveys';
import { getCurrentIdentity } from '@/lib/identity';
import ProjectEmbed from '@/components/ProjectEmbed';

export const dynamic = 'force-dynamic';

async function previewProxyUrl(slug: string): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get('host') ?? '';
  const protocol = requestHeaders.get('x-forwarded-proto') ?? 'http';
  const origin = host === 'terryum.ai' || host.endsWith('.terryum.ai')
    ? 'https://private-surveys.terryum.ai'
    : `${protocol}://${host || 'localhost:3040'}`;
  return `${origin}/api/private-surveys/${encodeURIComponent(slug)}/__preview/`;
}

export default async function SurveyPreviewPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  if (!isValidLocale(lang)) return null;
  const identity = await getCurrentIdentity();
  if (!identity) redirect(`/login?redirect=${encodeURIComponent(`/${lang}/surveys/${slug}/preview`)}`);
  if (identity.role !== 'admin') notFound();
  const survey = await getSurvey(slug);
  if (!survey?.preview_embed_url) notFound();
  const title = survey.title[lang] || survey.title.en;
  return <ProjectEmbed slug={`${survey.slug}-preview`} title={title} embedUrl={await previewProxyUrl(slug)} locale={lang} />;
}
