'use client';

import { EmployeeDetail, WorkSection, workSectionSchema, WorkSector } from '@csbms/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/form';
import { Alert, EmptyState } from '@/components/ui/misc';
import { usePositions, useRanks } from '@/lib/hooks';
import { StepFooter } from './step-footer';
import { workToForm } from './to-form';
import { errorAt, StepProps, useStepForm } from './use-step-form';

export function StepWork({
  employee,
  onSave,
  onBack,
  readOnly,
}: StepProps<WorkSection> & { employee: EmployeeDetail }) {
  const t = useTranslations();
  const { data: positions } = usePositions();
  const { data: ranks } = useRanks();
  const { form, submit, error, saving } = useStepForm(
    workSectionSchema,
    workToForm(employee),
    onSave,
  );
  const { register, control, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'workHistories' });
  const err = (p: string) => errorAt(formState.errors, p);

  return (
    <form onSubmit={submit} noValidate>
      <fieldset disabled={readOnly} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label={t('field.civilServiceStartDate')} error={err('civilServiceStartDate')}>
            <Input type="date" {...register('civilServiceStartDate')} />
          </Field>
          <Field
            label={t('field.currentPositionStartDate')}
            error={err('currentPositionStartDate')}
          >
            <Input type="date" {...register('currentPositionStartDate')} />
          </Field>
          <Field label={t('field.specialty')} error={err('specialty')}>
            <Input {...register('specialty')} />
          </Field>
          <Field label={t('field.rank')} error={err('rankId')} className="md:col-span-2">
            <Select {...register('rankId')}>
              <option value="">{t('common.choose')}</option>
              {ranks?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.framework} · {r.titleKh} · {r.grade}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('field.rankYear')} error={err('rankYear')}>
            <Input inputMode="numeric" {...register('rankYear')} />
          </Field>
        </div>

        <div className="space-y-3">
          <Alert tone="info">{t('field.currentHint')}</Alert>
          {err('workHistories') && <Alert>{err('workHistories')}</Alert>}
          {fields.length === 0 && <EmptyState>{t('common.noData')}</EmptyState>}
          {fields.map((f, i) => (
            <div
              key={f.id}
              className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-6"
            >
              <Field
                label={t('field.sector')}
                error={err(`workHistories.${i}.sector`)}
                className="md:col-span-2"
              >
                <Select {...register(`workHistories.${i}.sector`)}>
                  {Object.values(WorkSector).map((s) => (
                    <option key={s} value={s}>
                      {t(`workSector.${s}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('field.startDate')} error={err(`workHistories.${i}.startDate`)}>
                <Input type="date" {...register(`workHistories.${i}.startDate`)} />
              </Field>
              <Field label={t('field.endDate')} error={err(`workHistories.${i}.endDate`)}>
                <Input type="date" {...register(`workHistories.${i}.endDate`)} />
              </Field>
              <Field label={t('field.position')} error={err(`workHistories.${i}.positionId`)}>
                <Select {...register(`workHistories.${i}.positionId`)}>
                  <option value="">{t('common.choose')}</option>
                  {positions?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameKh}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('field.positionText')} error={err(`workHistories.${i}.positionText`)}>
                <Input {...register(`workHistories.${i}.positionText`)} />
              </Field>
              <Field
                label={t('field.ministryOrInstitution')}
                error={err(`workHistories.${i}.ministryOrInstitution`)}
                className="md:col-span-3"
              >
                <Input {...register(`workHistories.${i}.ministryOrInstitution`)} />
              </Field>
              <Field
                label={t('field.unit')}
                error={err(`workHistories.${i}.unit`)}
                className="md:col-span-3"
              >
                <Input {...register(`workHistories.${i}.unit`)} />
              </Field>
              {!readOnly && (
                <div className="md:col-span-6 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => remove(i)}>
                    <Trash2 className="h-4 w-4" /> {t('common.remove')}
                  </Button>
                </div>
              )}
            </div>
          ))}
          {!readOnly && (
            <Button
              variant="secondary"
              onClick={() =>
                append({
                  sector: 'MINISTRY_OF_INTERIOR',
                  startDate: '',
                  endDate: '',
                  positionId: '',
                  positionText: '',
                  ministryOrInstitution: '',
                  unit: '',
                })
              }
            >
              <Plus className="h-4 w-4" /> {t('common.add')}
            </Button>
          )}
        </div>
      </fieldset>
      {!readOnly && <StepFooter onBack={onBack} saving={saving} error={error} />}
    </form>
  );
}
