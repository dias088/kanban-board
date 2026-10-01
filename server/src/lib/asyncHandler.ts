import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/**
 * Express 4 does not forward a rejected promise to the error handler, so every
 * async route is wrapped to keep error handling in one place.
 */
export const asyncHandler =
  (handler: AsyncRequestHandler): RequestHandler =>
  (req, res, next) => {
    handler(req, res, next).catch(next);
  };
