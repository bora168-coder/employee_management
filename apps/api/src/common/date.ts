/** "YYYY-MM-DD" → Date at UTC midnight (for @db.Date columns). */
export function toDbDate(value: string | null | undefined): Date | null {
  return value ? new Date(`${value}T00:00:00Z`) : null;
}

/** Date → "YYYY-MM-DD" */
export function fromDbDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}
