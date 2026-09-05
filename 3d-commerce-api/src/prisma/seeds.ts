import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not configured');
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();

  if (!email) {
    throw new Error('ADMIN_EMAIL is not configured');
  }

  await prisma.user.upsert({
    where: { email },
    update: {
      role: UserRole.ADMIN,
      isActive: true,
    },
    create: {
      email,
      name: process.env.ADMIN_NAME ?? 'Administrator',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log(`Admin user seeded: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });