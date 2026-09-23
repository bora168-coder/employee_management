'use client';

import { EmployeeDetail, FamilySection } from '@csbms/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/form';
import { blank } from '@/lib/utils';
import {
  FAMILY_BLOCKS,
  FamilyFormInput,
  familyFormSchema,
  familyFormToSection,
} from './family-form-schema';
import { StepFooter } from './step-footer';
import { memberToForm } from './to-form';
import { errorAt, StepProps, useStepForm } from './use-step-form';

function toForm(e: EmployeeDetail): FamilyFormInput {
  const find = (r: string) => e.familyMembers.find((m) => m.relation === r);
  return {
    spouse: memberToForm(find('SPOUSE')),
    father: memberToForm(find('FATHER')),
    mother: memberToForm(find('MOTHER')),
    childrenFemale: e.childrenFemale,
    childrenMale: e.childrenMale,
    references: e.references.map((r) => ({
      name: r.name,
      gender: blank(r.gender) as 'MALE',
      occupation: blank(r.occupation),
      phone: blank(r.phone),
      address: blank(r.address),
    })),
    declaredPlace: blank(e.declaredPlace),
    declaredDate: blank(e.declaredDate),
  };
}

export function StepFamily({
  employee,
  onSave,
  onBack,
  readOnly,
  label,
}: StepProps<FamilySection> & { employee: EmployeeDetail; label?: string }) {
  const t = useTranslations();
  const { form, submit, error, saving } = useStepForm(familyFormSchema, toForm(employee), (v) =>
    onSave(familyFormToSection(v)),
  );
  const { register, control, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'references' });
  const err = (p: string) => errorAt(formState.errors, p);

  return (
    <form onSubmit={submit} noValidate>
      <fieldset disabled={readOnly} className="space-y-5">
        {FAMILY_BLOCKS.map(([key, relation]) => (
          <fieldset
            key={key}
            className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-4"
          >
            <legend className="px-1 text-sm font-medium text-slate-700">
              {t(`relation.${relation}`)}
            </legend>
            <Field label={t('field.name')} error={err(`${key}.name`)} className="md:col-span-2">
              <Input {...register(`${key}.name`)} />
            </Field>
            <Field label={t('field.dateOfBirth')} error={err(`${key}.dateOfBirth`)}>
              <Input type="date" {...register(`${key}.dateOfBirth`)} />
            </Field>
            <label className="flex items-center gap-2 pt-6 text-sm">
              <input type="checkbox" className="h-4 w-4" {...register(`${key}.isAlive`)} />
              {t('field.isAlive')}
            </label>
            <Field
              label={t('field.occupation')}
              error={err(`${key}.occupation`)}
              className="md:col-span-2"
            >
              <Input {...register(`${key}.occupation`)} />
            </Field>
            {relation === 'SPOUSE' ? (
              <>
                <Field label={t('field.phone1')} error={err(`${key}.phone1`)}>
                  <Input type="tel" {...register(`${key}.phone1`)} />
                </Field>
                <Field label={t('field.phone2')} error={err(`${key}.phone2`)}>
                  <Input type="tel" {...register(`${key}.phone2`)} />
                </Field>
                <Field
                  label={t('field.address')}
                  error={err(`${key}.address`)}
                  className="md:col-span-4"
                >
                  <Input {...register(`${key}.address`)} />
                </Field>
              </>
            ) : (
              <Field
                label={t('field.birthPlace')}
                error={err(`${key}.birthPlace`)}
                className="md:col-span-2"
              >
                <Input {...register(`${key}.birthPlace`)} />
              </Field>
            )}
          </fieldset>
        ))}

        <div className="grid gap-4 md:grid-cols-4">
          <Field label={t('field.childrenFemale')} error={err('childrenFemale')}>
            <Input inputMode="numeric" {...register('childrenFemale')} />
          </Field>
          <Field label={t('field.childrenMale')} error={err('childrenMale')}>
            <Input inputMode="numeric" {...register('childrenMale')} />
          </Field>
        </div>

        <fieldset className="space-y-3 rounded-md border border-slate-200 p-3">
          <legend className="px-1 text-sm font-medium text-slate-700">
            {t('sections.references')}
          </legend>
          {fields.map((f, i) => (
            <div key={f.id} className="grid gap-3 md:grid-cols-6">
              <Field
                label={t('field.name')}
                error={err(`references.${i}.name`)}
                className="md:col-span-2"
              >
                <Input {...register(`references.${i}.name`)} />
              </Field>
              <Field label={t('field.gender')} error={err(`references.${i}.gender`)}>
                <Select {...register(`references.${i}.gender`)}>
                  <option value="">{t('common.choose')}</option>
                  <option value="MALE">{t('gender.MALE')}</option>
                  <option value="FEMALE">{t('gender.FEMALE')}</option>
                </Select>
              </Field>
              <Field label={t('field.occupation')} error={err(`references.${i}.occupation`)}>
                <Input {...register(`references.${i}.occupation`)} />
              </Field>
              <Field
                label={t('field.phone')}
                error={err(`references.${i}.phone`)}
                className="md:col-span-2"
              >
                <Input type="tel" {...register(`references.${i}.phone`)} />
              </Field>
              <Field
                label={t('field.address')}
                error={err(`references.${i}.address`)}
                className="md:col-span-5"
              >
                <Input {...register(`references.${i}.address`)} />
              </Field>
              {!readOnly && (
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" onClick={() => remove(i)}>
                    <Trash2 className="h-4 w-4" /> {t('common.remove')}
                  </Button>
                </div>
              )}
            </div>
          ))}
          {!readOnly && fields.length < 2 && (
            <Button
              variant="secondary"
              onClick={() =>
                append({ name: '', gender: '' as 'MALE', occupation: '', phone: '', address: '' })
              }
            >
              <Plus className="h-4 w-4" /> {t('common.add')}
            </Button>
          )}
        </fieldset>

        <fieldset className="grid gap-4 rounded-md border border-slate-200 p-3 md:grid-cols-4">
          <legend className="px-1 text-sm font-medium text-slate-700">
            {t('sections.declaration')}
          </legend>
          <Field label={t('field.declaredPlace')} error={err('declaredPlace')}>
            <Input {...register('declaredPlace')} />
          </Field>
          <Field label={t('field.declaredDate')} error={err('declaredDate')}>
            <Input type="date" {...register('declaredDate')} />
          </Field>
        </fieldset>
      </fieldset>
      {!readOnly && <StepFooter onBack={onBack} saving={saving} error={error} label={label} />}
    </form>
  );
}
