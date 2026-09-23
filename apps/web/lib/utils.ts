import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Converts API null values to "" so they fit in form inputs. */
export function blank<T>(v: T | null | undefined): T | '' {
  return v === null || v === undefined ? '' : v;
}

export function formatDateTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString(locale === 'km' ? 'km-KH' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
