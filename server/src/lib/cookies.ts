import type { CookieOptions, Request, Response } from 'express';
import { env, isProduction } from '../env';
import { REFRESH_TOKEN_TTL_DAYS } from './tokens';

export const REFRESH_COOKIE_NAME = 'refresh_token';

/**
 * The cookie is scoped to /api/auth so it is never attached to ordinary API
 * calls — only /refresh and /logout have any use for it.
 *
 * sameSite=none is only meaningful over HTTPS, and browsers drop such a cookie
 * when it is not Secure, so that combination is forced here.
 */
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction || env.COOKIE_SAMESITE === 'none',
  sameSite: env.COOKIE_SAMESITE,
  path: '/api/auth',
};

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...cookieOptions,
    maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions);
}

export function readRefreshCookie(req: Request): string | undefined {
  const value: unknown = req.cookies?.[REFRESH_COOKIE_NAME];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
