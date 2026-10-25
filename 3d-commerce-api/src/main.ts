import "dotenv/config";
import { Prisma } from "@prisma/client";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { validateEnvironment } from "./config/env.validation";
import { PrismaService } from "./prisma/prisma.service";
import multipart from "@fastify/multipart";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";

const AUTH_RATE_LIMITS: Record<string, number> = {
  "/auth/login": 10,
  "/auth/admin/login": 5,
  "/auth/google": 10,
  "/auth/register": 6,
  "/auth/forgot-password": 5,
  "/auth/resend-verification": 5,
};

async function bootstrap() {
  const env = validateEnvironment();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: env.nodeEnv !== "test",
      trustProxy: process.env.TRUST_PROXY === "true",
    }),
    { rawBody: true },
  );

  app.enableShutdownHooks();

  // PostgreSQL is already a required shared dependency, so use it for atomic
  // rate-limit buckets rather than allowing each API replica its own limits.
  const rateLimitPrisma = app.get(PrismaService);
  let lastRateLimitCleanupAt = 0;

  const maxUploadSizeMb = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 10);

  if (
    !Number.isFinite(maxUploadSizeMb) ||
    maxUploadSizeMb <= 0 ||
    maxUploadSizeMb > 1024
  ) {
    throw new Error("MAX_UPLOAD_SIZE_MB must be a positive value up to 1024 MB");
  }

  const rateLimitPerMinute = Number(
    process.env.API_RATE_LIMIT_PER_MINUTE ?? 120,
  );

  if (!Number.isFinite(rateLimitPerMinute) || rateLimitPerMinute <= 0) {
    throw new Error("API_RATE_LIMIT_PER_MINUTE must be a positive number");
  }

  if (env.nodeEnv === "production" && process.env.TRUST_PROXY !== "true") {
    app.getHttpAdapter().getInstance().log.warn(
      "TRUST_PROXY is disabled. Configure it when the API runs behind a trusted reverse proxy.",
    );
  }

  // Browser multipart endpoints currently accept images, not 3D source files.
  // Large model uploads use the signed multipart conversion flow instead.
  // Keep a hard cap here so a permissive environment variable cannot turn
  // toBuffer() handlers into multi-hundred-megabyte allocations.
  const multipartImageLimitMb = Math.min(maxUploadSizeMb, 25);
  await app.register(multipart, {
    limits: {
      fileSize: multipartImageLimitMb * 1024 * 1024,
      files: 1,
      fields: 20,
      parts: 21,
    },
  });

  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((value) => value.trim()).filter(Boolean)
    : [];

  app.enableCors({
    origin:
      corsOrigins.length > 0
        ? corsOrigins
        : env.nodeEnv === "development"
          ? true
          : false,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app
    .getHttpAdapter()
    .getInstance()
    .addHook("onRequest", async (request, reply) => {
      const requestId = String(request.id);

      // API security headers. The storefront has its own browser policy;
      // these headers protect API responses independently.
      reply
        .header("X-Content-Type-Options", "nosniff")
        .header("X-Frame-Options", "DENY")
        .header("Referrer-Policy", "strict-origin-when-cross-origin")
        .header(
          "Permissions-Policy",
          "camera=(), microphone=(), geolocation=(), payment=()",
        )
        .header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
        .header("X-Request-ID", requestId);

      if (env.nodeEnv === "production") {
        reply.header(
          "Strict-Transport-Security",
          "max-age=31536000; includeSubDomains",
        );
      }

      request.log.info(
        { requestId, method: request.method, url: request.url },
        "request.started",
      );

      const now = Date.now();

      // Razorpay webhooks are authenticated with their HMAC signature and
      // static asset delivery does not consume API rate-limit buckets.
      if (
        request.url.startsWith("/payments/razorpay/webhook") ||
        request.url.startsWith("/assets/") ||
        request.url.startsWith("/api/assets/")
      ) return;

      const routePath = request.routeOptions?.url ?? request.url.split("?")[0];
      const routeLimit = AUTH_RATE_LIMITS[routePath];
      const limit = routeLimit ?? rateLimitPerMinute;
      const bucketScope = routeLimit ? routePath : "global";
      const key = `${bucketScope}:${request.ip}`;

      // This upsert is atomic in PostgreSQL. Concurrent requests across API
      // replicas increment the same fixed-window counter without lost updates.
      const rows = await rateLimitPrisma.$queryRaw<Array<{ count: number }>>(
        Prisma.sql`
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
        `,
      );
      const count = rows[0]?.count ?? limit + 1;

      reply.header("X-RateLimit-Limit", limit);
      reply.header(
        "X-RateLimit-Remaining",
        Math.max(0, limit - count),
      );

      // Cleanup is best-effort and infrequent; expired buckets cannot affect
      // current enforcement because the upsert resets their 60-second window.
      if (now - lastRateLimitCleanupAt > 10 * 60 * 1000) {
        lastRateLimitCleanupAt = now;
        void rateLimitPrisma.$executeRaw(
          Prisma.sql`DELETE FROM "ApiRateLimitBucket" WHERE "updatedAt" < CURRENT_TIMESTAMP - INTERVAL '24 hours'`,
        ).catch((error) => {
          request.log.warn({ error }, "rate-limit cleanup failed");
        });
      }

      if (count > limit) {
        return reply
          .code(429)
          .header("Retry-After", "60")
          .send({ message: "Too many requests" });
      }
    });

  app
    .getHttpAdapter()
    .getInstance()
    .addHook("onResponse", async (request, reply) => {
      request.log.info(
        {
          requestId: String(request.id),
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
        },
        "request.completed",
      );
    });

  app
    .getHttpAdapter()
    .getInstance()
    .addHook("preSerialization", async (_request, _reply, payload) => {
      return JSON.parse(
        JSON.stringify(payload, (_key, value) =>
          typeof value === "bigint" ? value.toString() : value,
        ),
      );
    });

  await app.listen(env.port, "0.0.0.0");
}

bootstrap();
