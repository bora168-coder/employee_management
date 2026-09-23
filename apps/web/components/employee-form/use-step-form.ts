'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { DefaultValues, FieldValues, Resolver, useForm } from 'react-hook-form';
import type { z } from 'zod';
import { applyServerErrors } from '@/lib/form-errors';

/** Shared logic of every form step: Zod validation, save, and server error display. */
export function useStepForm<S extends z.ZodTypeAny>(
  schema: S,
  defaultValues: z.input<S>,
  onSave: (data: z.output<S>) => Promise<void>,
) {
  const form = useForm<z.input<S> & FieldValues, unknown, z.output<S>>({
    resolver: zodResolver(schema) as unknown as Resolver<
      z.input<S> & FieldValues,
      unknown,
      z.output<S>
    >,
    defaultValues: defaultValues as DefaultValues<z.input<S> & FieldValues>,
  });
  const [error, setError] = useState<string | null>(null);

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await onSave(values);
    } catch (e) {
      // Only leaf inputs can show an error; group errors (e.g. "birthPlace") go to the alert.
      const isInput = (field: string) => {
        const v: unknown = form.getValues(field as never);
        return v !== undefined && (v === null || typeof v !== 'object');
      };
      setError(applyServerErrors(e, form.setError, isInput) ?? null);
    }
  });

  return { form, submit, error, saving: form.formState.isSubmitting };
}

export interface StepProps<T> {
  onSave: (data: T) => Promise<void>;
  onBack?: () => void;
  readOnly?: boolean;
}

/** Reads a nested error message like errors.educations[0].endDate.message */
export function errorAt(errors: unknown, path: string): string | undefined {
  let cur: unknown = errors;
  for (const part of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  const msg = (cur as { message?: unknown } | undefined)?.message;
  return typeof msg === 'string' ? msg : undefined;
}
