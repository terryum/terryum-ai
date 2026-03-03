import { isValidLocale, type Locale } from '@/lib/i18n';
import { getDictionary } from '@/lib/dictionaries';
import { getPostsByType } from '@/lib/posts';
import ContentIndexPage from '@/components/ContentIndexPage';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return [{ lang: 'ko' }, { lang: 'en' }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);
  return {
    title: dict.write_index.title,
    description: dict.write_index.description,
  };
}

export default async function WritePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) return null;

  const dict = await getDictionary(lang);
  const posts = await getPostsByType(lang, 'writing');

  return (
    <ContentIndexPage
      locale={lang}
      title={dict.write_index.title}
      description={dict.write_index.description}
      posts={posts}
    />
  );
}
