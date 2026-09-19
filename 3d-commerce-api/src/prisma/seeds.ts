import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, ProductMediaType, ProductStatus, UserRole } from '@prisma/client';
import { randomBytes, randomUUID, scrypt as scryptCallback } from 'node:crypto';

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

async function hashAdminPassword(password: string) {
  return new Promise<string>((resolve, reject) => {
    const salt = randomBytes(16);
    scryptCallback(
      password,
      salt,
      64,
      { N: 32_768, r: 8, p: 1 },
      (error, derivedKey) => {
        if (error) return reject(error);
        resolve([
          'scrypt',
          32_768,
          8,
          1,
          salt.toString('hex'),
          Buffer.from(derivedKey).toString('hex'),
        ].join('$'));
      },
    );
  });
}

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

  const admin = await prisma.user.findUniqueOrThrow({
    where: { email },
    select: { id: true },
  });

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length < 12) {
    throw new Error('ADMIN_PASSWORD must be configured with at least 12 characters');
  }

  const adminPasswordHash = await hashAdminPassword(adminPassword);
  await prisma.$executeRaw`
    INSERT INTO "AdminCredential" ("id","userId","passwordHash","createdAt","updatedAt")
    VALUES (${randomUUID()}, ${admin.id}, ${adminPasswordHash}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("userId")
    DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash", "updatedAt" = CURRENT_TIMESTAMP
  `;

  console.log(`Admin user seeded: ${email}`);

  // Development storefront fixture: one real catalog product powers the
  // home hero. The GLB is served by the frontend public directory until
  // object storage/R2 is introduced.
  const heroProduct = await prisma.product.upsert({
    where: { slug: 'cyber-warrior' },
    update: {
      name: 'Cyber Warrior',
      description:
        'A premium futuristic warrior physical collectible with a cinematic presentation-ready finish.',
      status: ProductStatus.ACTIVE,
      isFeatured: true,
    },
    create: {
      name: 'Cyber Warrior',
      slug: 'cyber-warrior',
      description:
        'A premium futuristic warrior physical collectible with a cinematic presentation-ready finish.',
      status: ProductStatus.ACTIVE,
      isFeatured: true,
    },
  });

  await prisma.productPrice.upsert({
    where: { id: 'dev-cyber-warrior-price' },
    update: {
      productId: heroProduct.id,
      currency: 'INR',
      amountMinor: 249900,
      isActive: true,
    },
    create: {
      id: 'dev-cyber-warrior-price',
      productId: heroProduct.id,
      currency: 'INR',
      amountMinor: 249900,
      isActive: true,
    },
  });

  await prisma.productMedia.deleteMany({
    where: {
      productId: heroProduct.id,
      type: ProductMediaType.MODEL_PREVIEW,
    },
  });

  await prisma.productMedia.create({
    data: {
      productId: heroProduct.id,
      type: ProductMediaType.MODEL_PREVIEW,
      url: '/models/products/1.glb',
      isPrimary: true,
      sortOrder: 0,
    },
  });

  console.log(`Hero product seeded: ${heroProduct.slug}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
