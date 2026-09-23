'use client';

import { positionSchema, RankView, rankSchema } from '@csbms/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/form';
import { Alert, Card, Spinner } from '@/components/ui/misc';
import { Table, Td, Th } from '@/components/ui/table';
import { api, ApiError } from '@/lib/api';
import { applyServerErrors } from '@/lib/form-errors';
import { PositionView, qk, usePositions, useRanks } from '@/lib/hooks';

type Editing =
  { kind: 'position'; item: PositionView | null } | { kind: 'rank'; item: RankView | null } | null;

export default function ReferencePage() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const positions = usePositions();
  const ranks = useRanks();
  const [editing, setEditing] = useState<Editing>(null);
  const [error, setError] = useState<string | null>(null);

  const remove = async (path: string, key: readonly string[]) => {
    if (!confirm(t('common.areYouSure'))) return;
    setError(null);
    try {
      await api(path, { method: 'DELETE' });
      await queryClient.invalidateQueries({ queryKey: key });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.error'));
    }
  };

  return (
    <>
      <PageHeader title={t('nav.reference')} />
      {error && <Alert>{error}</Alert>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title={t('settings.positions')}
          actions={
            <Button size="sm" onClick={() => setEditing({ kind: 'position', item: null })}>
              <Plus className="h-4 w-4" /> {t('common.add')}
            </Button>
          }
        >
          {positions.isLoading ? (
            <Spinner />
          ) : (
            <Table>
              <tbody>
                {positions.data?.map((p) => (
                  <tr key={p.id}>
                    <Td>{p.nameKh}</Td>
                    <Td className="text-slate-500">{p.nameEn}</Td>
                    <Td className="whitespace-nowrap text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing({ kind: 'position', item: p })}
                        aria-label={t('common.edit')}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(`/positions/${p.id}`, qk.positions)}
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card
          title={t('settings.ranks')}
          actions={
            <Button size="sm" onClick={() => setEditing({ kind: 'rank', item: null })}>
              <Plus className="h-4 w-4" /> {t('common.add')}
            </Button>
          }
        >
          {ranks.isLoading ? (
            <Spinner />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{t('field.framework')}</Th>
                  <Th>{t('field.titleKh')}</Th>
                  <Th>{t('field.grade')}</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {ranks.data?.map((r) => (
                  <tr key={r.id}>
                    <Td>{r.framework}</Td>
                    <Td>{r.titleKh}</Td>
                    <Td>{r.grade}</Td>
                    <Td className="whitespace-nowrap text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing({ kind: 'rank', item: r })}
                        aria-label={t('common.edit')}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(`/ranks/${r.id}`, qk.ranks)}
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.kind === 'rank' ? t('settings.newRank') : t('settings.newPosition')}
      >
        {editing?.kind === 'position' && (
          <PositionForm item={editing.item} onDone={() => setEditing(null)} />
        )}
        {editing?.kind === 'rank' && (
          <RankForm item={editing.item} onDone={() => setEditing(null)} />
        )}
      </Dialog>
    </>
  );
}

function useSaveForm<S extends typeof positionSchema | typeof rankSchema>(
  schema: S,
  defaults: z.input<S>,
  path: string,
  method: 'POST' | 'PUT',
  key: readonly string[],
  onDone: () => void,
) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.input<S>>({
    resolver: zodResolver(schema as typeof positionSchema) as never,
    defaultValues: defaults as never,
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      await api(path, { method, body: values });
      await queryClient.invalidateQueries({ queryKey: key });
      onDone();
    } catch (e) {
      setError(applyServerErrors(e, form.setError));
    }
  });
  return { form, submit, error };
}

function FormButtons({ onDone, busy }: { onDone: () => void; busy: boolean }) {
  const t = useTranslations('common');
  return (
    <div className="flex justify-end gap-2">
      <Button variant="secondary" onClick={onDone}>
        {t('cancel')}
      </Button>
      <Button type="submit" disabled={busy}>
        {t('save')}
      </Button>
    </div>
  );
}

function PositionForm({ item, onDone }: { item: PositionView | null; onDone: () => void }) {
  const t = useTranslations();
  const { form, submit, error } = useSaveForm(
    positionSchema,
    { nameKh: item?.nameKh ?? '', nameEn: item?.nameEn ?? '' },
    item ? `/positions/${item.id}` : '/positions',
    item ? 'PUT' : 'POST',
    qk.positions,
    onDone,
  );
  const errors = form.formState.errors as Record<string, { message?: string }>;
  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      {error && <Alert>{error}</Alert>}
      <Field label={t('field.nameKh')} error={errors.nameKh?.message}>
        <Input {...form.register('nameKh')} />
      </Field>
      <Field label={t('field.nameEn')} error={errors.nameEn?.message}>
        <Input {...form.register('nameEn')} />
      </Field>
      <FormButtons onDone={onDone} busy={form.formState.isSubmitting} />
    </form>
  );
}

function RankForm({ item, onDone }: { item: RankView | null; onDone: () => void }) {
  const t = useTranslations();
  const { form, submit, error } = useSaveForm(
    rankSchema,
    { framework: item?.framework ?? '', titleKh: item?.titleKh ?? '', grade: item?.grade ?? 1 },
    item ? `/ranks/${item.id}` : '/ranks',
    item ? 'PUT' : 'POST',
    qk.ranks,
    onDone,
  );
  const errors = form.formState.errors as Record<string, { message?: string }>;
  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      {error && <Alert>{error}</Alert>}
      <Field label={t('field.framework')} error={errors.framework?.message}>
        <Input {...form.register('framework')} />
      </Field>
      <Field label={t('field.titleKh')} error={errors.titleKh?.message}>
        <Input {...form.register('titleKh')} />
      </Field>
      <Field label={t('field.grade')} error={errors.grade?.message}>
        <Input inputMode="numeric" {...form.register('grade')} />
      </Field>
      <FormButtons onDone={onDone} busy={form.formState.isSubmitting} />
    </form>
  );
}
