import { PrismaClient } from '@prisma/client';
import { isTest } from './env';

export const prisma = new PrismaClient({
  log: isTest ? ['error'] : ['warn', 'error'],
});

export type Transaction = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];
