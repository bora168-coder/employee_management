'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { createUserSchema, Role, updateUserSchema, UserView } from '@csbms/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select } from '@/components/ui/form';
import { Alert, Badge, Spinner } from '@/components/ui/misc';
import { Table, Td, Th } from '@/components/ui/table';
import { api } from '@/lib/api';
import { applyServerErrors } from '@/lib/form-errors';
import { qk, unitTree, useUnits } from '@/lib/hooks';
import { formatDateTime } from '@/lib/utils';

export default function UsersPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { data: users, isLoading } = useQuery({
    queryKey: qk.users,
    queryFn: () => api<UserView[]>('/users'),
  });
  const [editing, setEditing] = useState<UserView | 'new' | null>(null);

  return (
    <>
      <PageHeader
        title={t('settings.users')}
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> {t('settings.newUser')}
          </Button>
        }
      />
      {isLoading ? (
        <Spinner />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t('auth.username')}</Th>
              <Th>{t('field.fullName')}</Th>
              <Th>{t('field.role')}</Th>
              <Th>{t('field.organizationUnit')}</Th>
              <Th>{t('field.lastLogin')}</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.id} className={u.isActive ? '' : 'opacity-50'}>
                <Td>{u.username}</Td>
                <Td>{u.fullName}</Td>
                <Td>
                  <Badge>{t(`role.${u.role}`)}</Badge>
                </Td>
                <Td>{u.organizationUnit?.nameKh ?? '—'}</Td>
                <Td className="whitespace-nowrap">
                  {formatDateTime(u.lastLoginAt, locale) || '—'}
                </Td>
                <Td>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(u)}
                    aria-label={t('common.edit')}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? t('settings.newUser') : t('common.edit')}
      >
        {editing && (
          <UserForm user={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />
        )}
      </Dialog>
    </>
  );
}

interface UserFormValues {
  username: string;
  password: string;
  fullName: string;
  role: Role;
  organizationUnitId: string;
  isActive: boolean;
}

function UserForm({ user, onDone }: { user: UserView | null; onDone: () => void }) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const { data: units } = useUnits();
  const [error, setError] = useState<string | null>(null);
  const schema = user ? updateUserSchema : createUserSchema;
  const form = useForm<UserFormValues>({
    resolver: zodResolver(schema as typeof createUserSchema) as never,
    defaultValues: {
      username: user?.username ?? '',
      password: '',
      fullName: user?.fullName ?? '',
      role: user?.role ?? 'HR_ADMIN',
      organizationUnitId: user?.organizationUnit?.id ?? '',
      isActive: user?.isActive ?? true,
    },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    try {
      await api(user ? `/users/${user.id}` : '/users', {
        method: user ? 'PATCH' : 'POST',
        body: values,
      });
      await queryClient.invalidateQueries({ queryKey: qk.users });
      onDone();
    } catch (e) {
      setError(applyServerErrors(e, form.setError));
    }
  });

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      {error && <Alert>{error}</Alert>}
      {!user && (
        <Field label={t('auth.username')} error={errors.username?.message}>
          <Input autoComplete="off" {...form.register('username')} />
        </Field>
      )}
      <Field label={t('field.fullName')} error={errors.fullName?.message}>
        <Input {...form.register('fullName')} />
      </Field>
      <Field label={t('field.role')} error={errors.role?.message}>
        <Select {...form.register('role')}>
          {Object.values(Role).map((r) => (
            <option key={r} value={r}>
              {t(`role.${r}`)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t('field.organizationUnit')} error={errors.organizationUnitId?.message}>
        <Select {...form.register('organizationUnitId')}>
          <option value="">{t('common.none')}</option>
          {unitTree(units ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {' '.repeat(u.depth * 3)}
              {u.nameKh}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label={user ? t('field.newPasswordOptional') : t('auth.password')}
        error={errors.password?.message}
      >
        <Input type="password" autoComplete="new-password" {...form.register('password')} />
      </Field>
      {user && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4" {...form.register('isActive')} />
          {t('field.active')}
        </label>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
