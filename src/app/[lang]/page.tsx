import { isValidLocale, type Locale } from '@/lib/i18n';
import { getDictionary } from '@/lib/dictionaries';
import { getLatestPosts } from '@/lib/posts';
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
  const dict = await getDictionary(lang as Locale);
  return {
    title: `${dict.hero.name} | ${dict.hero.tagline}`,
    description: dict.hero.bio_short,
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
  const latestWriting = await getLatestPosts(lang, 'writing', 3);
  const latestReading = await getLatestPosts(lang, 'reading', 3);

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8">
      {/* Hero */}
      <HeroSection name={dict.hero.name} tagline={dict.hero.tagline} />

      {/* Short bio */}
      <p className="text-text-secondary leading-relaxed pb-4 border-b border-line-default">
        {dict.hero.bio_short}
      </p>

      {/* Latest Ideas */}
      <LatestSection
        title={dict.home.latest_write}
        viewAllHref={`/${lang}/write`}
        viewAllText={dict.home.view_all}
        posts={latestWriting}
        locale={lang}
      />

      {/* Latest Research */}
      <LatestSection
        title={dict.home.latest_read}
        viewAllHref={`/${lang}/read`}
        viewAllText={dict.home.view_all}
        posts={latestReading}
        locale={lang}
      />
    </div>
  );
}
