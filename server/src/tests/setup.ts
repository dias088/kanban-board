/**
 * Shared test setup: a dedicated database plus a clean slate before each case.
 *
 * DATABASE_URL is swapped before PrismaClient is first imported, which is why
 * prisma is imported dynamically inside the hooks instead of at module scope.
 */
import path from 'node:path';
import dotenv from 'dotenv';
import { afterAll, beforeEach } from 'vitest';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is not set — see server/.env.example');
}

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const TABLES = ['refresh_tokens', 'cards', 'columns', 'boards', 'users'] as const;

beforeEach(async () => {
  const { prisma } = await import('../prisma');
  const list = TABLES.map((table) => `"${table}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
});

afterAll(async () => {
  const { prisma } = await import('../prisma');
  await prisma.$disconnect();
});
