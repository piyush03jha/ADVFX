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
      { N: 32_768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
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

async function seedAdmin(email: string, name: string, password: string) {
  const normalizedEmail = email.toLowerCase().trim();

  const admin = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: { role: UserRole.ADMIN, isActive: true, name },
    create: {
      email: normalizedEmail,
      name,
      role: UserRole.ADMIN,
      isActive: true,
    },
    select: { id: true },
  });

  const adminPasswordHash = await hashAdminPassword(password);
  await prisma.$executeRaw`
    INSERT INTO "AdminCredential" ("id","userId","passwordHash","createdAt","updatedAt")
    VALUES (${randomUUID()}, ${admin.id}, ${adminPasswordHash}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("userId")
    DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash", "updatedAt" = CURRENT_TIMESTAMP
  `;

  console.log(`Admin user seeded: ${normalizedEmail}`);
}

async function main() {
  const adminConfigs = [
    {
      email: process.env.ADMIN_EMAIL,
      name: process.env.ADMIN_NAME ?? 'Administrator',
      password: process.env.ADMIN_PASSWORD,
    },
    {
      email: process.env.ADMIN_EMAIL_2,
      name: process.env.ADMIN_NAME_2 ?? 'Administrator 2',
      password: process.env.ADMIN_PASSWORD_2,
    },
  ];

  const configuredAdmins = adminConfigs.filter((admin) => admin.email || admin.password);
  if (configuredAdmins.length === 0) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are not configured');
  }

  if (configuredAdmins.some((admin) => !admin.email || !admin.password)) {
    throw new Error('Each configured admin must have both an email and password');
  }

  if (configuredAdmins.some((admin) => (admin.password?.length ?? 0) < 12)) {
    throw new Error('Every admin password must be at least 12 characters');
  }

  const existingAdminCount = await prisma.user.count({ where: { role: UserRole.ADMIN } });
  const configuredEmails = new Set(configuredAdmins.map((admin) => admin.email!.toLowerCase().trim()));
  const existingUnconfiguredAdmins = await prisma.user.count({
    where: {
      role: UserRole.ADMIN,
      email: { notIn: [...configuredEmails] },
    },
  });

  if (existingUnconfiguredAdmins > 2 - configuredAdmins.length) {
    throw new Error('The application supports a maximum of 2 admin users. Remove extra admin accounts before seeding.');
  }

  if (existingAdminCount > 2) {
    throw new Error('The application supports a maximum of 2 admin users. Remove extra admin accounts before seeding.');
  }

  for (const admin of configuredAdmins) {
    await seedAdmin(admin.email!, admin.name, admin.password!);
  }

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
