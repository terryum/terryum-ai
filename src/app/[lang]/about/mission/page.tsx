import Link from 'next/link';
import type { Metadata } from 'next';
import { getDictionary } from '@/lib/dictionaries';
import { getBioContent, getMissionContent } from '@/lib/about';
import { isValidLocale, type Locale } from '@/lib/i18n';
import AboutLocalNav from '@/components/about/AboutLocalNav';
import AboutProfileHeader from '@/components/about/AboutProfileHeader';

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
  const labels = dict.mission_page;
  const path = `/${locale}/about/mission`;

  return {
    title: labels.meta_title,
    description: labels.meta_description,
    alternates: {
      canonical: path,
      languages: {
        ko: '/ko/about/mission',
        en: '/en/about/mission',
      },
    },
    openGraph: {
      title: labels.meta_title,
      description: labels.meta_description,
      url: path,
    },
  };
}

export default async function MissionPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) return null;

  const [dict, bioContent, missionContent] = await Promise.all([
    getDictionary(lang),
    getBioContent(lang),
    getMissionContent(lang),
  ]);
  const labels = dict.mission_page;
  const summaries = [
    {
      label: labels.purpose_label,
      title: labels.purpose_title,
      body: labels.purpose_body,
    },
    {
      label: labels.vision_label,
      title: labels.vision_title,
      body: labels.vision_body,
    },
    {
      label: labels.mission_label,
      title: labels.mission_title,
      body: labels.mission_body,
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 lg:px-8">
      <AboutProfileHeader name={dict.hero.name} bio={bioContent} />

      <AboutLocalNav
        locale={lang}
        active="mission"
        labels={{
          profile: dict.about.profile_nav,
          mission: dict.about.mission_nav,
        }}
      />

      <header className="border-b border-line-default pb-10 pt-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
          {labels.eyebrow}
        </p>
        <h1 className="mt-3 max-w-2xl text-[26px] font-semibold leading-tight tracking-tight text-text-primary md:text-3xl">
          {labels.title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-secondary">
          {labels.lead}
        </p>
        <p className="mt-3 text-sm text-text-muted">{labels.descriptor}</p>
      </header>

      <section aria-label="Purpose, vision, and mission" className="mt-10 grid border-y border-line-default md:grid-cols-3">
        {summaries.map((item, index) => (
          <div
            key={item.label}
            className={`py-6 ${
              index === 0
                ? 'md:pr-6'
                : 'border-t border-line-default md:border-l md:border-t-0 md:px-6'
            } ${index === summaries.length - 1 ? 'md:pr-0' : ''}`}
          >
            <p className="text-[11px] font-medium tracking-[0.14em] text-accent">{item.label}</p>
            <h2 className="mt-2 text-base font-[540] leading-snug text-text-primary">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">{item.body}</p>
          </div>
        ))}
      </section>

      <article className="prose prose-neutral dark:prose-invert mt-12 max-w-none prose-headings:tracking-tight prose-h2:mt-16 prose-h2:border-t prose-h2:border-line-default prose-h2:pt-8 prose-h3:mt-8 prose-blockquote:not-italic prose-ol:pl-6">
        {missionContent}
      </article>

      <div className="mt-12 border-t border-line-default pt-8">
        <Link
          href={`/${lang}/about`}
          className="text-sm text-text-primary underline decoration-line-strong underline-offset-4 transition-colors hover:text-accent focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
        >
          {lang === 'ko' ? '← About Terry로 돌아가기' : '← Back to About Terry'}
        </Link>
      </div>
    </div>
  );
}
