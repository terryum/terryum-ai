import { notFound, redirect } from 'next/navigation';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { getDictionary } from '@/lib/dictionaries';
import { getPost, getPostAlternateLocale, getPostParamsByType, postExistsForLocale } from '@/lib/posts';
import { renderMDX } from '@/lib/mdx';
import ContentDetailPage from '@/components/ContentDetailPage';
import FallbackBanner from '@/components/FallbackBanner';
import type { Metadata } from 'next';

export async function generateStaticParams() {
  return getPostParamsByType('reading');
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const post = await getPost(slug, lang);
  if (!post) return { title: 'Not Found' };
  return {
    title: post.meta.seo_title || post.meta.title,
    description: post.meta.seo_description || post.meta.summary,
  };
}

export default async function ReadDetailPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!isValidLocale(lang)) notFound();

  let post = await getPost(slug, lang);
  let showFallback = false;

  // Fallback: if post doesn't exist in requested locale, check alternate
  if (!post) {
    const altLocale = lang === 'ko' ? 'en' : 'ko';
    const existsInAlt = await postExistsForLocale(slug, altLocale);
    if (existsInAlt) {
      redirect(`/${altLocale}/read/${slug}`);
    }
    notFound();
  }

  // Only show reading posts on read route
  if (post.meta.content_type !== 'reading') notFound();

  const dict = await getDictionary(lang as Locale);
  const { content } = await renderMDX(post.content, slug);
  const alternateLocale = await getPostAlternateLocale(slug, lang);

  return (
    <>
      {showFallback && <FallbackBanner message={dict.fallback_banner} />}
      <ContentDetailPage
        locale={lang as Locale}
        meta={post.meta}
        alternateLocale={alternateLocale}
        labels={dict.detail}
      >
        {content}
      </ContentDetailPage>
    </>
  );
}
