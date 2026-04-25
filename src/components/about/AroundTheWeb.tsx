import type { LocalizedMediaItem } from '@/lib/about';

interface SectionLabels {
  around_the_web: string;
  talks: string;
  writing: string;
  books: string;
  code: string;
}

interface AroundTheWebProps {
  labels: SectionLabels;
  talks: LocalizedMediaItem[];
  writing: LocalizedMediaItem[];
  books: LocalizedMediaItem[];
  code: LocalizedMediaItem[];
}

function MediaList({ heading, items }: { heading: string; items: LocalizedMediaItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-5">
      <h3 className="text-xs uppercase tracking-wide text-text-muted mb-2">{heading}</h3>
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
            {(item.source || item.year) && (
              <span className="text-text-muted ml-2 text-xs">
                {[item.source, item.year].filter(Boolean).join(' · ')}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AroundTheWeb({ labels, talks, writing, books, code }: AroundTheWebProps) {
  const hasAny = talks.length + writing.length + books.length + code.length > 0;
  if (!hasAny) return null;
  return (
    <section className="mt-10 pt-8 border-t border-line-default">
      <h2 className="text-base font-[540] text-text-primary tracking-tight mb-5">
        {labels.around_the_web}
      </h2>
      <MediaList heading={labels.talks} items={talks} />
      <MediaList heading={labels.writing} items={writing} />
      <MediaList heading={labels.books} items={books} />
      <MediaList heading={labels.code} items={code} />
    </section>
  );
}
