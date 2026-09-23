import { z } from 'zod';
import {
  AwardType,
  EducationCategory,
  FamilyRelation,
  Gender,
  RecordStatus,
  WorkSector,
} from '../enums';
import { yearsBetween } from '../utils/khmer';
import {
  endNotBeforeStart,
  intWithDefault,
  isoDate,
  locationSchema,
  optionalDate,
  optionalDigits,
  optionalInt,
  optionalPhone,
  optionalText,
  optionalUuid,
  requiredText,
} from './common';

const enumValues = <T extends Record<string, string>>(e: T) =>
  Object.values(e) as [T[keyof T], ...T[keyof T][]];

export const MIN_AGE = 18;
export const MAX_AGE = 70;

// ---------- Header + Section ក: personal information ----------
export const personalSectionSchema = z.object({
  organizationUnitId: z.string({ required_error: 'Required' }).uuid('Required'),
  civilServantId: optionalText(20), // លេខសម្គាល់មន្ត្រីរាជការ
  nationalIdNo: optionalDigits(9, 'National ID must be 9 digits'), // អត្តសញ្ញាណប័ណ្ណ
  civilServantNo: optionalDigits(10, 'Civil servant number must be 10 digits'), // អត្តលេខមន្ត្រីរាជការ
  nameKh: requiredText(100),
  nameLatin: requiredText(100).transform((v) => v.toUpperCase()),
  gender: z.enum(enumValues(Gender), { required_error: 'Required' }),
  dateOfBirth: isoDate.refine((d) => {
    const age = yearsBetween(d);
    return age >= MIN_AGE && age <= MAX_AGE;
  }, `Age must be between ${MIN_AGE} and ${MAX_AGE}`),
  nationality: requiredText(50).default('ខ្មែរ'),
  birthPlace: locationSchema,
  houseNo: optionalText(20),
  streetNo: optionalText(20),
  address: locationSchema,
  phone1: optionalPhone,
  phone2: optionalPhone,
  voterRegistration: z
    .object({
      voterNo: optionalText(20), // លេខរៀង
      pollingStation: optionalText(200), // ការិយាល័យបោះឆ្នោត
      location: locationSchema,
      year: optionalInt(1993, 2100),
    })
    .nullable()
    .optional(),
});
export type PersonalSectionInput = z.input<typeof personalSectionSchema>;
export type PersonalSection = z.output<typeof personalSectionSchema>;

