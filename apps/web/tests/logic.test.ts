import { describe, expect, it, vi } from 'vitest';
import {
  familyFormSchema,
  familyFormToSection,
} from '@/components/employee-form/family-form-schema';
import { isEmptyVoter } from '@/components/employee-form/to-form';
import { ApiError } from '@/lib/api';
import { applyServerErrors } from '@/lib/form-errors';
import { unitTree } from '@/lib/hooks';

const emptyMember = {
  name: '',
  isAlive: true,
  dateOfBirth: '',
  occupation: '',
  address: '',
  birthPlace: '',
  phone1: '',
  phone2: '',
};

describe('family form', () => {
  it('saves only filled family blocks, with the right relation', () => {
    const parsed = familyFormSchema.parse({
      spouse: emptyMember,
      father: { ...emptyMember, name: 'ចាន់ ថា', isAlive: false },
      mother: emptyMember,
      childrenFemale: '2',
      childrenMale: '',
      references: [],
      declaredPlace: '',
      declaredDate: '',
    });
    const section = familyFormToSection(parsed);
    expect(section.familyMembers).toEqual([
      expect.objectContaining({ relation: 'FATHER', name: 'ចាន់ ថា', isAlive: false }),
    ]);
    expect(section.childrenFemale).toBe(2);
    expect(section.childrenMale).toBe(0);
  });

  it('asks for a name when other details of a block are filled', () => {
    const r = familyFormSchema.safeParse({
      spouse: { ...emptyMember, occupation: 'គ្រូ' },
      father: emptyMember,
      mother: emptyMember,
      references: [],
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(['spouse', 'name']);
  });
});

describe('isEmptyVoter', () => {
  it('detects an empty voter block', () => {
    expect(
      isEmptyVoter({
        voterNo: null,
        pollingStation: null,
        year: null,
        location: { provinceCode: null },
      }),
    ).toBe(true);
    expect(isEmptyVoter({ voterNo: '147', location: {} })).toBe(false);
  });
});

describe('unitTree', () => {
  it('orders units as a tree with depth', () => {
    const tree = unitTree([
      { id: 'c', nameKh: 'C', nameEn: null, parentId: 'a' },
      { id: 'a', nameKh: 'A', nameEn: null, parentId: null },
      { id: 'b', nameKh: 'B', nameEn: null, parentId: 'missing' },
    ]);
    expect(tree.map((u) => [u.id, u.depth])).toEqual([
      ['a', 0],
      ['c', 1],
      ['b', 0],
    ]);
  });
});

describe('applyServerErrors', () => {
  it('puts field errors on fields and returns the rest', () => {
    const setError = vi.fn();
    const err = new ApiError(400, {
      statusCode: 400,
      error: 'VALIDATION_ERROR',
      message: 'Some fields are not valid',
      details: [
        { field: 'nationalIdNo', message: 'Already exists' },
        { field: 'voterRegistration.location', message: 'Village does not match commune' },
      ],
    });
    const rest = applyServerErrors(err, setError, (f) => f === 'nationalIdNo');
    expect(setError).toHaveBeenCalledWith('nationalIdNo', {
      type: 'server',
      message: 'Already exists',
    });
    expect(rest).toBe('Village does not match commune');
  });

  it('returns the message when there are no details', () => {
    const err = new ApiError(409, { statusCode: 409, error: 'RECORD_LOCKED', message: 'Locked' });
    expect(applyServerErrors(err, vi.fn())).toBe('Locked');
  });
});
