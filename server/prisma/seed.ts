/**
 * Creates the demo account described in the README. Safe to re-run: the old
 * demo user is removed first and its boards go with it through the cascade.
 *
 *   npm run db:seed
 */
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password';
import { createSampleBoard } from '../src/lib/sampleBoard';

const DEMO_EMAIL = 'demo@kanban.dev';
const DEMO_PASSWORD = 'demo1234';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: 'Demo User',
      passwordHash: await hashPassword(DEMO_PASSWORD),
    },
  });

  await createSampleBoard(prisma, user.id);

  console.log(`Seeded ${DEMO_EMAIL} (password: ${DEMO_PASSWORD}) with a sample board.`);
}

main()
  .catch((error: unknown) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
