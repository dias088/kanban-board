import bcrypt from 'bcrypt';
import { isTest } from '../env';

/**
 * 12 rounds everywhere except tests. Almost every test case creates an
 * account, and 12 rounds there would add minutes of CPU time for no benefit.
 */
const SALT_ROUNDS = isTest ? 4 : 12;

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, SALT_ROUNDS);

export const verifyPassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);
