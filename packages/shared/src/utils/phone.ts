import { fromKhmerDigits } from './khmer';

/**
 * Normalizes a Cambodian phone number to international form without "+":
 * "085 123 456" → "85585123456", "+855 12 345 678" → "85512345678".
 * Returns null when the value is not a valid Cambodian number
 * (NSN must be 8 or 9 digits and must not start with 0).
 */
export function normalizePhone(input: string): string | null {
  let digits = fromKhmerDigits(input).replace(/[^0-9]/g, '');
  if (digits.startsWith('855')) digits = digits.slice(3);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  if (!/^[1-9][0-9]{7,8}$/.test(digits)) return null;
  return `855${digits}`;
}

/** "85585123456" → "085 123 456" */
export function formatPhone(normalized: string | null | undefined): string {
  if (!normalized) return '';
  const local = '0' + normalized.replace(/^855/, '');
  return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

/** Masks all but the first and last 3 characters: "012345678" → "012•••678". */
export function maskValue(value: string | null | undefined): string | null {
  if (!value) return value ?? null;
  if (value.length <= 6) return '•'.repeat(value.length);
  return `${value.slice(0, 3)}${'•'.repeat(value.length - 6)}${value.slice(-3)}`;
}
