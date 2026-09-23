export const LOCALES = ['km', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'km';
export const LOCALE_COOKIE = 'NEXT_LOCALE';
