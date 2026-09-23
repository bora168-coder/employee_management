import { z } from 'zod';
import { fromKhmerDigits } from '../utils/khmer';
import { normalizePhone } from '../utils/phone';

/** Form inputs send "" for empty fields. Treat them as null. */
export const emptyToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);

export const requiredText = (max = 255) =>
  z.string({ required_error: 'Required' }).trim().min(1, 'Required').max(max);

export const optionalText = (max = 255) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable().optional());

function isRealDate(value: string): boolean {
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** ISO date string: YYYY-MM-DD */
export const isoDate = z
  .string({ required_error: 'Required' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date (YYYY-MM-DD)')
  .refine(isRealDate, 'Invalid date');

export const optionalDate = z.preprocess(emptyToNull, isoDate.nullable().optional());

/** Digits only (Khmer digits are converted), with an exact length. */
export const optionalDigits = (length: number, message: string) =>
  z.preprocess(
    (v) => {
      const e = emptyToNull(v);
      return typeof e === 'string' ? fromKhmerDigits(e).replace(/\s/g, '') : e;
    },
    z
      .string()
      .regex(new RegExp(`^\\d{${length}}$`), message)
      .nullable()
      .optional(),
  );

export const optionalPhone = z.preprocess(
  emptyToNull,
  z
    .string()
    .transform((v, ctx) => {
      const n = normalizePhone(v);
      if (!n) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid Cambodian phone number' });
        return z.NEVER;
      }
      return n;
    })
    .nullable()
    .optional(),
);

export const optionalInt = (min: number, max: number) =>
  z.preprocess((v) => {
    const e = emptyToNull(v);
    return typeof e === 'string' ? Number(fromKhmerDigits(e)) : e;
  }, z.number().int().min(min).max(max).nullable().optional());

export const intWithDefault = (min: number, max: number) =>
  z.preprocess((v) => {
    const e = emptyToNull(v);
    if (e === null || e === undefined) return 0;
    return typeof e === 'string' ? Number(fromKhmerDigits(e)) : e;
  }, z.number().int().min(min).max(max));

export const optionalCode = z.preprocess(emptyToNull, z.string().max(20).nullable().optional());

export const optionalUuid = z.preprocess(emptyToNull, z.string().uuid().nullable().optional());

/** Province → District → Commune → Village codes (Cambodian gazetteer). */
export const locationSchema = z.object({
  provinceCode: optionalCode,
  districtCode: optionalCode,
  communeCode: optionalCode,
  villageCode: optionalCode,
});
export type LocationInput = z.input<typeof locationSchema>;

export const idParamSchema = z.object({ id: z.string().uuid() });

/** Returns true when `end` is empty or not before `start`. */
export const endNotBeforeStart = (start?: string | null, end?: string | null) =>
  !start || !end || end >= start;
