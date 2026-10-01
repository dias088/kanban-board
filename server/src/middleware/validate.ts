import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { badRequest } from '../lib/errors';

type ValidationSource = 'body' | 'params' | 'query';

/**
 * Validates one part of the request and replaces it with the parsed value, so
 * handlers receive trimmed and coerced data rather than raw input.
 */
export function validate(schema: ZodType, source: ValidationSource = 'body'): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      next(badRequest('Request validation failed', result.error.flatten().fieldErrors));
      return;
    }

    switch (source) {
      case 'body':
        req.body = result.data;
        break;
      case 'params':
        req.params = result.data as typeof req.params;
        break;
      case 'query':
        req.query = result.data as typeof req.query;
        break;
    }

    next();
  };
}
