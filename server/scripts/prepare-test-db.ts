/**
 * Applies migrations to the test database (TEST_DATABASE_URL) before the suite
 * runs. Wired up through the npm `pretest` hook.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  console.error('TEST_DATABASE_URL is not set. Copy server/.env.example to server/.env first.');
  process.exit(1);
}

execSync('npx prisma migrate deploy', {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: testDatabaseUrl },
});
