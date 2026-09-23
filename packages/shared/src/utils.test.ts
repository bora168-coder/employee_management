import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDateKhLong,
  formatPhone,
  fromKhmerDigits,
  maskValue,
  normalizePhone,
  toKhmerDigits,
  yearsBetween,
} from './utils';

describe('khmer digits', () => {
  it('converts both ways', () => {
    expect(toKhmerDigits('2024-06-04')).toBe('២០២៤-០៦-០៤');
    expect(fromKhmerDigits('០១២៣៤៥៦៧៨')).toBe('012345678');
  });

  it('formats dates', () => {
    expect(formatDate('1990-06-15')).toBe('15/06/1990');
    expect(formatDate('1990-06-15', true)).toBe('១៥/០៦/១៩៩០');
    expect(formatDate(null)).toBe('');
    expect(formatDateKhLong('1990-06-15')).toBe('ថ្ងៃទី ១៥ ខែ មិថុនា ឆ្នាំ ១៩៩០');
  });

  it('counts whole years', () => {
    expect(yearsBetween('2000-06-10', new Date('2026-06-09T00:00:00Z'))).toBe(25);
    expect(yearsBetween('2000-06-10', new Date('2026-06-10T00:00:00Z'))).toBe(26);
  });
});

describe('phone', () => {
  it.each([
    ['085 123 456', '85585123456'],
    ['+855 12 345 678', '85512345678'],
    ['097 111 2233', '855971112233'],
    ['០៨៥ ១២៣ ៤៥៦', '85585123456'],
    ['85512345678', '85512345678'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(['123', '0000000000', 'abc', '085 355'])('rejects %s', (input) => {
    expect(normalizePhone(input)).toBeNull();
  });

  it('formats and masks', () => {
    expect(formatPhone('85585123456')).toBe('085 123 456');
    expect(maskValue('012345678')).toBe('012•••678');
    expect(maskValue(null)).toBeNull();
  });
});
