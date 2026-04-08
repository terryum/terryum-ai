import { getSurvey } from '@/lib/surveys';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const survey = await getSurvey(slug);
  if (!survey) return { title: 'Not Found' };

  const title = survey.title.en;
  const description = survey.description.en;
  const ogImage = survey.cover_image?.startsWith('/api/')
    ? undefined
    : survey.cover_image?.replace(/-cover\.webp$/, '-og.jpg');

  return {
    title,
    description,
    ...(survey.visibility === 'group' ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title,
      description,
      url: `/surveys/${slug}`,
      type: 'website',
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: title }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : [],
    },
  };
}

export default async function SurveySharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const savedLang = cookieStore.get('preferred-lang')?.value;
  const locale = savedLang === 'ko' ? 'ko' : 'en';
  redirect(`/${locale}/surveys/${slug}`);
}
