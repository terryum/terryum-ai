import SourceBadge from './SourceBadge';

interface SourceInfoBlockProps {
  sourceUrl?: string;
  sourceTitle?: string;
  sourceAuthor?: string;
  sourceType?: string;
  labels: { source_label: string; author_label: string };
}

export default function SourceInfoBlock({
  sourceUrl,
  sourceTitle,
  sourceAuthor,
  sourceType,
  labels,
}: SourceInfoBlockProps) {
  if (!sourceUrl && !sourceTitle) return null;

  return (
    <div className="border border-line-default rounded-lg p-4 mb-8 text-sm">
      {sourceType && (
        <div className="mb-2">
          <SourceBadge sourceType={sourceType} />
        </div>
      )}
      {sourceTitle && (
        <p className="text-text-primary font-medium">
          {labels.source_label}:{' '}
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary hover:text-accent underline underline-offset-2 decoration-line-default hover:decoration-accent transition-colors"
            >
              {sourceTitle}
            </a>
          ) : (
            sourceTitle
          )}
        </p>
      )}
      {sourceAuthor && (
        <p className="text-text-muted mt-1">
          {labels.author_label}: {sourceAuthor}
        </p>
      )}
    </div>
  );
}
