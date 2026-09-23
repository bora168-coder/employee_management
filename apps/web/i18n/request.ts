import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, Locale } from './config';

/** Khmer by default; the user can switch to English (saved in a cookie). */
export default getRequestConfig(async () => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale: Locale = LOCALES.includes(value as Locale) ? (value as Locale) : DEFAULT_LOCALE;
  return { locale, messages: (await import(`../messages/${locale}.json`)).default };
});
