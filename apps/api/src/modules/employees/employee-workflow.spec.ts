import { ConflictException } from '@nestjs/common';
import { nextStatus } from './employee-workflow';

describe('nextStatus', () => {
  it('follows the documented flow', () => {
    expect(nextStatus('DRAFT', 'submit')).toBe('SUBMITTED');
    expect(nextStatus('SUBMITTED', 'verify')).toBe('VERIFIED');
    expect(nextStatus('SUBMITTED', 'return')).toBe('DRAFT');
  });

  it('sends edited records back to DRAFT', () => {
    expect(nextStatus('DRAFT', 'edit')).toBe('DRAFT');
    expect(nextStatus('VERIFIED', 'edit')).toBe('DRAFT');
  });

  it('locks SUBMITTED records for editing', () => {
    expect(() => nextStatus('SUBMITTED', 'edit')).toThrow(ConflictException);
  });

  it.each([
    ['DRAFT', 'verify'],
    ['DRAFT', 'return'],
    ['VERIFIED', 'submit'],
    ['VERIFIED', 'verify'],
    ['SUBMITTED', 'submit'],
  ] as const)('rejects %s → %s', (status, action) => {
    expect(() => nextStatus(status, action)).toThrow(ConflictException);
  });
});
