import { isValidLocale, type Locale } from '@/lib/i18n';
import { getDictionary } from '@/lib/dictionaries';
import { getAboutContent, getAboutMedia, getBioContent, getBioPlainText } from '@/lib/about';
import ProfileImage from '@/components/ProfileImage';
import SocialIcons from '@/components/SocialIcons';
import AroundTheWeb from '@/components/about/AroundTheWeb';
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
    title: dict.about.title,
    description: bioText,
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) return null;

  const dict = await getDictionary(lang);
  const [bioContent, aboutContent, media] = await Promise.all([
    getBioContent(lang),
    getAboutContent(lang),
    getAboutMedia(lang),
  ]);

  const aboutLabels = dict.about as Record<string, string>;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8 py-10">
      {/* Profile section */}
      <div className="flex flex-col items-center text-center mb-10">
        <ProfileImage alt={dict.hero.name} size={144} className="mb-4" />
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          {dict.hero.name}
        </h1>
        <div className="text-sm text-text-muted leading-relaxed mt-1 prose prose-sm prose-neutral dark:prose-invert max-w-none">
          {bioContent}
        </div>
        <SocialIcons className="mt-3" />
      </div>

      {/* Detailed bio from MDX — kept plain on purpose */}
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        {aboutContent}
      </div>

      {/* Currently — one-liner about active focus */}
      {media.currently && (
        <section className="mt-10 pt-8 border-t border-line-default">
          <h2 className="text-base font-[540] text-text-primary tracking-tight mb-2">
            {aboutLabels.currently || 'Currently'}
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">{media.currently}</p>
        </section>
      )}

      {/* Around the web — curated external mentions, modest tone */}
      <AroundTheWeb
        labels={{
          around_the_web: aboutLabels.around_the_web || 'Around the web',
          talks: aboutLabels.talks || 'Talks & interviews',
          writing: aboutLabels.writing || 'In writing',
          books: aboutLabels.books || 'Books & writing',
          code: aboutLabels.code || 'Code',
        }}
        talks={media.talks}
        writing={media.writing}
        books={media.books}
        code={media.code}
      />
    </div>
  );
}
