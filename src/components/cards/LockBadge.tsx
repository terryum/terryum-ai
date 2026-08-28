import type { Visibility } from '@/types/visibility';

interface LockBadgeProps {
  visibility?: Visibility;
  allowedGroups?: string[];
  locale?: string;
  className?: string;
}

/**
 * Small inline lock for non-public content. Renders nothing when visibility
 * is public or omitted.
 */
export default function LockBadge({
  visibility,
  allowedGroups,
  locale,
  className = 'inline-flex text-text-muted',
}: LockBadgeProps) {
  if (!visibility || visibility === 'public') return null;

  const ko = locale === 'ko';
  // No locale → admin-style detail (shows allowed groups by name).
  // locale='ko' / 'en' → reader-facing simplified text.
  const groupTitle = !locale
    ? `Restricted: ${(allowedGroups ?? []).join(', ')}`
    : ko
      ? '그룹 회원 전용'
      : 'Group members only';
  const privateTitle = ko ? '비공개' : 'Private';
  const title = visibility === 'group' ? groupTitle : privateTitle;

  return (
    <span className={className} title={title} aria-label={title}>
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        className="h-3.5 w-3.5"
        aria-hidden="true"
      >
        <rect x="4.5" y="8.5" width="11" height="8" rx="1.75" />
        <path strokeLinecap="round" d="M7 8.5V6.75a3 3 0 0 1 6 0V8.5" />
      </svg>
    </span>
  );
}
