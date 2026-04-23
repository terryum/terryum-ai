interface ThreadSourceLineProps {
  sourceUrl: string;
  prefix: string;
  linkLabel: string;
  className?: string;
}

export default function ThreadSourceLine({
  sourceUrl,
  prefix,
  linkLabel,
  className,
}: ThreadSourceLineProps) {
  return (
    <p className={`text-sm text-text-muted ${className ?? 'mb-6'}`}>
      {prefix}
      {' — '}
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-accent transition-colors"
      >
        {linkLabel}
      </a>
    </p>
  );
}
