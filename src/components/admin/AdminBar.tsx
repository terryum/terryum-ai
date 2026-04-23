'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Container } from '@/components/ui/Container';

const TABS = (locale: string) => [
  { label: 'Stats', href: `/${locale}/admin/stats` },
  { label: 'Graph', href: `/${locale}/admin/graph` },
];

export default function AdminBar({ locale }: { locale: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch('/api/session')
      .then((res) => res.json())
      .then((data) => setIsAdmin(data.sessionLabel === 'Admin'))
      .catch(() => setIsAdmin(false));
  }, []);

  if (!isAdmin) return null;

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push(`/${locale}`);
    router.refresh();
  }

  return (
    <nav className="border-b border-line-default bg-bg-primary overflow-x-auto">
      <Container className="flex items-center justify-end gap-4 h-10">
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
      </Container>
    </nav>
  );
}
