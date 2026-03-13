'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const TABS = (locale: string) => [
  { label: 'Notes', href: `/${locale}/admin/notes` },
  { label: 'Post', href: `/${locale}/admin/post` },
  { label: 'Stats', href: `/${locale}/admin/stats` },
];

export default function AdminBar({ locale }: { locale: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push(`/${locale}`);
    router.refresh();
  }

  return (
    <nav className="border-b border-line-default bg-bg-primary overflow-x-auto">
      <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 flex items-center justify-end gap-4 h-10">
        {TABS(locale).map((tab) => {
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
        <span className="text-line-default">|</span>
        <button
          onClick={handleLogout}
          className="text-sm text-text-secondary hover:text-accent transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
