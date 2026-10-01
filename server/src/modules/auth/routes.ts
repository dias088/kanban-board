import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { loginSchema, registerSchema } from '@kanban/shared';
import { isTest } from '../../env';
import { asyncHandler } from '../../lib/asyncHandler';
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from '../../lib/cookies';
import { AppError, unauthorized } from '../../lib/errors';
import { currentUserId, requireAuth } from '../../middleware/requireAuth';
import { validate } from '../../middleware/validate';
import * as authService from './service';

/**
 * Brute-force protection for credential endpoints. Disabled under tests, where
 * dozens of logins happen in seconds and a 429 would only create flakiness.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => isTest,
  handler: (_req, _res, next) => {
    next(
      new AppError(
        429,
        'TOO_MANY_REQUESTS',
        'Too many authentication attempts, please try again later',
      ),
    );
  },
});

export const authRouter = Router();

authRouter.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const session = await authService.register(req.body);
    setRefreshCookie(res, session.refreshToken);
    res.status(201).json({ accessToken: session.accessToken, user: session.user });
  }),
);

authRouter.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const session = await authService.login(req.body);
    setRefreshCookie(res, session.refreshToken);
    res.json({ accessToken: session.accessToken, user: session.user });
  }),
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const token = readRefreshCookie(req);

    if (!token) {
      throw unauthorized('Refresh token cookie is missing');
    }

    const session = await authService.refreshSession(token);
    setRefreshCookie(res, session.refreshToken);
    res.json({ accessToken: session.accessToken, user: session.user });
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    await authService.logout(readRefreshCookie(req));
    clearRefreshCookie(res);
    res.status(204).send();
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await authService.getCurrentUser(currentUserId(req)));
  }),
);
