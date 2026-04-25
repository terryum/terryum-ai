import 'katex/dist/katex.min.css';
import { getPost, getAllPostParams } from '@/lib/posts';
import { buildContentDetailProps } from '@/lib/content-page-helpers';
import { requireReadAccess } from '@/lib/access-guard';
import ContentDetailPage from '@/components/ContentDetailPage';
import type { Metadata } from 'next';

// Pure SSG: every public slug is in posts/index.json, generateStaticParams
// returns them all, and the build prerenders to static HTML (Workers serves
// the cached output). dynamicParams=false makes unknown slugs 404 cleanly
// instead of triggering the OpenNext+Workers crash on hybrid SSG paths.
// Re-introduce dynamicParams only after the runtime data path is Workers-safe
// (fs.readFile in src/lib/posts.ts:206 fails on Workers — public MDX bodies
// would need to move to R2 first).
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

  const title = post.meta.seo_title || post.meta.title;
  const description = post.meta.seo_description || post.meta.summary;
  // og.png 우선 (PNG — 소셜 미리보기 호환성), cover.webp는 페이지 내 표시용
  const ogImage = `/posts/${slug}/og.png`;
  const pageUrl = `/posts/${slug}`;

  return {
    title,
    description,
    ...(post.meta.visibility === 'group' ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title,
      description,
      url: pageUrl,
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

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  const gateMeta = (await getPost(slug, lang))?.meta;
  if (gateMeta) {
    await requireReadAccess(gateMeta, `/${lang}/posts/${slug}`);
  }
  const { locale, post, content, alternateLocale, labels, relatedPosts, taxonomyBreadcrumb, adjacentPosts } =
    await buildContentDetailProps(lang, slug);

  return (
    <ContentDetailPage
      locale={locale}
      meta={post.meta}
      alternateLocale={alternateLocale}
      labels={labels}
      relatedPosts={relatedPosts}
      taxonomyBreadcrumb={taxonomyBreadcrumb}
      adjacentPosts={adjacentPosts}
    >
      {content}
    </ContentDetailPage>
  );
}
