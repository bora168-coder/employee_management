'use client';

import { useTranslations } from 'next-intl';
import { Alert } from '@/components/ui/misc';

export function EmployeeForbidden() {
  const t = useTranslations('common');
  return <Alert>{t('notFound')}</Alert>;
}
