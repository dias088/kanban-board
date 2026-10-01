import type { Request } from 'express';
import { z } from 'zod';
import { badRequest } from './errors';

export const idParams = z.object({ id: z.string().uuid() });
export const boardIdParams = z.object({ boardId: z.string().uuid() });
export const columnIdParams = z.object({ columnId: z.string().uuid() });

/**
 * Reads a path parameter as a plain string. Express types params as an open
 * dictionary, so under noUncheckedIndexedAccess every read would otherwise be
 * `string | undefined` and litter the handlers with checks.
 */
export function pathParam(req: Request, name: string): string {
  const value = req.params[name];

  if (typeof value !== 'string' || value.length === 0) {
    throw badRequest(`Missing path parameter: ${name}`);
  }

  return value;
}
