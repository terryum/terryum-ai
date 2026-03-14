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
  author?: 'terry' | 'ai';
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

  const aiTabs: NavItem[] = navTabs
    .filter(tab => tab.author === 'ai')
    .map(tab => ({ href: tab.href, label: tab.label, tabSlug: tab.tabSlug, author: tab.author }));

  const terryTabs: NavItem[] = navTabs
    .filter(tab => tab.author === 'terry')
    .map(tab => ({ href: tab.href, label: tab.label, tabSlug: tab.tabSlug, author: tab.author }));

  const aboutItem: NavItem = { href: `/${locale}/about`, label: dict.nav.about };

  function isActive(item: NavItem) {
    if (item.tabSlug) {
      return pathname.startsWith(`/${locale}/posts`) && currentTab === item.tabSlug;
    }
    return pathname.startsWith(item.href);
  }

  function TabLink({ item }: { item: NavItem }) {
    return (
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
    );
  }

  function MobileTabLink({ item }: { item: NavItem }) {
    return (
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
    );
  }

  return (
    <header className="border-b border-line-default">
      <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo / Site name */}
          <Link href={`/${locale}`} className="flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-accent">
            <Image
              src="/images/logo-transparent-256.webp"
              alt={SITE_CONFIG.name}
              width={20}
              height={20}
              sizes="20px"
              priority
            />
            {SITE_CONFIG.name}
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {/* AI group */}
            <span className="text-xs text-text-muted font-medium px-1.5">AI</span>
            <div className="flex items-center gap-4">
              {aiTabs.map(item => <TabLink key={item.tabSlug || item.href} item={item} />)}
            </div>

            {/* Separator */}
            <div className="w-px h-4 bg-line-default mx-2" />

            {/* Terry group */}
            <span className="text-xs text-text-muted font-medium px-1.5">Terry</span>
            <div className="flex items-center gap-4">
              {terryTabs.map(item => <TabLink key={item.tabSlug || item.href} item={item} />)}
              <TabLink item={aboutItem} />
            </div>

            <div className="flex items-center gap-2 ml-4">
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
          <nav className="md:hidden pb-4 border-t border-line-default pt-3 flex flex-col gap-1">
            {/* AI group */}
            <span className="text-xs text-text-muted font-medium px-2 pb-1 pt-0.5">AI</span>
            {aiTabs.map(item => <MobileTabLink key={item.tabSlug || item.href} item={item} />)}

            {/* Separator */}
            <div className="h-px bg-line-default my-2 mx-2" />

            {/* Terry group */}
            <span className="text-xs text-text-muted font-medium px-2 pb-1 pt-0.5">Terry</span>
            {terryTabs.map(item => <MobileTabLink key={item.tabSlug || item.href} item={item} />)}
            <MobileTabLink item={aboutItem} />
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
            <span className="flex items-center gap-2 text-sm text-text-secondary">
              <Image src="/images/logo-transparent-256.webp" alt={SITE_CONFIG.name} width={20} height={20} sizes="20px" priority />
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
