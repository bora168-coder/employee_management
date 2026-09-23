import { describe, expect, it } from 'vitest';
import {
  createUserSchema,
  educationSectionSchema,
  familySectionSchema,
  personalSectionSchema,
  workSectionSchema,
} from './schemas';

const validPersonal = {
  organizationUnitId: '5b0f3c62-6f0e-4d4a-9b8e-2f1f6f1c9d11',
  nameKh: 'សុខ សុភា',
  nameLatin: 'sok sophea',
  gender: 'FEMALE',
  dateOfBirth: '1990-01-15',
  birthPlace: { provinceCode: '05' },
  address: {},
  phone1: '085 123 456',
  phone2: '',
  nationalIdNo: '០១២៣៤៥៦៧៨',
};

describe('personalSectionSchema', () => {
  it('accepts and normalizes a valid record', () => {
    const r = personalSectionSchema.parse(validPersonal);
    expect(r.nameLatin).toBe('SOK SOPHEA');
    expect(r.phone1).toBe('85585123456');
    expect(r.phone2).toBeNull();
    expect(r.nationalIdNo).toBe('012345678');
    expect(r.nationality).toBe('ខ្មែរ');
  });

  it('rejects too young employees', () => {
    const r = personalSectionSchema.safeParse({ ...validPersonal, dateOfBirth: '2020-01-01' });
    expect(r.success).toBe(false);
  });

  it('rejects bad national id and phone', () => {
    const r = personalSectionSchema.safeParse({
      ...validPersonal,
      nationalIdNo: '123',
      phone1: '12',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('nationalIdNo');
      expect(paths).toContain('phone1');
    }
  });

  it('rejects impossible dates', () => {
    const r = personalSectionSchema.safeParse({ ...validPersonal, dateOfBirth: '1990-02-31' });
    expect(r.success).toBe(false);
  });
});

describe('educationSectionSchema', () => {
  it('rejects end before start', () => {
    const r = educationSectionSchema.safeParse({
      educations: [
        {
          category: 'GENERAL',
          levelOrCourse: 'មធ្យមសិក្សាទុតិយភូមិ',
          startDate: '2004-12-14',
          endDate: '2001-10-01',
        },
      ],
    });
    expect(r.success).toBe(false);
  });
});

describe('workSectionSchema', () => {
  const row = { sector: 'MINISTRY_OF_INTERIOR', startDate: '2009-10-09', positionText: 'មន្ត្រី' };

  it('allows one current position', () => {
    const r = workSectionSchema.safeParse({
      workHistories: [row, { ...row, startDate: '2018-01-11', endDate: '2023-02-06' }],
    });
    expect(r.success).toBe(true);
  });

  it('rejects two current positions', () => {
    const r = workSectionSchema.safeParse({ workHistories: [row, row] });
    expect(r.success).toBe(false);
  });

  it('needs a position', () => {
    const r = workSectionSchema.safeParse({
      workHistories: [{ sector: 'OTHER_PUBLIC', startDate: '2009-10-09' }],
    });
    expect(r.success).toBe(false);
  });
});

describe('familySectionSchema', () => {
  it('rejects duplicate relations and more than 2 references', () => {
    const dup = familySectionSchema.safeParse({
      familyMembers: [
        { relation: 'FATHER', name: 'A' },
        { relation: 'FATHER', name: 'B' },
      ],
    });
    expect(dup.success).toBe(false);
    const refs = familySectionSchema.safeParse({
      references: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
    });
    expect(refs.success).toBe(false);
  });

  it('defaults children counts to 0', () => {
    const r = familySectionSchema.parse({ childrenFemale: '' });
    expect(r.childrenFemale).toBe(0);
    expect(r.childrenMale).toBe(0);
  });
});

describe('createUserSchema', () => {
  it('lowercases username and checks password length', () => {
    expect(
      createUserSchema.parse({
        username: 'HR.Admin',
        password: '12345678',
        fullName: 'HR',
        role: 'HR_ADMIN',
      }).username,
    ).toBe('hr.admin');
    expect(
      createUserSchema.safeParse({
        username: 'hr',
        password: '1',
        fullName: 'HR',
        role: 'HR_ADMIN',
      }).success,
    ).toBe(false);
  });
});
