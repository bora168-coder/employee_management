import { z } from 'zod';
import { Role } from '../enums';
import { optionalText, optionalUuid, requiredText } from './common';

export const loginSchema = z.object({
  username: requiredText(50),
  password: z.string().min(1, 'Required').max(200),
});
export type LoginInput = z.input<typeof loginSchema>;

const roleEnum = z.enum(Object.values(Role) as [Role, ...Role[]]);

export const PASSWORD_MIN_LENGTH = 8;

export const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,50}$/, '3–50 characters: letters, numbers, . _ -'),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `At least ${PASSWORD_MIN_LENGTH} characters`)
    .max(200),
  fullName: requiredText(100),
  role: roleEnum,
  organizationUnitId: optionalUuid,
});
export type CreateUserInput = z.input<typeof createUserSchema>;

export const updateUserSchema = z.object({
  fullName: requiredText(100).optional(),
  role: roleEnum.optional(),
  organizationUnitId: optionalUuid,
  isActive: z.boolean().optional(),
  password: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z
      .string()
      .min(PASSWORD_MIN_LENGTH, `At least ${PASSWORD_MIN_LENGTH} characters`)
      .max(200)
      .optional(),
  ),
});
export type UpdateUserInput = z.input<typeof updateUserSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `At least ${PASSWORD_MIN_LENGTH} characters`)
    .max(200),
});
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;

export const organizationUnitSchema = z.object({
  nameKh: requiredText(200),
  nameEn: optionalText(200),
  parentId: optionalUuid,
});
export type OrganizationUnitInput = z.input<typeof organizationUnitSchema>;

export const positionSchema = z.object({
  nameKh: requiredText(200),
  nameEn: optionalText(200),
});
export type PositionInput = z.input<typeof positionSchema>;

export const rankSchema = z.object({
  framework: requiredText(20), // e.g. ខ.១.៤
  titleKh: requiredText(100), // e.g. នាយកម្មការ
  grade: z.coerce.number().int().min(1).max(20),
});
export type RankInput = z.input<typeof rankSchema>;
