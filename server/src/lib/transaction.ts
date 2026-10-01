import { Prisma } from '@prisma/client';
import { prisma, type Db } from '../prisma';
import { conflict } from './errors';

const MAX_ATTEMPTS = 3;

/** Prisma maps PostgreSQL 40001 (serialization failure) and deadlocks to P2034. */
const WRITE_CONFLICT = 'P2034';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isWriteConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === WRITE_CONFLICT;
}

/**
 * Runs `work` in a SERIALIZABLE transaction, retrying when PostgreSQL aborts it
 * because of a concurrent write.
 *
 * SERIALIZABLE is what keeps two simultaneous moves from computing the same
 * midpoint, but it means the database is allowed to refuse a transaction and
 * ask for it again. Prisma does not retry on its own, so without this wrapper a
 * pair of concurrent drags would surface as a 500.
 */
export async function withSerializableRetry<T>(work: (tx: Db) => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (!isWriteConflict(error)) {
        throw error;
      }

      if (attempt === MAX_ATTEMPTS) {
        break;
      }

      // Short randomised backoff so retries do not collide again immediately
      await delay(attempt * 10 + Math.random() * 10);
    }
  }

  throw conflict('The board was changed concurrently, please try again');
}
