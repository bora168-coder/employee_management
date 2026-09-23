import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ApiErrorBody } from '@csbms/shared';
import type { Response } from 'express';

const DEFAULT_CODES: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'FILE_TOO_LARGE',
  423: 'ACCOUNT_LOCKED',
  429: 'TOO_MANY_REQUESTS',
};

/**
 * Turns every error into the documented error format:
 * { statusCode, error, message, details? }. Internal details are never sent to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);
    if (body.statusCode >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }
    res.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ApiErrorBody {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const r = (typeof response === 'object' ? response : { message: response }) as {
        error?: string;
        message?: string | string[];
        details?: ApiErrorBody['details'];
      };
      const message = Array.isArray(r.message)
        ? r.message.join(', ')
        : (r.message ?? exception.message);
      const error =
        r.error && /^[A-Z_]+$/.test(r.error) ? r.error : (DEFAULT_CODES[status] ?? 'ERROR');
      return { statusCode: status, error, message, ...(r.details ? { details: r.details } : {}) };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        const target = (exception.meta?.target as string[] | undefined)?.join(', ') ?? 'value';
        return {
          statusCode: HttpStatus.CONFLICT,
          error: 'DUPLICATE',
          message: `This ${target} already exists`,
          details: (exception.meta?.target as string[] | undefined)?.map((field) => ({
            field,
            message: 'Already exists',
          })),
        };
      }
      if (exception.code === 'P2025') {
        return { statusCode: 404, error: 'NOT_FOUND', message: 'Record not found' };
      }
      if (exception.code === 'P2003') {
        return {
          statusCode: 409,
          error: 'IN_USE',
          message: 'This record is used by other records and cannot be changed or deleted',
        };
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again later.',
    };
  }
}
