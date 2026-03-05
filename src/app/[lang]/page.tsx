import { isValidLocale, type Locale } from '@/lib/i18n';
import { getDictionary } from '@/lib/dictionaries';
import { getPostsByType } from '@/lib/posts';
import { getBioContent, getBioPlainText } from '@/lib/about';
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

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) return null;

  const dict = await getDictionary(lang);
  const bioContent = await getBioContent(lang);
  const latestWriting = await getPostsByType(lang, 'writing');
  const latestEssays = await getPostsByType(lang, 'essay');
  const latestReading = await getPostsByType(lang, 'reading');

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
      {/* Hero + Bio */}
      <HeroSection name={dict.hero.name} bio={bioContent} />

      {/* Latest Ideas */}
      <LatestSection
        title={dict.home.latest_ideas}
        viewAllHref={`/${lang}/ideas`}
        viewAllText={dict.home.view_all}
        showMoreText={dict.home.show_more}
        posts={latestWriting}
        locale={lang}
      />

      {/* Latest Essays */}
      <LatestSection
        title={dict.home.latest_essays}
        viewAllHref={`/${lang}/essays`}
        viewAllText={dict.home.view_all}
        showMoreText={dict.home.show_more}
        posts={latestEssays}
        locale={lang}
      />

      {/* Latest Research */}
      <LatestSection
        title={dict.home.latest_research}
        viewAllHref={`/${lang}/research`}
        viewAllText={dict.home.view_all}
        showMoreText={dict.home.show_more}
        posts={latestReading}
        locale={lang}
      />
    </div>
  );
}
