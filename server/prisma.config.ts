// Prisma CLI configuration. Replaces the deprecated `prisma` key in package.json.
// Prisma does not read .env on its own once this file exists, hence dotenv here.
import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
