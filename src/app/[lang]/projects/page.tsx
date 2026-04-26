import { redirect } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n';

export function generateStaticParams() {
  return [{ lang: 'ko' }, { lang: 'en' }];
}

// Projects has been merged into /about as the "Code" curation section.
// Edge middleware also handles this redirect; the page-level redirect
// covers any environment where middleware doesn't run.
export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) return null;
  redirect(`/${lang}/about`);
}
