import {
  FamilyRelation,
  FamilySection,
  intWithDefault,
  optionalDate,
  optionalPhone,
  optionalText,
  referencePersonSchema,
} from '@csbms/shared';
import { z } from 'zod';

/**
 * The screen shows fixed blocks for spouse, father and mother.
 * A block with an empty name is not saved.
 */
const memberBlock = z
  .object({
    name: optionalText(100),
    isAlive: z.boolean(),
    dateOfBirth: optionalDate,
    occupation: optionalText(200),
    address: optionalText(500),
    birthPlace: optionalText(500),
    phone1: optionalPhone,
    phone2: optionalPhone,
  })
  .superRefine((m, ctx) => {
    const other = [m.dateOfBirth, m.occupation, m.address, m.birthPlace, m.phone1, m.phone2].some(
      Boolean,
    );
    if (!m.name && other)
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['name'], message: 'Required' });
  });

export const familyFormSchema = z.object({
  spouse: memberBlock,
  father: memberBlock,
  mother: memberBlock,
  childrenFemale: intWithDefault(0, 30),
  childrenMale: intWithDefault(0, 30),
  references: z.array(referencePersonSchema).max(2),
  declaredPlace: optionalText(100),
  declaredDate: optionalDate,
});

export type FamilyFormInput = z.input<typeof familyFormSchema>;
type FamilyFormOutput = z.output<typeof familyFormSchema>;

export const FAMILY_BLOCKS = [
  ['spouse', FamilyRelation.SPOUSE],
  ['father', FamilyRelation.FATHER],
  ['mother', FamilyRelation.MOTHER],
] as const;

/** Form values → API section data. */
export function familyFormToSection(v: FamilyFormOutput): FamilySection {
  return {
    familyMembers: FAMILY_BLOCKS.filter(([key]) => !!v[key].name).map(([key, relation]) => ({
      relation,
      ...v[key],
      name: v[key].name!,
    })),
    childrenFemale: v.childrenFemale,
    childrenMale: v.childrenMale,
    references: v.references,
    declaredPlace: v.declaredPlace,
    declaredDate: v.declaredDate,
  };
}
