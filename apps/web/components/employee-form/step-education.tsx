'use client';

import {
  EducationCategory,
  EducationSection,
  educationSectionSchema,
  EmployeeDetail,
} from '@csbms/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/form';
import { EmptyState } from '@/components/ui/misc';
import { StepFooter } from './step-footer';
import { educationToForm } from './to-form';
import { errorAt, StepProps, useStepForm } from './use-step-form';

export function StepEducation({
  employee,
  onSave,
  onBack,
  readOnly,
}: StepProps<EducationSection> & { employee: EmployeeDetail }) {
  const t = useTranslations();
  const { form, submit, error, saving } = useStepForm(
    educationSectionSchema,
    educationToForm(employee),
    onSave,
  );
  const { register, control, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'educations' });
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
              label={t('field.category')}
              error={err(`educations.${i}.category`)}
              className="md:col-span-2"
            >
              <Select {...register(`educations.${i}.category`)}>
                {Object.values(EducationCategory).map((c) => (
                  <option key={c} value={c}>
                    {t(`educationCategory.${c}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label={t('field.levelOrCourse')}
              error={err(`educations.${i}.levelOrCourse`)}
              className="md:col-span-4"
            >
              <Input {...register(`educations.${i}.levelOrCourse`)} />
            </Field>
            <Field
              label={t('field.institution')}
              error={err(`educations.${i}.institution`)}
              className="md:col-span-2"
            >
              <Input {...register(`educations.${i}.institution`)} />
            </Field>
            <Field
              label={t('field.certificate')}
              error={err(`educations.${i}.certificate`)}
              className="md:col-span-2"
            >
              <Input {...register(`educations.${i}.certificate`)} />
            </Field>
            <Field label={t('field.startDate')} error={err(`educations.${i}.startDate`)}>
              <Input type="date" {...register(`educations.${i}.startDate`)} />
            </Field>
            <Field label={t('field.endDate')} error={err(`educations.${i}.endDate`)}>
              <Input type="date" {...register(`educations.${i}.endDate`)} />
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
                category: 'GENERAL',
                levelOrCourse: '',
                institution: '',
                certificate: '',
                startDate: '',
                endDate: '',
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
