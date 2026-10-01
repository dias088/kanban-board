import type { Request, RequestHandler } from 'express';
import { unauthorized } from '../lib/errors';
import { verifyAccessToken } from '../lib/tokens';

const BEARER_PREFIX = 'Bearer ';

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith(BEARER_PREFIX)) {
    next(unauthorized('Missing bearer token'));
    return;
  }

  const userId = verifyAccessToken(header.slice(BEARER_PREFIX.length).trim());

  if (!userId) {
    next(unauthorized('Access token is invalid or expired'));
    return;
  }

  req.userId = userId;
  next();
};

/**
 * Reads the id that requireAuth stored. Keeps handlers free of non-null
 * assertions while still failing loudly if the middleware was forgotten.
 */
export function currentUserId(req: Request): string {
  if (!req.userId) {
    throw unauthorized();
  }

  return req.userId;
}
