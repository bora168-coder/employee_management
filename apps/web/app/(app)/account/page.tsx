'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ChangePasswordInput, changePasswordSchema } from '@csbms/shared';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { Alert, Card, DataList } from '@/components/ui/misc';
import { api } from '@/lib/api';
import { applyServerErrors } from '@/lib/form-errors';
import { useMe } from '@/lib/hooks';

export default function AccountPage() {
  const t = useTranslations();
  const router = useRouter();
  const { data: me } = useMe();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await api('/auth/change-password', { method: 'POST', body: values });
      alert(t('auth.passwordChanged'));
      router.replace('/login');
    } catch (e) {
      setError(applyServerErrors(e, form.setError));
    }
  });

  return (
    <div className="max-w-xl space-y-4">
      <PageHeader title={t('nav.account')} />
      {me && (
        <Card>
          <DataList
            items={[
              [t('auth.username'), me.username],
              [t('field.fullName'), me.fullName],
              [t('field.role'), t(`role.${me.role}`)],
            ]}
          />
        </Card>
      )}
      <Card title={t('auth.changePassword')}>
        <form onSubmit={submit} className="space-y-3" noValidate>
          {error && <Alert>{error}</Alert>}
          <Field label={t('auth.currentPassword')} error={errors.currentPassword?.message}>
            <Input
              type="password"
              autoComplete="current-password"
              {...form.register('currentPassword')}
            />
          </Field>
          <Field label={t('auth.newPassword')} error={errors.newPassword?.message}>
            <Input type="password" autoComplete="new-password" {...form.register('newPassword')} />
          </Field>
          <Button type="submit" disabled={isSubmitting}>
            {t('common.save')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
