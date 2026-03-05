import { isValidLocale, type Locale } from '@/lib/i18n';
import { getDictionary } from '@/lib/dictionaries';
import { getAboutContent, getBioPlainText } from '@/lib/about';
import SocialIcons from '@/components/SocialIcons';
import ProfileImage from '@/components/ProfileImage';
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
  const aboutContent = await getAboutContent(lang);

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8 py-10">
      {/* Profile section */}
      <div className="flex flex-col items-center text-center mb-10">
        <ProfileImage alt={dict.hero.name} size={128} className="mb-4" />
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          {dict.hero.name}
        </h1>
        <p className="text-text-secondary mt-1">{dict.hero.tagline}</p>
      </div>

      {/* Detailed bio from MDX */}
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        {aboutContent}
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
