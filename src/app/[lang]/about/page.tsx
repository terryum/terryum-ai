import { isValidLocale, type Locale } from '@/lib/i18n';
import { getDictionary } from '@/lib/dictionaries';
import { getAboutContent, getAboutMedia, getBioContent, getBioPlainText } from '@/lib/about';
import ProfileImage from '@/components/ProfileImage';
import SocialIcons from '@/components/SocialIcons';
import AroundTheWeb from '@/components/about/AroundTheWeb';
import ContactEmail from '@/components/about/ContactEmail';
import AboutLocalNav from '@/components/about/AboutLocalNav';
import Link from 'next/link';
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

      <AboutLocalNav
        locale={lang}
        active="profile"
        labels={{
          profile: aboutLabels.profile_nav,
          mission: aboutLabels.mission_nav,
        }}
      />

      {/* Detailed bio from MDX — kept plain on purpose */}
      <div className="prose prose-neutral dark:prose-invert max-w-none mt-8">
        {aboutContent}
      </div>

      <Link
        href={`/${lang}/about/mission`}
        className="group mt-10 block rounded-sm border border-line-default bg-bg-surface p-5 transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
      >
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
          {aboutLabels.mission_cta_eyebrow}
        </span>
        <span className="mt-2 block text-lg font-[540] leading-snug text-text-primary">
          {aboutLabels.mission_cta_title}
        </span>
        <span className="mt-2 block text-sm leading-relaxed text-text-secondary">
          {aboutLabels.mission_cta_description}
        </span>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-text-primary transition-colors group-hover:text-accent">
          {aboutLabels.mission_cta_link}
          <span aria-hidden="true">→</span>
        </span>
      </Link>

      {/* Currently — one-liner about active focus */}
      {media.currently && (
        <section className="mt-10 pt-8 border-t border-line-default">
          <h2 className="text-base font-[540] text-text-primary tracking-tight mb-2">
            {aboutLabels.currently || 'Currently'}
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">{media.currently}</p>
        </section>
      )}

      {/* Around the web — split by content language; Korean keeps categories,
          English collapses into a single flat list since it's sparse. */}
      <AroundTheWeb
        labels={{
          around_the_web_ko: aboutLabels.around_the_web_ko || 'Featured Elsewhere (Korean)',
          around_the_web_en: aboutLabels.around_the_web_en || 'Featured Elsewhere (English)',
          media: aboutLabels.media || 'Media',
          talks: aboutLabels.talks || 'On YouTube',
          interviews: aboutLabels.interviews || 'In Press',
          speaking: aboutLabels.speaking || 'Speaking',
          books: aboutLabels.books || 'Books & Writings',
          etc: aboutLabels.etc || 'Etc.',
          research: aboutLabels.research || 'Research',
          code: aboutLabels.code || 'Code',
        }}
        koSection={media.koSection}
        enSection={media.enSection}
      />

      {/* Contact — email obfuscated until JS hydrates */}
      <section className="mt-10 pt-8 border-t border-line-default">
        <h2 className="text-base font-[540] text-text-primary tracking-tight mb-2">
          {aboutLabels.contact || 'Contact'}
        </h2>
        <div className="flex flex-col gap-1">
          <ContactEmail localPart="terry" domain="cosmax.com" fallbackLabel="Cosmax" />
          <ContactEmail localPart="terry" domain="artlab.ai"  fallbackLabel="ArtLab" />
        </div>
      </section>
    </div>
  );
}
