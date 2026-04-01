/**
 * GA4 custom event tracking utility.
 * Safe to call on server (no-ops) or when GA is not configured.
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>,
) {
  if (typeof window === 'undefined') return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (!gtag) return;
  gtag('event', eventName, params);
}
