import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const integrationDescribe =
  process.env.RUN_POSTGRES_INTEGRATION_TESTS === "true" ? describe : describe.skip;

integrationDescribe("PostgreSQL reliability invariants", () => {
  let db: PrismaService;

  beforeAll(async () => {
    db = new PrismaService();
    await db.$connect();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("increments a shared rate-limit bucket atomically across concurrent requests", async () => {
    const key = `integration:${randomUUID()}`;
    const requests = 24;
    try {
      await Promise.all(Array.from({ length: requests }, () =>
        db.$queryRaw<Array<{ count: number }>>(Prisma.sql`
          INSERT INTO "ApiRateLimitBucket" ("key", "startedAt", "count", "updatedAt")
          VALUES (${key}, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP)
          ON CONFLICT ("key") DO UPDATE SET
            "count" = CASE
              WHEN "ApiRateLimitBucket"."startedAt" <= CURRENT_TIMESTAMP - INTERVAL '60 seconds'
                THEN 1
              ELSE "ApiRateLimitBucket"."count" + 1
            END,
            "startedAt" = CASE
              WHEN "ApiRateLimitBucket"."startedAt" <= CURRENT_TIMESTAMP - INTERVAL '60 seconds'
                THEN CURRENT_TIMESTAMP
              ELSE "ApiRateLimitBucket"."startedAt"
            END,
            "updatedAt" = CURRENT_TIMESTAMP
          RETURNING "count"
        `),
      ));

      const row = await db.apiRateLimitBucket.findUnique({ where: { key } });
      expect(row?.count).toBe(requests);
    } finally {
      await db.apiRateLimitBucket.deleteMany({ where: { key } });
    }
  });

  it("accepts only one concurrent CAPTCHA nonce insert", async () => {
    const nonce = `integration-${randomUUID()}`;
    try {
      const results = await Promise.all(Array.from({ length: 12 }, () =>
        db.authCaptchaNonce.createMany({
          data: [{ nonce, expiresAt: new Date(Date.now() + 60_000) }],
          skipDuplicates: true,
        }),
      ));

      expect(results.reduce((sum, result) => sum + result.count, 0)).toBe(1);
      expect(await db.authCaptchaNonce.count({ where: { nonce } })).toBe(1);
    } finally {
      await db.authCaptchaNonce.deleteMany({ where: { nonce } });
    }
  });

  it("prevents concurrent inventory reservations from overselling the last unit", async () => {
    const product = await db.product.create({
      data: {
        name: "Inventory race integration fixture",
        slug: `inventory-race-${randomUUID()}`,
        status: "ACTIVE",
      },
    });

    try {
      const inventory = await db.productInventory.create({
        data: {
          productId: product.id,
          stock: 1,
          reserved: 0,
          trackStock: true,
          allowBackorder: false,
        },
      });

      const results = await Promise.all([1, 2].map(() =>
        db.$transaction((tx) => tx.$executeRaw(Prisma.sql`
          UPDATE "ProductInventory"
          SET "reserved" = "reserved" + 1
          WHERE "id" = ${inventory.id}
            AND "trackStock" = true
            AND "allowBackorder" = false
            AND ("stock" - "reserved") >= 1
        `)),
      ));

      expect(results.map(Number).reduce((sum, count) => sum + count, 0)).toBe(1);
      const finalInventory = await db.productInventory.findUnique({ where: { id: inventory.id } });
      expect(finalInventory?.stock).toBe(1);
      expect(finalInventory?.reserved).toBe(1);
    } finally {
      await db.product.deleteMany({ where: { id: product.id } });
    }
  });

  it("deduplicates concurrent product-view events by the database unique key", async () => {
    const product = await db.product.create({
      data: {
        name: "Product view race integration fixture",
        slug: `product-view-race-${randomUUID()}`,
        status: "ACTIVE",
      },
    });
    const visitorHash = randomUUID();
    const bucketStart = new Date();
    bucketStart.setUTCHours(0, 0, 0, 0);

    try {
      const results = await Promise.all(Array.from({ length: 12 }, () =>
        db.productViewEvent.createMany({
          data: [{ productId: product.id, visitorHash, bucketStart }],
          skipDuplicates: true,
        }),
      ));

      expect(results.reduce((sum, result) => sum + result.count, 0)).toBe(1);
      expect(await db.productViewEvent.count({
        where: { productId: product.id, visitorHash, bucketStart },
      })).toBe(1);
    } finally {
      await db.product.deleteMany({ where: { id: product.id } });
    }
  });
});
