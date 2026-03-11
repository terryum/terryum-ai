'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { label: 'Stats', href: '/admin/stats' },
];

export default function AdminTabBar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-line-default bg-bg-primary overflow-x-auto">
      <div className="max-w-5xl mx-auto px-4 md:px-6 flex items-center h-10 gap-4">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`text-sm whitespace-nowrap transition-colors ${
                active
                  ? 'text-accent border-b-2 border-accent pb-[1px]'
                  : 'text-text-secondary hover:text-accent'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
