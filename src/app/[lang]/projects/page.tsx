import { isValidLocale, type Locale } from '@/lib/i18n';
import { getDictionary } from '@/lib/dictionaries';
import { getAllProjects } from '@/lib/projects';
import { Container } from '@/components/ui/Container';
import ProjectCard from '@/components/ProjectCard';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

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
    title: dict.projects.title,
    description: dict.projects.description,
  };
}

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) return null;

  const dict = await getDictionary(lang);
  const projects = await getAllProjects();

  return (
    <Container className="py-10">
      <h1 className="text-2xl font-bold text-text-primary tracking-tight">
        {dict.projects.title}
      </h1>
      <p className="text-sm text-text-muted mt-2 mb-8">
        {dict.projects.description}
      </p>

      {projects.length === 0 ? (
        <p className="text-text-muted py-8 text-center">
          {dict.projects.empty}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.slug} project={project} locale={lang} />
          ))}
        </div>
      )}
    </Container>
  );
}
