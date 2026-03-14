import { isValidLocale, type Locale } from '@/lib/i18n';
import { getDictionary } from '@/lib/dictionaries';
import { getAllPosts } from '@/lib/posts';
import { getBioContent, getBioPlainText } from '@/lib/about';
import { TAB_CONFIG } from '@/lib/site-config';
import { normalizeTagSlug } from '@/lib/tags';
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

  const dict = await getDictionary(lang);
  const bioContent = await getBioContent(lang);
  const allPosts = await getAllPosts(lang);

  const aiPosts = allPosts.filter(p => p.tags.some(tag => aiMatchTags.has(normalizeTagSlug(tag))));
  const terryPosts = allPosts.filter(p => p.tags.some(tag => terryMatchTags.has(normalizeTagSlug(tag))));

  const sections = [
    { title: dict.home.latest_from_terry, href: `/${lang}/posts`, posts: terryPosts },
    { title: dict.home.latest_from_ai,    href: `/${lang}/posts`, posts: aiPosts    },
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
    </div>
  );
}
