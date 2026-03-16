import { getPost } from '@/lib/posts';
import type { Metadata } from 'next';
import AutoRedirect from './AutoRedirect';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  // en 우선, 없으면 ko fallback
  const post = (await getPost(slug, 'en')) ?? (await getPost(slug, 'ko'));
  if (!post) return { title: 'Not Found' };

  const title = post.meta.seo_title || post.meta.title;
  const description = post.meta.seo_description || post.meta.summary;
  // og.png 우선 (generate-og-image.mjs로 생성), 없으면 cover.webp fallback
  const ogImage = `/posts/${slug}/og.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/posts/${slug}`,
      type: 'article',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function PostSharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <AutoRedirect slug={slug} />;
}
