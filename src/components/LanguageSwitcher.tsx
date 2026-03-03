'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { Locale } from '@/lib/i18n';

export default function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const router = useRouter();

  const altLocale: Locale = locale === 'ko' ? 'en' : 'ko';
  const altLabel = altLocale === 'ko' ? 'KO' : 'EN';

  function handleSwitch() {
    // Save preference
    localStorage.setItem('preferred-lang', altLocale);
    document.cookie = `preferred-lang=${altLocale};path=/;max-age=${60 * 60 * 24 * 365}`;

    // Navigate to same path with new locale
    const newPath = pathname.replace(`/${locale}`, `/${altLocale}`);
    router.push(newPath);
  }

  return (
    <button
      onClick={handleSwitch}
      className="text-sm text-text-muted hover:text-accent transition-colors px-2 py-1"
      aria-label={`Switch to ${altLocale === 'ko' ? 'Korean' : 'English'}`}
    >
      {altLabel}
    </button>
  );
}
