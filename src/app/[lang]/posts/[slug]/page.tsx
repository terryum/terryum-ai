import 'katex/dist/katex.min.css';
import { getPost, getAllPostParams } from '@/lib/posts';
import { buildContentDetailProps } from '@/lib/content-page-helpers';
import { requireReadAccess } from '@/lib/access-guard';
import ContentDetailPage from '@/components/ContentDetailPage';
import type { Metadata } from 'next';

// Match the surveys route: render every request on-demand so that private/group
// slugs resolve via the R2 fallback behind requireReadAccess. Mixing SSG with
// dynamicParams=true crashed on OpenNext + Workers for slugs outside the
// prerender manifest (renders errored in the Server Components path before
// our try/catch could see them).
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export async function generateStaticParams() {
  return getAllPostParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  console.log(`[page:generateMetadata] enter ${slug} ${lang}`);
  let post: Awaited<ReturnType<typeof getPost>> = null;
  try {
    post = await getPost(slug, lang);
  } catch (e) {
    console.error(`[page:generateMetadata] getPost threw:`, e);
  }
  console.log(`[page:generateMetadata] post=${post ? 'yes' : 'null'} for ${slug}`);
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
  console.log(`[page:PostDetailPage] enter ${slug} ${lang}`);
  const gateMeta = (await getPost(slug, lang))?.meta;
  console.log(`[page:PostDetailPage] gateMeta=${gateMeta ? gateMeta.visibility : 'null'}`);
  if (gateMeta) {
    await requireReadAccess(gateMeta, `/${lang}/posts/${slug}`);
  }
  console.log(`[page:PostDetailPage] past gate, calling buildContentDetailProps`);
  const { locale, post, content, alternateLocale, labels, relatedPosts, taxonomyBreadcrumb, adjacentPosts } =
    await buildContentDetailProps(lang, slug);
  console.log(`[page:PostDetailPage] got props, rendering`);

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
