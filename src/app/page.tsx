import { redirect } from 'next/navigation';
import { DEFAULT_LOCALE } from '@/lib/i18n';

// Middleware handles locale detection and redirect for `/`.
// This page is a static fallback in case middleware is bypassed.
export default function RootPage() {
  redirect(`/${DEFAULT_LOCALE}`);
}
