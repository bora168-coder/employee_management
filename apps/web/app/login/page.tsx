'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AuthUser, LoginInput, loginSchema } from '@csbms/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { LanguageSwitch } from '@/components/language-switch';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { Alert } from '@/components/ui/misc';
import { api, ApiError } from '@/lib/api';
import { qk } from '@/lib/hooks';

function LoginForm() {
  const t = useTranslations();
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const user = await api<AuthUser>('/auth/login', { method: 'POST', body: values });
      queryClient.setQueryData(qk.me, user);
      const next = params.get('next');
      // Only allow local paths (no open redirect).
      router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : '/');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.error'));
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <Alert>{error}</Alert>}
      <Field
        label={t('auth.username')}
        htmlFor="username"
        error={form.formState.errors.username?.message}
      >
        <Input id="username" autoComplete="username" autoFocus {...form.register('username')} />
      </Field>
      <Field
        label={t('auth.password')}
        htmlFor="password"
        error={form.formState.errors.password?.message}
      >
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...form.register('password')}
        />
      </Field>
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? t('auth.loggingIn') : t('auth.login')}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  const t = useTranslations();
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex justify-end">
          <LanguageSwitch />
        </div>
        <h1 className="text-center text-lg font-semibold text-slate-900">{t('app.name')}</h1>
        <p className="mb-6 text-center text-sm text-slate-500">{t('auth.title')}</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
