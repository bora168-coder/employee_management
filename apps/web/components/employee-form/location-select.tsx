'use client';

import { useTranslations } from 'next-intl';
import { useFormContext, useWatch } from 'react-hook-form';
import { Field, Select } from '@/components/ui/form';
import { LocationOption, useLocations } from '@/lib/hooks';

const LEVELS = ['provinceCode', 'districtCode', 'communeCode', 'villageCode'] as const;

/** Cascading Province → District → Commune → Village selects bound to `${name}.xxxCode`. */
export function LocationSelect({ name, label }: { name: string; label: string }) {
  const t = useTranslations();
  const { register, setValue, control } = useFormContext();
  const [province, district, commune] = useWatch({
    control,
    name: [`${name}.provinceCode`, `${name}.districtCode`, `${name}.communeCode`],
  }) as (string | null | undefined)[];

  const provinces = useLocations('provinces');
  const districts = useLocations('districts', province);
  const communes = useLocations('communes', district);
  const villages = useLocations('villages', commune);

  /** Changing a level clears the levels below it. */
  const onChange = (level: number) => () => {
    for (const lower of LEVELS.slice(level + 1))
      setValue(`${name}.${lower}`, '', { shouldDirty: true });
  };

  const renderSelect = (
    level: number,
    labelKey: string,
    options: LocationOption[] | undefined,
    enabled: boolean,
  ) => {
    const field = `${name}.${LEVELS[level]}`;
    const reg = register(field);
    return (
      <Field label={t(`field.${labelKey}`)} htmlFor={field}>
        <Select
          id={field}
          disabled={!enabled}
          {...reg}
          onChange={(e) => {
            void reg.onChange(e);
            onChange(level)();
          }}
        >
          <option value="">{t('common.choose')}</option>
          {options?.map((o) => (
            <option key={o.code} value={o.code}>
              {o.nameKh}
            </option>
          ))}
        </Select>
      </Field>
    );
  };

  return (
    <fieldset className="rounded-md border border-slate-200 p-3">
      <legend className="px-1 text-sm font-medium text-slate-700">{label}</legend>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {renderSelect(0, 'province', provinces.data, true)}
        {renderSelect(1, 'district', districts.data, !!province)}
        {renderSelect(2, 'commune', communes.data, !!district)}
        {renderSelect(3, 'village', villages.data, !!commune)}
      </div>
    </fieldset>
  );
}
