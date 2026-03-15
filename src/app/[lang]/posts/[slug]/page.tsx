import { getPost, getAllPostParams } from '@/lib/posts';
import { buildContentDetailProps } from '@/lib/content-page-helpers';
import ContentDetailPage from '@/components/ContentDetailPage';
import type { Metadata } from 'next';

export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllPostParams();
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

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  const { locale, post, content, alternateLocale, labels, relatedPosts, taxonomyBreadcrumb } =
    await buildContentDetailProps(lang, slug);

  return (
    <ContentDetailPage
      locale={locale}
      meta={post.meta}
      alternateLocale={alternateLocale}
      labels={labels}
      relatedPosts={relatedPosts}
      taxonomyBreadcrumb={taxonomyBreadcrumb}
    >
      {content}
    </ContentDetailPage>
  );
}