// ---------- Section ខ: education & training ----------
export const educationSchema = z
  .object({
    category: z.enum(enumValues(EducationCategory)),
    levelOrCourse: requiredText(200), // កម្រិតសិក្សា ឬ វគ្គ
    institution: optionalText(200), // គ្រឹះស្ថានសិក្សា
    certificate: optionalText(200), // សញ្ញាបត្រ
    startDate: optionalDate,
    endDate: optionalDate,
  })
  .refine((e) => endNotBeforeStart(e.startDate, e.endDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

export const educationSectionSchema = z.object({
  educations: z.array(educationSchema).max(50).default([]),
});
export type EducationSectionInput = z.input<typeof educationSectionSchema>;
export type EducationSection = z.output<typeof educationSectionSchema>;

// ---------- Section គ: work history ----------
export const workHistorySchema = z
  .object({
    sector: z.enum(enumValues(WorkSector)),
    startDate: isoDate,
    endDate: optionalDate, // empty = current position
    positionId: optionalUuid,
    positionText: optionalText(200),
    ministryOrInstitution: optionalText(200), // ក្រសួង ស្ថាប័ន
    unit: optionalText(200), // អង្គភាព
  })
  .refine((w) => endNotBeforeStart(w.startDate, w.endDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
  })
  .refine((w) => !!w.positionId || !!w.positionText, {
    message: 'Choose a position or type it',
    path: ['positionText'],
  });

export const workSectionSchema = z
  .object({
    civilServiceStartDate: optionalDate, // ថ្ងៃចូលបម្រើការងារក្នុងក្របខ័ណ្ឌរដ្ឋ
    currentPositionStartDate: optionalDate, // ថ្ងៃចូលកាន់មុខតំណែងបច្ចុប្បន្ន
    specialty: optionalText(200), // ជំនាញវិជ្ជាជីវៈ
    rankId: optionalUuid, // ក្របខ័ណ្ឌ ឋានន្តរស័ក្តិ ថ្នាក់
    rankYear: optionalInt(1979, 2100),
    workHistories: z.array(workHistorySchema).max(50).default([]),
  })
  .refine((s) => s.workHistories.filter((w) => !w.endDate).length <= 1, {
    message: 'Only one work history row can be the current position (no end date)',
    path: ['workHistories'],
  });
export type WorkSectionInput = z.input<typeof workSectionSchema>;
export type WorkSection = z.output<typeof workSectionSchema>;

// ---------- Section ឃ: awards & discipline ----------
export const awardSchema = z.object({
  type: z.enum(enumValues(AwardType)),
  documentRef: optionalText(200), // ឯកសារបញ្ជាក់
  date: optionalDate,
  ministryOrInstitution: optionalText(200),
  kind: optionalText(200), // ប្រភេទ
  form: optionalText(200), // ទម្រង់
});

export const awardsSectionSchema = z.object({
  awards: z.array(awardSchema).max(50).default([]),
});
export type AwardsSectionInput = z.input<typeof awardsSectionSchema>;
export type AwardsSection = z.output<typeof awardsSectionSchema>;

// ---------- Section ង: family, references, declaration ----------
export const familyMemberSchema = z.object({
  relation: z.enum(enumValues(FamilyRelation)),
  name: requiredText(100),
  isAlive: z.boolean().default(true),
  dateOfBirth: optionalDate,
  occupation: optionalText(200),
  address: optionalText(500),
  birthPlace: optionalText(500),
  phone1: optionalPhone,
  phone2: optionalPhone,
});

export const referencePersonSchema = z.object({
  name: requiredText(100),
  gender: z.preprocess(
    (v) => (v === '' ? null : v),
    z.enum(enumValues(Gender)).nullable().optional(),
  ),
  occupation: optionalText(200),
  phone: optionalPhone,
  address: optionalText(500),
});

export const familySectionSchema = z
  .object({
    familyMembers: z.array(familyMemberSchema).max(3).default([]),
    childrenFemale: intWithDefault(0, 30),
    childrenMale: intWithDefault(0, 30),
    references: z.array(referencePersonSchema).max(2, 'At most 2 reference persons').default([]),
    declaredPlace: optionalText(100), // ធ្វើនៅ
    declaredDate: optionalDate, // ថ្ងៃទី
  })
  .refine((s) => new Set(s.familyMembers.map((m) => m.relation)).size === s.familyMembers.length, {
    message: 'Spouse, father and mother can each appear only once',
    path: ['familyMembers'],
  });
export type FamilySectionInput = z.input<typeof familySectionSchema>;
export type FamilySection = z.output<typeof familySectionSchema>;

// ---------- Section update wrapper (optimistic locking) ----------
export const withVersion = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ version: z.number().int().min(1), data: schema });

export const sectionSchemas = {
  personal: personalSectionSchema,
  education: educationSectionSchema,
  work: workSectionSchema,
  awards: awardsSectionSchema,
  family: familySectionSchema,
} as const;

// ---------- Workflow ----------
export const returnRecordSchema = z.object({
  comment: requiredText(1000),
});
export type ReturnRecordInput = z.input<typeof returnRecordSchema>;

// ---------- List / search ----------
export const employeeListQuerySchema = z.object({
  search: z.preprocess((v) => (v === '' ? undefined : v), z.string().trim().max(100).optional()),
  organizationUnitId: z.preprocess((v) => (v === '' ? undefined : v), z.string().uuid().optional()),
  rankId: z.preprocess((v) => (v === '' ? undefined : v), z.string().uuid().optional()),
  gender: z.preprocess((v) => (v === '' ? undefined : v), z.enum(enumValues(Gender)).optional()),
  status: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.enum(enumValues(RecordStatus)).optional(),
  ),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['nameKh', 'nameLatin', 'dateOfBirth', 'updatedAt']).default('updatedAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});
export type EmployeeListQuery = z.output<typeof employeeListQuerySchema>;
