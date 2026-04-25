import { redirect } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

// Project detail pages have been removed. Live links now point to the GitHub
// repo or external host directly via the About → Code curation. Any old
// /projects/<slug> deep link funnels back to /about.
export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) return null;
  redirect(`/${lang}/about`);
}
