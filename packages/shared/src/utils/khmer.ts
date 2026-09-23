const KHMER_DIGITS = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];

/** Converts Latin digits to Khmer digits: "2024" → "២០២៤". */
export function toKhmerDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => KHMER_DIGITS[Number(d)]);
}

/** Converts Khmer digits to Latin digits: "២០២៤" → "2024". */
export function fromKhmerDigits(value: string): string {
  return value.replace(/[០-៩]/g, (d) => String(KHMER_DIGITS.indexOf(d)));
}

/** Formats an ISO date (YYYY-MM-DD) as dd/mm/yyyy, optionally in Khmer digits. */
export function formatDate(iso: string | Date | null | undefined, khmer = false): string {
  if (!iso) return '';
  const s = typeof iso === 'string' ? iso.slice(0, 10) : iso.toISOString().slice(0, 10);
  const [y, m, d] = s.split('-');
  if (!y || !m || !d) return '';
  const out = `${d}/${m}/${y}`;
  return khmer ? toKhmerDigits(out) : out;
}

export const KHMER_MONTHS = [
  'មករា',
  'កុម្ភៈ',
  'មីនា',
  'មេសា',
  'ឧសភា',
  'មិថុនា',
  'កក្កដា',
  'សីហា',
  'កញ្ញា',
  'តុលា',
  'វិច្ឆិកា',
  'ធ្នូ',
];

/** "1990-06-15" → "ថ្ងៃទី ១៥ ខែ មិថុនា ឆ្នាំ ១៩៩០" */
export function formatDateKhLong(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const s = typeof iso === 'string' ? iso.slice(0, 10) : iso.toISOString().slice(0, 10);
  const [y, m, d] = s.split('-');
  return `ថ្ងៃទី ${toKhmerDigits(d)} ខែ ${KHMER_MONTHS[Number(m) - 1]} ឆ្នាំ ${toKhmerDigits(y)}`;
}

/** Whole years between two dates. */
export function yearsBetween(from: string | Date, to: Date = new Date()): number {
  const f = new Date(from);
  let years = to.getUTCFullYear() - f.getUTCFullYear();
  const beforeBirthday =
    to.getUTCMonth() < f.getUTCMonth() ||
    (to.getUTCMonth() === f.getUTCMonth() && to.getUTCDate() < f.getUTCDate());
  if (beforeBirthday) years -= 1;
  return years;
}
