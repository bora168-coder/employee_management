'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { OrganizationUnitInput, organizationUnitSchema, OrganizationUnitView } from '@csbms/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select } from '@/components/ui/form';
import { Alert, Card, Spinner } from '@/components/ui/misc';
import { api, ApiError } from '@/lib/api';
import { applyServerErrors } from '@/lib/form-errors';
import { qk, unitTree, useUnits } from '@/lib/hooks';

export default function UnitsPage() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const { data: units, isLoading } = useUnits();
  const [editing, setEditing] = useState<OrganizationUnitView | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tree = unitTree(units ?? []);

  const remove = async (u: OrganizationUnitView) => {
    if (!confirm(`${t('common.delete')}: ${u.nameKh}?`)) return;
    setError(null);
    try {
      await api(`/organization-units/${u.id}`, { method: 'DELETE' });
      await queryClient.invalidateQueries({ queryKey: qk.units });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.error'));
    }
  };

  return (
    <>
      <PageHeader
        title={t('settings.units')}
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> {t('settings.newUnit')}
          </Button>
        }
      />
      {error && <Alert>{error}</Alert>}
      <Card>
        {isLoading ? (
          <Spinner />
        ) : (
          <ul className="divide-y divide-slate-100">
            {tree.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between py-2"
                style={{ paddingLeft: u.depth * 24 }}
              >
                <span>
                  {u.nameKh}
                  {u.nameEn && <span className="ml-2 text-xs text-slate-500">{u.nameEn}</span>}
                </span>
                <span className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(u)}
                    aria-label={t('common.edit')}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(u)}
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? t('settings.newUnit') : t('common.edit')}
      >
        {editing && (
          <UnitForm
            unit={editing === 'new' ? null : editing}
            units={tree}
            onDone={() => setEditing(null)}
          />
        )}
      </Dialog>
    </>
  );
}

function UnitForm({
  unit,
  units,
  onDone,
}: {
  unit: OrganizationUnitView | null;
  units: (OrganizationUnitView & { depth: number })[];
  onDone: () => void;
}) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<OrganizationUnitInput>({
    resolver: zodResolver(organizationUnitSchema),
    defaultValues: {
      nameKh: unit?.nameKh ?? '',
      nameEn: unit?.nameEn ?? '',
      parentId: unit?.parentId ?? '',
    },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    try {
      await api(unit ? `/organization-units/${unit.id}` : '/organization-units', {
        method: unit ? 'PUT' : 'POST',
        body: values,
      });
      await queryClient.invalidateQueries({ queryKey: qk.units });
      onDone();
    } catch (e) {
      setError(applyServerErrors(e, form.setError));
    }
  });

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      {error && <Alert>{error}</Alert>}
      <Field label={t('field.nameKh')} error={errors.nameKh?.message}>
        <Input {...form.register('nameKh')} />
      </Field>
      <Field label={t('field.nameEn')} error={errors.nameEn?.message}>
        <Input {...form.register('nameEn')} />
      </Field>
      <Field label={t('field.parent')} error={errors.parentId?.message}>
        <Select {...form.register('parentId')}>
          <option value="">{t('settings.root')}</option>
          {units
            .filter((u) => u.id !== unit?.id)
            .map((u) => (
              <option key={u.id} value={u.id}>
                {' '.repeat(u.depth * 3)}
                {u.nameKh}
              </option>
            ))}
        </Select>
      </Field>
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
