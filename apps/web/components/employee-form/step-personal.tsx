'use client';

import { EmployeeDetail, PersonalSection, personalSectionSchema } from '@csbms/shared';
import { useTranslations } from 'next-intl';
import { FormProvider } from 'react-hook-form';
import { Field, Input, Select } from '@/components/ui/form';
import { unitTree, useMe, useUnits } from '@/lib/hooks';
import { LocationSelect } from './location-select';
import { StepFooter } from './step-footer';
import { isEmptyVoter, personalToForm } from './to-form';
import { errorAt, StepProps, useStepForm } from './use-step-form';

export function StepPersonal({
  employee,
  onSave,
  onBack,
  readOnly,
}: StepProps<PersonalSection> & { employee?: EmployeeDetail }) {
  const t = useTranslations();
  const { data: me } = useMe();
  const { data: units } = useUnits();
  const { form, submit, error, saving } = useStepForm(
    personalSectionSchema,
    personalToForm(employee, me?.organizationUnitId),
    (data) =>
      onSave({
        ...data,
        voterRegistration:
          data.voterRegistration && isEmptyVoter(data.voterRegistration)
            ? null
            : data.voterRegistration,
      }),
  );
  const { register, formState } = form;
  const err = (p: string) => errorAt(formState.errors, p);

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} noValidate>
        <fieldset disabled={readOnly} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Field
              label={t('field.organizationUnit')}
              htmlFor="organizationUnitId"
              error={err('organizationUnitId')}
              className="md:col-span-3"
            >
              <Select id="organizationUnitId" {...register('organizationUnitId')}>
                <option value="">{t('common.choose')}</option>
                {unitTree(units ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {' '.repeat(u.depth * 3)}
                    {u.nameKh}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label={t('field.civilServantId')}
              htmlFor="civilServantId"
              error={err('civilServantId')}
            >
              <Input id="civilServantId" {...register('civilServantId')} />
            </Field>
            <Field
              label={t('field.nationalIdNo')}
              htmlFor="nationalIdNo"
              error={err('nationalIdNo')}
            >
              <Input id="nationalIdNo" inputMode="numeric" {...register('nationalIdNo')} />
            </Field>
            <Field
              label={t('field.civilServantNo')}
              htmlFor="civilServantNo"
              error={err('civilServantNo')}
            >
              <Input id="civilServantNo" inputMode="numeric" {...register('civilServantNo')} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label={t('field.nameKh')} htmlFor="nameKh" error={err('nameKh')}>
              <Input id="nameKh" {...register('nameKh')} />
            </Field>
            <Field label={t('field.nameLatin')} htmlFor="nameLatin" error={err('nameLatin')}>
              <Input id="nameLatin" className="uppercase" {...register('nameLatin')} />
            </Field>
            <Field label={t('field.gender')} htmlFor="gender" error={err('gender')}>
              <Select id="gender" {...register('gender')}>
                <option value="">{t('common.choose')}</option>
                <option value="MALE">{t('gender.MALE')}</option>
                <option value="FEMALE">{t('gender.FEMALE')}</option>
              </Select>
            </Field>
            <Field label={t('field.dateOfBirth')} htmlFor="dateOfBirth" error={err('dateOfBirth')}>
              <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
            </Field>
            <Field label={t('field.nationality')} htmlFor="nationality" error={err('nationality')}>
              <Input id="nationality" {...register('nationality')} />
            </Field>
          </div>

          <LocationSelect name="birthPlace" label={t('field.birthPlace')} />

          <div className="space-y-3">
            <div className="grid gap-4 md:grid-cols-4">
              <Field label={t('field.houseNo')} htmlFor="houseNo" error={err('houseNo')}>
                <Input id="houseNo" {...register('houseNo')} />
              </Field>
              <Field label={t('field.streetNo')} htmlFor="streetNo" error={err('streetNo')}>
                <Input id="streetNo" {...register('streetNo')} />
              </Field>
              <Field label={t('field.phone1')} htmlFor="phone1" error={err('phone1')}>
                <Input id="phone1" type="tel" placeholder="012 345 678" {...register('phone1')} />
              </Field>
              <Field label={t('field.phone2')} htmlFor="phone2" error={err('phone2')}>
                <Input id="phone2" type="tel" {...register('phone2')} />
              </Field>
            </div>
            <LocationSelect name="address" label={t('field.address')} />
          </div>

          <fieldset className="space-y-3 rounded-md border border-slate-200 p-3">
            <legend className="px-1 text-sm font-medium text-slate-700">
              {t('sections.voter')}
            </legend>
            <div className="grid gap-4 md:grid-cols-3">
              <Field
                label={t('field.voterNo')}
                htmlFor="voterNo"
                error={err('voterRegistration.voterNo')}
              >
                <Input id="voterNo" {...register('voterRegistration.voterNo')} />
              </Field>
              <Field
                label={t('field.pollingStation')}
                htmlFor="pollingStation"
                error={err('voterRegistration.pollingStation')}
              >
                <Input id="pollingStation" {...register('voterRegistration.pollingStation')} />
              </Field>
              <Field
                label={t('field.year')}
                htmlFor="voterYear"
                error={err('voterRegistration.year')}
              >
                <Input id="voterYear" inputMode="numeric" {...register('voterRegistration.year')} />
              </Field>
            </div>
            <LocationSelect name="voterRegistration.location" label={t('field.voterLocation')} />
          </fieldset>
        </fieldset>
        {!readOnly && <StepFooter onBack={onBack} saving={saving} error={error} />}
      </form>
    </FormProvider>
  );
}
