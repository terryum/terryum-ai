import Link from 'next/link';
import type { Locale } from '@/lib/i18n';

type AboutLocalNavProps = {
  locale: Locale;
  active: 'profile' | 'mission';
  labels: {
    profile: string;
    mission: string;
  };
};

export default function AboutLocalNav({ locale, active, labels }: AboutLocalNavProps) {
  const items = [
    { key: 'profile' as const, href: `/${locale}/about`, label: labels.profile },
    { key: 'mission' as const, href: `/${locale}/about/mission`, label: labels.mission },
  ];

  return (
    <nav aria-label="About navigation" className="flex items-center gap-5 border-b border-line-default">
      {items.map((item) => {
        const isActive = active === item.key;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={`-mb-px border-b-2 pb-2 text-sm transition-colors focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base ${
              isActive
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-accent'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
