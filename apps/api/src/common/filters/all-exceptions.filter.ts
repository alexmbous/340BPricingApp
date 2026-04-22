import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

import type { ProblemDetails, FieldError } from '@apexcare/shared-types';

// Global error filter. Emits RFC 7807 problem details for every error.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { id?: string }>();
    const problem = this.buildProblem(exception, req);

    // Structured log — never include request body (may contain PHI/creds)
    this.logger.error({
      msg: 'request_error',
      status: problem.status,
      code: problem.code,
      path: req.url,
      method: req.method,
      requestId: req.id,
      err: exception instanceof Error ? exception.message : String(exception),
    });

    res.status(problem.status).type('application/problem+json').json(problem);
  }

  private buildProblem(exception: unknown, req: Request & { id?: string }): ProblemDetails {
    // 1) Our validation / HttpException path
    if (exception instanceof BadRequestException) {
      const resp = exception.getResponse() as string | { message?: unknown; errors?: unknown };
      const errors = extractFieldErrors(resp);
      return {
        type: 'https://apexcare.health/errors/validation',
        title: 'Validation failed',
        status: 400,
        code: 'VALIDATION_ERROR',
        errors,
        instance: req.url,
        traceId: req.id,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const resp = exception.getResponse();
      const detail = typeof resp === 'string' ? resp : (resp as { message?: string }).message;
      return {
        type: `https://apexcare.health/errors/${httpStatusSlug(status)}`,
        title: httpStatusTitle(status),
        status,
        detail: typeof detail === 'string' ? detail : undefined,
        code: (resp as { code?: string }).code,
        instance: req.url,
        traceId: req.id,
      };
    }

    // 2) Prisma known request errors → map to 4xx where appropriate
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return {
          type: 'https://apexcare.health/errors/conflict',
          title: 'Conflict',
          status: HttpStatus.CONFLICT,
          detail: 'A record with the same unique value already exists.',
          code: 'UNIQUE_CONSTRAINT',
          instance: req.url,
          traceId: req.id,
        };
      }
      if (exception.code === 'P2025') {
        return {
          type: 'https://apexcare.health/errors/not-found',
          title: 'Not Found',
          status: HttpStatus.NOT_FOUND,
          code: 'NOT_FOUND',
          instance: req.url,
          traceId: req.id,
        };
      }
    }

    // 3) Fallback — never leak internals
    return {
      type: 'about:blank',
      title: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL',
      instance: req.url,
      traceId: req.id,
    };
  }
}

function extractFieldErrors(resp: unknown): FieldError[] {
  if (!resp || typeof resp !== 'object') return [];
  const withErrors = resp as { errors?: unknown; message?: unknown };
  if (Array.isArray(withErrors.errors)) {
    return withErrors.errors.filter((e): e is FieldError => typeof e === 'object' && e !== null);
  }
  if (Array.isArray(withErrors.message)) {
    return (withErrors.message as string[]).map((m) => ({ field: '', message: m }));
  }
  return [];
}

function httpStatusSlug(status: number): string {
  return httpStatusTitle(status).toLowerCase().replace(/\s+/g, '-');
}

function httpStatusTitle(status: number): string {
  switch (status) {
    case 400: return 'Bad Request';
    case 401: return 'Unauthorized';
    case 403: return 'Forbidden';
    case 404: return 'Not Found';
    case 409: return 'Conflict';
    case 422: return 'Unprocessable Entity';
    case 429: return 'Too Many Requests';
    case 500: return 'Internal Server Error';
    default: return `HTTP ${status}`;
  }
}
