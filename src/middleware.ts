import { NextRequest, NextResponse } from 'next/server';

const LOCALES = ['ko', 'en'];
const DEFAULT_LOCALE = 'en';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip if path already has locale prefix
  const pathnameHasLocale = LOCALES.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );
  if (pathnameHasLocale) return;

  // Skip static files, API routes, and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/posts') ||
    pathname.startsWith('/images') ||
    pathname.includes('.')
  ) {
    return;
  }

  // Detect language
  const savedLang = request.cookies.get('preferred-lang')?.value;
  let locale = DEFAULT_LOCALE;

  if (savedLang && LOCALES.includes(savedLang)) {
    locale = savedLang;
  } else {
    const acceptLang = request.headers.get('accept-language') || '';
    if (acceptLang.toLowerCase().startsWith('ko')) {
      locale = 'ko';
    }
  }

  // Redirect to locale-prefixed path
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next|api|posts|images|favicon|sitemap|robots).*)'],
};
