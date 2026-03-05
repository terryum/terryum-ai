import type { Locale } from '@/lib/i18n';
import type { Reference } from '@/types/post';
import SourceInfoBlock from './SourceInfoBlock';

export default function ReferenceCard({
  reference,
  locale,
}: {
  reference: Reference;
  locale?: Locale;
}) {
  return (
    <SourceInfoBlock
      sourceUrl={reference.arxiv_url}
      sourceTitle={reference.title}
      sourceAuthor={reference.author}
      sourceType="arXiv"
      sourceProjectUrl={reference.project_url}
      scholarUrl={reference.scholar_url}
      description={reference.description}
      postSlug={reference.post_slug}
      locale={locale}
    />
  );
}
