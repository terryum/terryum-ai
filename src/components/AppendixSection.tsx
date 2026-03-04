import ReferenceCard from './ReferenceCard';
import ImageGallery from './ImageGallery';
import { categorizeReferences } from '@/lib/references';
import type { Reference } from '@/types/post';
import type { Locale } from '@/lib/i18n';

interface AppendixSectionProps {
  locale: Locale;
  figures: { src: string; caption: string; number: number }[];
  tables: { src: string; caption: string; number: number }[];
  references?: Reference[];
  terrys_memo?: string;
  labels: {
    references_label: string;
    references_foundational?: string;
    references_recent?: string;
    figures_gallery?: string;
    tables_gallery?: string;
    appendix_label?: string;
    terrys_memo_label?: string;
  };
}

export default function AppendixSection({
  locale,
  figures,
  tables,
  references,
  terrys_memo,
  labels,
}: AppendixSectionProps) {
  const hasFigures = figures.length > 0;
  const hasTables = tables.length > 0;
  const hasReferences = references && references.length > 0;
  const hasMemo = terrys_memo && terrys_memo.trim() !== '';

  const { foundational, recent, uncategorized, hasCategories } =
    categorizeReferences(references);

  if (!hasFigures && !hasTables && !hasReferences && !hasMemo) return null;

  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold text-text-primary mb-6 pb-2 border-b border-line-default">
        {labels.appendix_label || 'Appendix'}
      </h2>

      {/* Figures */}
      {hasFigures && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-text-primary mb-4">
            {labels.figures_gallery || 'Figures'}
          </h3>
          <ImageGallery items={figures} />
        </div>
      )}

      {/* Tables */}
      {hasTables && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-text-primary mb-4">
            {labels.tables_gallery || 'Tables'}
          </h3>
          <ImageGallery items={tables} />
        </div>
      )}

      {/* Key References */}
      {hasReferences && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-text-primary mb-4">
            {labels.references_label}
          </h3>

          {hasCategories ? (
            <>
              {foundational.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-base font-semibold text-text-muted mb-3">
                    {labels.references_foundational || 'Foundational References'}
                  </h4>
                  <div className="flex flex-col gap-3">
                    {foundational.map((ref) => (
                      <ReferenceCard key={ref.title} reference={ref} locale={locale} />
                    ))}
                  </div>
                </div>
              )}

              {recent.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-base font-semibold text-text-muted mb-3">
                    {labels.references_recent || 'Recent Work to Overcome'}
                  </h4>
                  <div className="flex flex-col gap-3">
                    {recent.map((ref) => (
                      <ReferenceCard key={ref.title} reference={ref} locale={locale} />
                    ))}
                  </div>
                </div>
              )}

              {uncategorized.length > 0 && (
                <div className="flex flex-col gap-3">
                  {uncategorized.map((ref) => (
                    <ReferenceCard key={ref.title} reference={ref} locale={locale} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-3">
              {references!.map((ref) => (
                <ReferenceCard key={ref.title} reference={ref} locale={locale} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Terry's memo */}
      {hasMemo && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-text-primary mb-4">
            {labels.terrys_memo_label || "Terry's memo"}
          </h3>
          <div className="text-sm text-text-secondary leading-relaxed bg-bg-surface/40 border border-line-default rounded-lg p-4">
            {terrys_memo}
          </div>
        </div>
      )}
    </section>
  );
}
