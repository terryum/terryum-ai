'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, Suspense } from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import { Container } from './ui/Container';
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
    nav: { home: string; about: string; projects: string; surveys: string };
  };
  navTabs: NavTabItem[];
  sessionLabel?: string | null;
}

function SettingsDropdown({ sessionLabel, locale }: { sessionLabel?: string | null; locale: Locale }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    document.cookie = `theme=${next};path=/;max-age=${60 * 60 * 24 * 365}`;
    setOpen(false);
  }

  function switchLanguage() {
    const altLocale = locale === 'ko' ? 'en' : 'ko';
    localStorage.setItem('preferred-lang', altLocale);
    document.cookie = `preferred-lang=${altLocale};path=/;max-age=${60 * 60 * 24 * 365}`;
    router.push(pathname.replace(`/${locale}`, `/${altLocale}`));
    setOpen(false);
  }

  async function handleLogout() {
    setLoading(true);
    await Promise.all([
      fetch('/api/co/logout', { method: 'POST' }),
      fetch('/api/admin/logout', { method: 'POST' }),
    ]);
    window.location.href = `/${locale}`;
  }

  const menuItemClass = 'w-full px-3 py-2.5 text-xs text-text-secondary hover:bg-bg-surface flex items-center gap-2.5 transition-colors text-left';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full border border-line-default flex items-center justify-center text-text-muted hover:text-accent transition-colors"
        aria-label="Settings"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 rounded-lg border border-line-default bg-bg-primary shadow-lg z-50 py-1">
          {/* Theme */}
          <button onClick={toggleTheme} className={menuItemClass}>
            <svg className="w-3.5 h-3.5 theme-icon-moon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0112.478 3.68a9.75 9.75 0 109.274 11.322z" />
            </svg>
            <svg className="w-3.5 h-3.5 theme-icon-sun" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="4" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2m-8-10H2m20 0h-2m-2.05-6.95l-1.41 1.41m-9.19 9.19l-1.41 1.41m0-12.02l1.41 1.41m9.19 9.19l1.41 1.41" />
            </svg>
            <span className="theme-icon-moon">Dark mode</span>
            <span className="theme-icon-sun">Light mode</span>
          </button>

          {/* Language */}
          <button onClick={switchLanguage} className={menuItemClass}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a15 15 0 014 9 15 15 0 01-4 9 15 15 0 01-4-9 15 15 0 014-9z" />
            </svg>
            {locale === 'ko' ? 'English' : '한국어'}
          </button>

          <div className="h-px bg-line-default my-1" />

          {/* Login / Logout */}
          {sessionLabel ? (
            <button onClick={handleLogout} disabled={loading} className={menuItemClass}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1" />
              </svg>
              <span className="flex-1">{loading ? 'Logging out...' : 'Logout'}</span>
              <span className="px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium text-[10px]">{sessionLabel}</span>
            </button>
          ) : (
            <Link
              href={`/login?redirect=${encodeURIComponent(pathname)}`}
              onClick={() => setOpen(false)}
              className={menuItemClass}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1" />
              </svg>
              Login
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function HeaderInner({ locale, dict, navTabs, sessionLabel }: HeaderProps) {
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

  const surveysItem: NavItem = { href: `/${locale}/surveys`, label: dict.nav.surveys };
  const projectsItem: NavItem = { href: `/${locale}/projects`, label: dict.nav.projects };
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
      <Container>
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
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium leading-none nav-tag-ai">AI</span>
            <div className="flex items-center gap-4 ml-1">
              {aiTabs.map(item => <TabLink key={item.tabSlug || item.href} item={item} />)}
              <TabLink item={surveysItem} />
              <TabLink item={projectsItem} />
            </div>

            {/* Separator */}
            <div className="w-px h-4 bg-line-default mx-2" />

            {/* Terry group */}
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium leading-none nav-tag-terry">Terry</span>
            <div className="flex items-center gap-4 ml-1">
              {terryTabs.map(item => <TabLink key={item.tabSlug || item.href} item={item} />)}
              <TabLink item={aboutItem} />
            </div>

            <div className="flex items-center gap-2 ml-4">
              <LanguageSwitcher locale={locale} />
              <SettingsDropdown sessionLabel={sessionLabel} locale={locale} />
            </div>
          </nav>

          {/* Mobile: icon buttons + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <LanguageSwitcher locale={locale} />
            <SettingsDropdown sessionLabel={sessionLabel} locale={locale} />
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
            <span className="mx-2 mt-0.5 mb-1 inline-block text-[10px] px-1.5 py-0.5 rounded font-medium leading-none nav-tag-ai">AI</span>
            {aiTabs.map(item => <MobileTabLink key={item.tabSlug || item.href} item={item} />)}
            <MobileTabLink item={surveysItem} />
            <MobileTabLink item={projectsItem} />

            {/* Separator */}
            <div className="h-px bg-line-default my-2 mx-2" />

            {/* Terry group */}
            <span className="mx-2 mt-0.5 mb-1 inline-block text-[10px] px-1.5 py-0.5 rounded font-medium leading-none nav-tag-terry">Terry</span>
            {terryTabs.map(item => <MobileTabLink key={item.tabSlug || item.href} item={item} />)}
            <MobileTabLink item={aboutItem} />
          </nav>
        )}
      </Container>
    </header>
  );
}

export default function Header(props: HeaderProps) {
  return (
    <Suspense fallback={
      <header className="border-b border-line-default">
        <Container>
          <div className="flex items-center justify-between h-14">
            <span className="flex items-center gap-2 text-sm text-text-secondary">
              <Image src="/images/logo-transparent-256.webp" alt={SITE_CONFIG.name} width={20} height={20} sizes="20px" priority />
              {SITE_CONFIG.name}
            </span>
          </div>
        </Container>
      </header>
    }>
      <HeaderInner {...props} />
    </Suspense>
  );
}
