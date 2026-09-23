'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { LOCALE_COOKIE } from '@/i18n/config';

export function LanguageSwitch() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('common');

  const change = (value: string) => {
    document.cookie = `${LOCALE_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <span className="sr-only">{t('language')}</span>
      <select
        value={locale}
        onChange={(e) => change(e.target.value)}
        className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
      >
        <option value="km">ខ្មែរ</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}
