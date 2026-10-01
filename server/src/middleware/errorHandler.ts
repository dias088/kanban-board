import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, type ErrorCode } from '../lib/errors';
import { isProduction, isTest } from '../env';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} does not exist` },
  });
};

type BodyParserError = Error & { status?: number; type?: string };

/**
 * Central error handler. Must be registered last, after every route.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // A ZodError that escaped the validate middleware (e.g. thrown in a service)
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR' satisfies ErrorCode,
        message: 'Request validation failed',
        details: err.flatten().fieldErrors,
      },
    });
    return;
  }

  // express.json() throws these for malformed JSON and oversized bodies
  const bodyParserError = err as BodyParserError;
  if (bodyParserError?.type === 'entity.too.large') {
    res.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE' satisfies ErrorCode,
        message: 'Request body is too large',
      },
    });
    return;
  }
  if (bodyParserError?.type === 'entity.parse.failed') {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR' satisfies ErrorCode,
        message: 'Request body is not valid JSON',
      },
    });
    return;
  }

  if (!isTest) {
    console.error('Unhandled error:', err);
  }

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR' satisfies ErrorCode,
      message: isProduction ? 'Internal server error' : String(bodyParserError?.message ?? err),
    },
  });
};
