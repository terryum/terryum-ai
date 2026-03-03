import Image from 'next/image';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { getDictionary } from '@/lib/dictionaries';
import SocialIcons from '@/components/SocialIcons';
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
    title: dict.about.title,
    description: dict.hero.bio_short,
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

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 lg:px-8 py-10">
      {/* Profile section */}
      <div className="flex flex-col items-center text-center mb-10">
        <div className="w-32 h-32 relative rounded-full overflow-hidden bg-gray-100 mb-4">
          <Image
            src="/images/profile-placeholder.svg"
            alt={dict.hero.name}
            fill
            className="object-cover"
            priority
          />
        </div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          {dict.hero.name}
        </h1>
        <p className="text-text-secondary mt-1">{dict.hero.tagline}</p>
      </div>

      {/* Short bio */}
      <p className="text-text-secondary leading-relaxed mb-10">
        {dict.hero.bio_short}
      </p>

      {/* Detailed bio sections */}
      <div className="space-y-8">
        {dict.about.bio_detailed.map(
          (section: { heading: string; content: string }, i: number) => (
            <section key={i}>
              <h2 className="text-lg font-semibold text-text-primary tracking-tight mb-2">
                {section.heading}
              </h2>
              <p className="text-text-secondary leading-relaxed">
                {section.content}
              </p>
            </section>
          )
        )}
      </div>

      {/* Contact */}
      <div className="mt-12 pt-8 border-t border-line-default">
        <h2 className="text-lg font-semibold text-text-primary tracking-tight mb-4">
          {dict.about.contact_label}
        </h2>
        <SocialIcons />
      </div>
    </div>
  );
}
