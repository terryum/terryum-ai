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
}

interface HeaderProps {
  locale: Locale;
  dict: {
    nav: { home: string; about: string; surveys: string };
  };
  navTabs: NavTabItem[];
}

function SettingsDropdown({ locale, sessionLabel }: { locale: Locale; sessionLabel: string | null }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = sessionLabel === 'Admin';

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

  const searchParams = useSearchParams();

  function switchLanguage() {
    const altLocale = locale === 'ko' ? 'en' : 'ko';
    localStorage.setItem('preferred-lang', altLocale);
    document.cookie = `preferred-lang=${altLocale};path=/;max-age=${60 * 60 * 24 * 365}`;
    const newPath = pathname.replace(`/${locale}`, `/${altLocale}`);
    const qs = searchParams.toString();
    router.push(qs ? `${newPath}?${qs}` : newPath);
    setOpen(false);
  }

  async function handleLogout() {
    setLoading(true);
    await Promise.all([
      fetch('/api/co/logout', { method: 'POST' }),
      fetch('/api/auth/logout', { method: 'POST' }),
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
        <div className="absolute right-0 top-full mt-2 w-40 rounded-lg border border-line-default bg-bg-surface shadow-lg backdrop-blur-sm z-50 py-1">
          {/* Admin links */}
          {isAdmin && (
            <>
              <Link
                href={`/${locale}/admin/stats`}
                onClick={() => setOpen(false)}
                className={menuItemClass}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 17V9m5 8V5m5 12v-6M4 21h16" />
                </svg>
                Stats
              </Link>
              <Link
                href={`/${locale}/admin/graph`}
                onClick={() => setOpen(false)}
                className={menuItemClass}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="6" cy="6" r="2" />
                  <circle cx="18" cy="6" r="2" />
                  <circle cx="12" cy="18" r="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5l3 9m3 0l3-9m-10 0h10" />
                </svg>
                Graph
              </Link>
              <div className="h-px bg-line-default my-1" />
            </>
          )}

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

function HeaderInner({ locale, dict, navTabs }: HeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sessionLabel, setSessionLabel] = useState<string | null>(null);
  const currentTab = searchParams.get('tab');

  useEffect(() => {
    fetch('/api/session')
      .then(r => r.json())
      .then(d => setSessionLabel(d.sessionLabel))
      .catch(() => {});
  }, []);

  // Header order: Essays · Surveys · Papers · Notes  ·  About
  // Surveys is a top-level route, the others are tabs of /posts.
  const tabBySlug = new Map(navTabs.map(t => [t.tabSlug, t]));
  const essaysTab = tabBySlug.get('essays');
  const papersTab = tabBySlug.get('papers');
  const notesTab = tabBySlug.get('notes');

  const surveysItem: NavItem = { href: `/${locale}/surveys`, label: dict.nav.surveys };
  const aboutItem: NavItem = { href: `/${locale}/about`, label: dict.nav.about };

  const primaryItems: NavItem[] = [
    essaysTab && { href: essaysTab.href, label: essaysTab.label, tabSlug: essaysTab.tabSlug },
    surveysItem,
    papersTab && { href: papersTab.href, label: papersTab.label, tabSlug: papersTab.tabSlug },
    notesTab && { href: notesTab.href, label: notesTab.label, tabSlug: notesTab.tabSlug },
  ].filter((x): x is NavItem => Boolean(x));

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
            <div className="flex items-center gap-4">
              {primaryItems.map(item => <TabLink key={item.tabSlug || item.href} item={item} />)}
              <div className="w-px h-3 bg-line-default opacity-60" />
              <TabLink item={aboutItem} />
            </div>

            <div className="flex items-center gap-2 ml-4">
              <LanguageSwitcher locale={locale} />
              <SettingsDropdown locale={locale} sessionLabel={sessionLabel} />
            </div>
          </nav>

          {/* Mobile: icon buttons + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <LanguageSwitcher locale={locale} />
            <SettingsDropdown locale={locale} sessionLabel={sessionLabel} />
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
            {primaryItems.map(item => <MobileTabLink key={item.tabSlug || item.href} item={item} />)}
            <div className="h-px bg-line-default my-2 mx-2 opacity-60" />
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
