import { isValidLocale, type Locale } from '@/lib/i18n';
import { getDictionary } from '@/lib/dictionaries';
import { getAllPostsFromIndex } from '@/lib/posts';
import { loadPublicSurveys } from '@/lib/surveys';
import { getBioContent, getBioPlainText } from '@/lib/about';
import { getPostsForTab } from '@/lib/tabs';
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

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) return null;

  const [dict, bioContent, allPosts, surveys] = await Promise.all([
    getDictionary(lang),
    getBioContent(lang),
    getAllPostsFromIndex(lang),
    loadPublicSurveys(),
  ]);

  const l = lang as 'ko' | 'en';
  const essaysPosts = getPostsForTab(allPosts, 'essays');
  const papersPosts = getPostsForTab(allPosts, 'papers');
  const notesPosts = getPostsForTab(allPosts, 'notes');

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
      {/* Hero + Bio */}
      <HeroSection name={dict.hero.name} bio={bioContent} />

      {/* Featured Surveys — flagship */}
      {surveys.length > 0 && (
        <LatestSection
          title={dict.home.featured_surveys}
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
                date={`last updated: ${new Date(survey.updated_at || survey.published_at).toISOString().slice(0, 10)}`}
                tags={survey.tech_stack.slice(0, 3)}
                external={!isInternal}
              />
            );
          })}
        </LatestSection>
      )}

      {/* Latest Essays */}
      <LatestSection
        title={dict.home.latest_essays}
        viewAllHref={`/${lang}/posts?tab=essays`}
        viewAllText={dict.home.view_all}
        showMoreText={dict.home.show_more}
        posts={essaysPosts}
        locale={lang}
        emptyText={dict.home.no_posts_yet}
        showTabTag={false}
      />

      {/* Recent Papers — Surveys' raw material */}
      <LatestSection
        title={dict.home.recent_papers}
        viewAllHref={`/${lang}/posts?tab=papers`}
        viewAllText={dict.home.view_all}
        showMoreText={dict.home.show_more}
        posts={papersPosts}
        locale={lang}
        emptyText={dict.home.no_posts_yet}
        showTabTag={false}
      />

      {/* Latest Notes — Memos + Threads stream */}
      <LatestSection
        title={dict.home.latest_notes}
        viewAllHref={`/${lang}/posts?tab=notes`}
        viewAllText={dict.home.view_all}
        showMoreText={dict.home.show_more}
        posts={notesPosts}
        locale={lang}
        emptyText={dict.home.no_posts_yet}
        showTabTag={true}
      />
    </div>
  );
}
