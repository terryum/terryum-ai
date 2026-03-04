import { isValidLocale, type Locale } from '@/lib/i18n';
import { getDictionary } from '@/lib/dictionaries';
import { getAllPosts } from '@/lib/posts';
import { computeTagCounts, sortTagsByCount, getTagLabel } from '@/lib/tags';
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
    title: dict.ideas_index.title,
    description: dict.ideas_index.description,
  };
}

export default async function IdeasPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) return null;

  const dict = await getDictionary(lang);
  const posts = await getAllPosts(lang);

  const tagCounts = computeTagCounts(posts);
  const sorted = sortTagsByCount(tagCounts);
  const allTags = sorted.map(({ slug, count }) => ({
    slug,
    label: getTagLabel(slug, lang),
    count,
  }));

  return (
    <ContentIndexPage
      locale={lang}
      title={dict.ideas_index.title}
      description={dict.ideas_index.description}
      posts={posts}
      allTags={allTags}
      initialSelectedTags={['ideas']}
      filterDict={dict.filter}
    />
  );
}
