import { notFound } from 'next/navigation';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { getProject, getAllProjects } from '@/lib/projects';
import ProjectEmbed from '@/components/ProjectEmbed';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  const projects = await getAllProjects();
  const params: { lang: string; slug: string }[] = [];
  for (const p of projects) {
    if (p.embed_url) {
      params.push({ lang: 'ko', slug: p.slug });
      params.push({ lang: 'en', slug: p.slug });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const project = await getProject(slug);
  if (!project) return {};
  const title = project.title[lang as 'ko' | 'en'] || project.title.en;
  const description = project.description[lang as 'ko' | 'en'] || project.description.en;
  // OG 이미지: webp는 X(Twitter) 크롤러 미지원 → jpg 변환본 사용
  const ogImage = project.cover_image
    ? project.cover_image.replace(/-cover\.webp$/, '-og.jpg')
    : undefined;
  const pageUrl = `/${lang}/projects/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: 'website',
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: title }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : [],
    },
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!isValidLocale(lang)) return null;

  const project = await getProject(slug);
  if (!project || !project.embed_url) notFound();

  const title = project.title[lang as 'ko' | 'en'] || project.title.en;

  return (
    <ProjectEmbed
      slug={project.slug}
      title={title}
      embedUrl={project.embed_url}
      locale={lang}
    />
  );
}
