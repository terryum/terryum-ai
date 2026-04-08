import Link from 'next/link';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { getDictionary } from '@/lib/dictionaries';
import { getAllPostsFromIndex } from '@/lib/posts';
import { getAllProjects } from '@/lib/projects';
import { getAllSurveys } from '@/lib/surveys';
import { getBioContent, getBioPlainText } from '@/lib/about';
import { TAB_CONFIG } from '@/lib/site-config';
import { normalizeTagSlug } from '@/lib/tags';
import HeroSection from '@/components/HeroSection';
import LatestSection from '@/components/LatestSection';
import SurveyCard from '@/components/SurveyCard';
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
  const bioText = await getBioPlainText(lang as Locale);
  return {
    description: bioText,
  };
}

const aiMatchTags = new Set(TAB_CONFIG.filter(t => t.author === 'ai').flatMap(t => t.matchTags));
const terryMatchTags = new Set(TAB_CONFIG.filter(t => t.author === 'terry').flatMap(t => t.matchTags));

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) return null;

  const [dict, bioContent, allPosts, projects, surveys] = await Promise.all([
    getDictionary(lang),
    getBioContent(lang),
    getAllPostsFromIndex(lang),
    getAllProjects(),
    getAllSurveys(),
  ]);

  const aiPosts = allPosts.filter(p => p.tags.some(tag => aiMatchTags.has(normalizeTagSlug(tag))));
  const terryPosts = allPosts.filter(p => p.tags.some(tag => terryMatchTags.has(normalizeTagSlug(tag))));

  const sections = [
    { title: dict.home.latest_from_terry, href: `/${lang}/posts?author=terry`, posts: terryPosts },
    { title: dict.home.latest_from_ai,    href: `/${lang}/posts?author=ai`,    posts: aiPosts    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
      {/* Hero + Bio */}
      <HeroSection name={dict.hero.name} bio={bioContent} />

      {/* Dynamic sections from TAB_CONFIG */}
      {sections.map((section) => (
        <LatestSection
          key={section.href + section.title}
          title={section.title}
          viewAllHref={section.href}
          viewAllText={dict.home.view_all}
          showMoreText={dict.home.show_more}
          posts={section.posts}
          locale={lang}
          emptyText={dict.home.no_posts_yet}
          showTabTag={true}
          hidePubDate={true}
        />
      ))}

      {/* Latest Surveys */}
      {surveys.length > 0 && (
        <section className="py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-[540] text-text-primary tracking-tight">
              {dict.home.latest_surveys}
            </h2>
            <Link
              href={`/${lang}/surveys`}
              className="text-sm text-text-muted hover:text-accent transition-colors"
            >
              {dict.home.view_all} &rarr;
            </Link>
          </div>
          <div className="flex flex-col gap-6">
            {surveys.map((survey) => (
              <SurveyCard key={survey.slug} survey={survey} locale={lang} />
            ))}
          </div>
        </section>
      )}

      {/* Latest Projects */}
      {projects.length > 0 && (
        <section className="py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-[540] text-text-primary tracking-tight">
              {dict.home.latest_projects}
            </h2>
            <Link
              href={`/${lang}/projects`}
              className="text-sm text-text-muted hover:text-accent transition-colors"
            >
              {dict.home.view_all} &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.slug} project={project} locale={lang} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
