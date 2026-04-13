import { isValidLocale, type Locale } from '@/lib/i18n';
import { getDictionary } from '@/lib/dictionaries';
import { loadPublicSurveys } from '@/lib/surveys';
import { Container } from '@/components/ui/Container';
import SurveyCard from '@/components/SurveyCard';
import type { Metadata } from 'next';

export const revalidate = 60;

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
    title: dict.surveys.title,
    description: dict.surveys.description,
  };
}

export default async function SurveysPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) return null;

  const dict = await getDictionary(lang);
  const surveys = await loadPublicSurveys();

  return (
    <Container className="py-10">
      <h1 className="text-2xl font-bold text-text-primary tracking-tight">
        {dict.surveys.title}
      </h1>
      <p className="text-sm text-text-muted mt-2 mb-8">
        {dict.surveys.description}
      </p>

      {surveys.length === 0 ? (
        <p className="text-text-muted py-8 text-center">
          {dict.surveys.empty}
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {surveys.map((survey) => (
            <SurveyCard key={survey.slug} survey={survey} locale={lang} />
          ))}
        </div>
      )}
    </Container>
  );
}
