'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';
import { SITE_CONFIG } from '@/lib/site-config';
import type { Locale } from '@/lib/i18n';
import type { NavTabItem } from '@/lib/tabs';

interface NavItem {
  href: string;
  label: string;
  tabSlug?: string;
}

interface HeaderProps {
  locale: Locale;
  dict: {
    nav: { home: string; about: string };
  };
  navTabs: NavTabItem[];
}

function HeaderInner({ locale, dict, navTabs }: HeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentTab = searchParams.get('tab');

  const navItems: NavItem[] = [
    { href: `/${locale}`, label: dict.nav.home },
    ...navTabs.map(tab => ({ href: tab.href, label: tab.label, tabSlug: tab.tabSlug })),
    { href: `/${locale}/about`, label: dict.nav.about },
  ];

  function isActive(item: NavItem) {
    if (item.href === `/${locale}`) return pathname === `/${locale}`;
    if (item.tabSlug) {
      return pathname.startsWith(`/${locale}/posts`) && currentTab === item.tabSlug;
    }
    return pathname.startsWith(item.href);
  }

  return (
    <header className="border-b border-line-default">
      <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo / Site name */}
          <Link href={`/${locale}`} className="flex items-center gap-2 text-lg font-semibold text-text-secondary tracking-tight">
            <Image
              src="/images/logo-transparent-256.webp"
              alt={SITE_CONFIG.name}
              width={32}
              height={32}
              sizes="32px"
              priority
            />
            {SITE_CONFIG.name}
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.tabSlug || item.href}
                href={item.href}
                className={`text-sm transition-colors ${
                  isActive(item)
                    ? 'text-accent border-b-2 border-accent pb-[1px]'
                    : 'text-text-secondary hover:text-accent'
                }`}
                aria-current={isActive(item) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageSwitcher locale={locale} />
            </div>
          </nav>

          {/* Mobile: icon buttons + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <LanguageSwitcher locale={locale} />
            <button
              className="p-2 text-text-secondary"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile nav panel */}
        {mobileOpen && (
          <nav className="md:hidden pb-4 border-t border-line-default pt-3 flex flex-col gap-3">
            {navItems.map((item) => (
              <Link
                key={item.tabSlug || item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`text-sm px-2 py-1 transition-colors ${
                  isActive(item)
                    ? 'text-accent font-medium'
                    : 'text-text-secondary hover:text-accent'
                }`}
                aria-current={isActive(item) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}

export default function Header(props: HeaderProps) {
  return (
    <Suspense fallback={
      <header className="border-b border-line-default">
        <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <span className="flex items-center gap-2 text-lg font-semibold text-text-secondary tracking-tight">
              <Image src="/images/logo-transparent-256.webp" alt={SITE_CONFIG.name} width={32} height={32} sizes="32px" priority />
              {SITE_CONFIG.name}
            </span>
          </div>
        </div>
      </header>
    }>
      <HeaderInner {...props} />
    </Suspense>
  );
}
