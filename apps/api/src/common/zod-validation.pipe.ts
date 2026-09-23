import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodError, ZodTypeAny, z } from 'zod';

export function zodErrorDetails(error: ZodError) {
  return error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
}

/** Validates and transforms a request value with a shared Zod schema. */
export class ZodValidationPipe<T extends ZodTypeAny> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Some fields are not valid',
        details: zodErrorDetails(result.error),
      });
    }
    return result.data;
  }
}
