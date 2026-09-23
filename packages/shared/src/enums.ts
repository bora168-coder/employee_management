export const Gender = { MALE: 'MALE', FEMALE: 'FEMALE' } as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const RecordStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  VERIFIED: 'VERIFIED',
} as const;
export type RecordStatus = (typeof RecordStatus)[keyof typeof RecordStatus];

export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  HR_ADMIN: 'HR_ADMIN',
  UNIT_HEAD: 'UNIT_HEAD',
  VIEWER: 'VIEWER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const EducationCategory = {
  GENERAL: 'GENERAL',
  PROFESSIONAL: 'PROFESSIONAL',
  FOREIGN_LANGUAGE: 'FOREIGN_LANGUAGE',
  ONGOING_TRAINING: 'ONGOING_TRAINING',
} as const;
export type EducationCategory = (typeof EducationCategory)[keyof typeof EducationCategory];

export const WorkSector = {
  MINISTRY_OF_INTERIOR: 'MINISTRY_OF_INTERIOR',
  OTHER_PUBLIC: 'OTHER_PUBLIC',
  PRIVATE_OR_NGO: 'PRIVATE_OR_NGO',
} as const;
export type WorkSector = (typeof WorkSector)[keyof typeof WorkSector];

export const AwardType = { AWARD: 'AWARD', DISCIPLINE: 'DISCIPLINE' } as const;
export type AwardType = (typeof AwardType)[keyof typeof AwardType];

export const FamilyRelation = { SPOUSE: 'SPOUSE', FATHER: 'FATHER', MOTHER: 'MOTHER' } as const;
export type FamilyRelation = (typeof FamilyRelation)[keyof typeof FamilyRelation];

export const AttachmentCategory = {
  CERTIFICATE: 'CERTIFICATE',
  SIGNED_FORM: 'SIGNED_FORM',
  OTHER: 'OTHER',
} as const;
export type AttachmentCategory = (typeof AttachmentCategory)[keyof typeof AttachmentCategory];

export const AuditAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  SUBMIT: 'SUBMIT',
  VERIFY: 'VERIFY',
  RETURN: 'RETURN',
  VIEW: 'VIEW',
  PRINT: 'PRINT',
  EXPORT: 'EXPORT',
  LOGIN: 'LOGIN',
  LOGIN_FAILED: 'LOGIN_FAILED',
  UPLOAD: 'UPLOAD',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

/** Sections of the official biography form (ជីវប្រវត្តិមន្ត្រីរាជការ). */
export const EmployeeSection = {
  PERSONAL: 'personal',
  EDUCATION: 'education',
  WORK: 'work',
  AWARDS: 'awards',
  FAMILY: 'family',
} as const;
export type EmployeeSection = (typeof EmployeeSection)[keyof typeof EmployeeSection];

export const ROLES_THAT_CAN_EDIT: Role[] = [Role.SUPER_ADMIN, Role.HR_ADMIN];
export const ROLES_THAT_CAN_VERIFY: Role[] = [Role.SUPER_ADMIN, Role.UNIT_HEAD];
