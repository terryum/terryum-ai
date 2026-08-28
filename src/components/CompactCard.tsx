import BaseCard from './cards/BaseCard';
import LockBadge from './cards/LockBadge';
import type { Visibility } from '@/types/visibility';

interface CompactCardProps {
  href: string;
  image?: string;
  title: string;
  description: string;
  number?: string;
  date?: string;
  tags?: string[];
  external?: boolean;
  visibility?: Visibility;
  allowedGroups?: string[];
  locale?: string;
}

export default function CompactCard({
  href,
  image,
  title,
  description,
  number,
  date,
  tags,
  external,
  visibility,
  allowedGroups,
  locale,
}: CompactCardProps) {
  return (
    <BaseCard href={href} external={external} thumbnailSrc={image} thumbnailAlt={title}>
      {number && (
        <div className="text-xs text-text-muted">
          <span className="font-mono">{number}</span>
        </div>
      )}
      <h3 className="flex items-start gap-1.5 text-base font-[480] text-text-primary group-hover:text-accent transition-colors leading-snug mt-0.5">
        <span>{title}</span>
        <LockBadge
          visibility={visibility}
          allowedGroups={allowedGroups}
          locale={locale}
          className="inline-flex mt-1 text-accent/70 flex-shrink-0"
        />
      </h3>
      <p className="text-sm text-text-muted mt-1 line-clamp-2 sm:line-clamp-3">{description}</p>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {date && <time className="text-xs text-text-muted">{date}</time>}
        {tags?.map((tag) => (
          <span
            key={tag}
            className="text-[11px] px-2 py-0.5 rounded-full bg-bg-surface text-text-muted"
          >
            {tag}
          </span>
        ))}
      </div>
    </BaseCard>
  );
}
