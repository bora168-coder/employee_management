'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/misc';

export function StepFooter({
  onBack,
  saving,
  error,
  disabled,
  label,
}: {
  onBack?: () => void;
  saving: boolean;
  error?: string | null;
  disabled?: boolean;
  label?: string;
}) {
  const t = useTranslations('common');
  return (
    <div className="mt-6 space-y-3">
      {error && <Alert>{error}</Alert>}
      <div className="flex justify-between gap-2">
        {onBack ? (
          <Button variant="secondary" onClick={onBack}>
            {t('back')}
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={saving || disabled}>
          {saving ? t('saving') : (label ?? `${t('save')} → ${t('next')}`)}
        </Button>
      </div>
    </div>
  );
}
