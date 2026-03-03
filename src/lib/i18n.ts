export const LOCALES = ['ko', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export function isValidLocale(lang: string): lang is Locale {
  return LOCALES.includes(lang as Locale);
}

export function getAlternateLocale(locale: Locale): Locale {
  return locale === 'ko' ? 'en' : 'ko';
}
