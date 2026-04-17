import { isValidLocale, type Locale } from '@/lib/i18n';
import { getDictionary } from '@/lib/dictionaries';
import { getAllPostsFromIndex } from '@/lib/posts';
import { loadPublicProjects } from '@/lib/projects';
import { loadPublicSurveys } from '@/lib/surveys';
import { getBioContent, getBioPlainText } from '@/lib/about';
import { TAB_CONFIG } from '@/lib/site-config';
import { normalizeTagSlug } from '@/lib/tags';
import HeroSection from '@/components/HeroSection';
import LatestSection from '@/components/LatestSection';
import CompactCard from '@/components/CompactCard';
import type { Metadata } from 'next';

// Fully static

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
    loadPublicProjects(),
    loadPublicSurveys(),
  ]);

  const l = lang as 'ko' | 'en';
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
        <LatestSection
          title={dict.home.latest_surveys}
          viewAllHref={`/${lang}/surveys`}
          viewAllText={dict.home.view_all}
          showMoreText={dict.home.show_more}
          emptyText={dict.home.no_posts_yet}
        >
          {surveys.map((survey) => {
            // Group-restricted surveys have embed_url stripped for privacy,
            // but route internally so the auth gate can redirect.
            const isInternal = Boolean(survey.embed_url) || survey.visibility === 'group';
            const href = isInternal
              ? `/${lang}/surveys/${survey.slug}`
              : survey.links[0]?.url || '#';
            const thumb = survey.cover_image?.replace('-cover.webp', '-thumb.webp');
            return (
              <CompactCard
                key={survey.slug}
                href={href}
                image={thumb || survey.cover_image}
                title={survey.title[l] || survey.title.en}
                description={survey.description[l] || survey.description.en}
                number={`S${survey.survey_number}`}
                date={new Date(survey.updated_at || survey.published_at).toISOString().slice(0, 10)}
                tags={survey.tech_stack.slice(0, 3)}
                external={!isInternal}
              />
            );
          })}
        </LatestSection>
      )}

      {/* Latest Projects */}
      {projects.length > 0 && (
        <LatestSection
          title={dict.home.latest_projects}
          viewAllHref={`/${lang}/projects`}
          viewAllText={dict.home.view_all}
          showMoreText={dict.home.show_more}
          emptyText={dict.home.no_posts_yet}
        >
          {projects.map((project) => {
            const primaryLink = project.links[0]?.url;
            const href = project.embed_url
              ? `/${lang}/projects/${project.slug}`
              : primaryLink || '#';
            const thumb = project.cover_image?.replace('-cover.webp', '-thumb.webp');
            return (
              <CompactCard
                key={project.slug}
                href={href}
                image={thumb || project.cover_image}
                title={project.title[l] || project.title.en}
                description={project.description[l] || project.description.en}
                number={project.project_number != null ? `P${project.project_number}` : undefined}
                date={new Date(project.published_at).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'short' })}
                tags={project.tech_stack.slice(0, 3)}
                external={!project.embed_url}
              />
            );
          })}
        </LatestSection>
      )}
    </div>
  );
}
