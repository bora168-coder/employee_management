'use client';

import { AwardsSection, awardsSectionSchema, AwardType, EmployeeDetail } from '@csbms/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/form';
import { EmptyState } from '@/components/ui/misc';
import { StepFooter } from './step-footer';
import { awardsToForm } from './to-form';
import { errorAt, StepProps, useStepForm } from './use-step-form';

export function StepAwards({
  employee,
  onSave,
  onBack,
  readOnly,
}: StepProps<AwardsSection> & { employee: EmployeeDetail }) {
  const t = useTranslations();
  const { form, submit, error, saving } = useStepForm(
    awardsSectionSchema,
    awardsToForm(employee),
    onSave,
  );
  const { register, control, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'awards' });
  const err = (p: string) => errorAt(formState.errors, p);

  return (
    <form onSubmit={submit} noValidate>
      <fieldset disabled={readOnly} className="space-y-3">
        {fields.length === 0 && <EmptyState>{t('common.noData')}</EmptyState>}
        {fields.map((f, i) => (
          <div
            key={f.id}
            className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-6"
          >
            <Field
              label={t('field.type')}
              error={err(`awards.${i}.type`)}
              className="md:col-span-2"
            >
              <Select {...register(`awards.${i}.type`)}>
                {Object.values(AwardType).map((a) => (
                  <option key={a} value={a}>
                    {t(`awardType.${a}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label={t('field.documentRef')}
              error={err(`awards.${i}.documentRef`)}
              className="md:col-span-2"
            >
              <Input {...register(`awards.${i}.documentRef`)} />
            </Field>
            <Field
              label={t('field.date')}
              error={err(`awards.${i}.date`)}
              className="md:col-span-2"
            >
              <Input type="date" {...register(`awards.${i}.date`)} />
            </Field>
            <Field
              label={t('field.ministryOrInstitution')}
              error={err(`awards.${i}.ministryOrInstitution`)}
              className="md:col-span-2"
            >
              <Input {...register(`awards.${i}.ministryOrInstitution`)} />
            </Field>
            <Field
              label={t('field.kind')}
              error={err(`awards.${i}.kind`)}
              className="md:col-span-2"
            >
              <Input {...register(`awards.${i}.kind`)} />
            </Field>
            <Field
              label={t('field.form')}
              error={err(`awards.${i}.form`)}
              className="md:col-span-2"
            >
              <Input {...register(`awards.${i}.form`)} />
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
                type: 'AWARD',
                documentRef: '',
                date: '',
                ministryOrInstitution: '',
                kind: '',
                form: '',
              })
            }
          >
            <Plus className="h-4 w-4" /> {t('common.add')}
          </Button>
        )}
      </fieldset>
      {!readOnly && <StepFooter onBack={onBack} saving={saving} error={error} />}
    </form>
  );
}
