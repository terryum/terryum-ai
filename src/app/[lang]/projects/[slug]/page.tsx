import { notFound } from 'next/navigation';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { getDictionary } from '@/lib/dictionaries';
import { getProject, getAllProjects } from '@/lib/projects';
import ProjectEmbed from '@/components/ProjectEmbed';
import type { Metadata } from 'next';

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
  return { title, description };
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

  const dict = await getDictionary(lang);
  const title = project.title[lang as 'ko' | 'en'] || project.title.en;

  return (
    <ProjectEmbed
      slug={project.slug}
      title={title}
      embedUrl={project.embed_url}
      links={project.links}
      locale={lang}
      backLabel={dict.detail.back_to_list}
    />
  );
}
