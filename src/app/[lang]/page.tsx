import { isValidLocale, type Locale } from '@/lib/i18n';
import { getDictionary } from '@/lib/dictionaries';
import { getAllPosts } from '@/lib/posts';
import { getBioContent, getBioPlainText } from '@/lib/about';
import { TAB_CONFIG } from '@/lib/site-config';
import { getPostsForTab } from '@/lib/tabs';
import HeroSection from '@/components/HeroSection';
import LatestSection from '@/components/LatestSection';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return [{ lang: 'ko' }, { lang: 'en' }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = lang as Locale;
  const dict = await getDictionary(locale);
  const bioText = await getBioPlainText(locale);
  return {
    title: `${dict.hero.name} | ${dict.hero.tagline}`,
    description: bioText,
  };
}

// Map tab slugs to dictionary keys for section titles
const TAB_DICT_KEY: Record<string, string> = {
  ideas: 'latest_ideas',
  essays: 'latest_essays',
  research: 'latest_research',
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) return null;

  const dict = await getDictionary(lang);
  const bioContent = await getBioContent(lang);
  const allPosts = await getAllPosts(lang);

  const sections = TAB_CONFIG
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(tab => ({
      title: dict.home[TAB_DICT_KEY[tab.slug] as keyof typeof dict.home] || tab.slug,
      href: `/${lang}/posts?tab=${tab.slug}`,
      posts: getPostsForTab(allPosts, tab.slug).slice(0, 5),
    }))
    .filter(s => s.posts.length > 0);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
      {/* Hero + Bio */}
      <HeroSection name={dict.hero.name} bio={bioContent} />

      {/* Dynamic sections from TAB_CONFIG */}
      {sections.map((section) => (
        <LatestSection
          key={section.href}
          title={section.title}
          viewAllHref={section.href}
          viewAllText={dict.home.view_all}
          showMoreText={dict.home.show_more}
          posts={section.posts}
          locale={lang}
        />
      ))}
    </div>
  );
}
