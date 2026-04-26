import Image from 'next/image';
import type { KoSectionMedia, LocalizedMediaItem } from '@/lib/about';

interface SectionLabels {
  around_the_web_ko: string;
  around_the_web_en: string;
  talks: string;
  interviews: string;
  books: string;
  code: string;
}

interface AroundTheWebProps {
  labels: SectionLabels;
  koSection: KoSectionMedia;
  enSection: LocalizedMediaItem[];
}

function MetaLine({ source, year }: { source?: string; year?: string }) {
  if (!source && !year) return null;
  return (
    <span className="text-text-muted ml-2 text-xs">
      {[source, year].filter(Boolean).join(' · ')}
    </span>
  );
}

function MediaList({
  heading,
  items,
}: {
  heading?: string;
  items: LocalizedMediaItem[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-5">
      {heading && (
        <h3 className="text-xs uppercase tracking-wide text-text-muted mb-2">{heading}</h3>
      )}
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={`${item.url}-${i}`} className="text-sm">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-primary hover:text-accent transition-colors"
            >
              {item.title}
            </a>
            <MetaLine source={item.source} year={item.year} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function BooksGallery({ heading, items }: { heading: string; items: LocalizedMediaItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-5">
      <h3 className="text-xs uppercase tracking-wide text-text-muted mb-3">{heading}</h3>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-3 gap-y-4">
        {items.map((item, i) => {
          const isExternal = item.url.startsWith('http');
          return (
            <a
              key={`${item.url}-${i}`}
              href={item.url}
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noopener noreferrer' : undefined}
              className="group block"
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-bg-surface border border-line-default">
                {item.thumbnail_url ? (
                  <Image
                    src={item.thumbnail_url}
                    alt={item.title}
                    fill
                    sizes="(min-width: 768px) 20vw, 40vw"
                    className="object-cover transition-transform group-hover:scale-[1.02]"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-text-muted">
                    {item.title}
                  </div>
                )}
              </div>
              <div className="mt-2 text-xs text-text-primary leading-snug group-hover:text-accent transition-colors">
                {item.title}
              </div>
              {(item.source || item.year) && (
                <div className="mt-0.5 text-[11px] text-text-muted">
                  {[item.source, item.year].filter(Boolean).join(' · ')}
                </div>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}

export default function AroundTheWeb({ labels, koSection, enSection }: AroundTheWebProps) {
  const koHasAny =
    koSection.talks.length +
      koSection.interviews.length +
      koSection.books.length +
      koSection.code.length >
    0;
  const enHasAny = enSection.length > 0;
  if (!koHasAny && !enHasAny) return null;

  return (
    <>
      {koHasAny && (
        <section className="mt-10 pt-8 border-t border-line-default">
          <h2 className="text-base font-[540] text-text-primary tracking-tight mb-5">
            {labels.around_the_web_ko}
          </h2>
          <MediaList heading={labels.talks} items={koSection.talks} />
          <MediaList heading={labels.interviews} items={koSection.interviews} />
          <BooksGallery heading={labels.books} items={koSection.books} />
          <MediaList heading={labels.code} items={koSection.code} />
        </section>
      )}

      {enHasAny && (
        <section className="mt-10 pt-8 border-t border-line-default">
          <h2 className="text-base font-[540] text-text-primary tracking-tight mb-5">
            {labels.around_the_web_en}
          </h2>
          <MediaList items={enSection} />
        </section>
      )}
    </>
  );
}
