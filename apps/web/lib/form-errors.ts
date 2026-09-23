import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from './api';

/**
 * Shows server validation errors next to the matching form fields.
 * Returns the messages that did not match a field (show them in an alert).
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: (field: string) => boolean = () => true,
): string | null {
  if (!(error instanceof ApiError)) return null;
  const leftovers: string[] = [];
  for (const d of error.body.details ?? []) {
    if (d.field && knownFields(d.field)) {
      setError(d.field as Path<T>, { type: 'server', message: d.message });
    } else {
      leftovers.push(d.message);
    }
  }
  if (!error.body.details?.length) return error.message;
  return leftovers.length ? leftovers.join(', ') : null;
}
