import 'katex/dist/katex.min.css';
import type { Metadata } from 'next';
import AutoRedirect from './AutoRedirect';
import indexJson from '../../../../posts/index.json';
import { resolvePostCdnPath } from '@/lib/paths';

// Static share route: reads metadata from index.json only (no fs/cookies) so
// Cloudflare Workers can serve it without runtime filesystem access.
// Social crawlers (Facebook/Twitter/LinkedIn) hit this route for OG tags;
// real users are redirected client-side to /<locale>/posts/<slug> by AutoRedirect.

export const dynamicParams = false;

interface IndexPost {
  slug: string;
  title_ko: string;
  title_en: string;
  summary_ko?: string;
  summary_en?: string;
  seo_title_en?: string;
  seo_description_en?: string;
  visibility?: string;
  ai_summary?: { one_liner?: string } | null;
}

const posts = (indexJson as unknown as { posts: IndexPost[] }).posts
  .filter((p) => (p.visibility ?? 'public') === 'public');

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) return { title: 'Not Found' };

  const title = post.seo_title_en || post.title_en || post.title_ko;
  const description =
    post.seo_description_en ||
    post.summary_en ||
    post.summary_ko ||
    post.ai_summary?.one_liner ||
    '';
  const ogImage = resolvePostCdnPath(slug, 'og.png');

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
