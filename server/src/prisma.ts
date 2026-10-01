import { PrismaClient, type Prisma } from '@prisma/client';
import { isTest } from './env';

export const prisma = new PrismaClient({
  log: isTest ? ['error'] : ['warn', 'error'],
});

/**
 * Accepted by every query helper so the same code works inside and outside a
 * transaction. PrismaClient satisfies this type, so `prisma` can be passed too.
 */
export type Db = Prisma.TransactionClient;
