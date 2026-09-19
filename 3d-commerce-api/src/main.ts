import "dotenv/config";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { validateEnvironment } from "./config/env.validation";
import multipart from "@fastify/multipart";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";

interface RateLimitState {
  startedAt: number;
  count: number;
}

const rateLimitState = new Map<string, RateLimitState>();
const RATE_LIMIT_PRODUCTION_WARNING =
  "API_RATE_LIMIT_PER_MINUTE uses process-local memory; production should also enforce shared edge/API rate limiting. Auth endpoints have stricter local limits below.";
const AUTH_RATE_LIMITS: Record<string, number> = {
  "/auth/login": 10,
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

  const maxUploadSizeMb = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 50);

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

  await app.register(multipart, {
    limits: {
      fileSize: maxUploadSizeMb * 1024 * 1024,
      files: 100,
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
      const now = Date.now();

      // Razorpay webhooks are already authenticated with their HMAC signature
      // and must not share the public request bucket.
      if (request.url.startsWith("/payments/razorpay/webhook")) return;

      const routeLimit = AUTH_RATE_LIMITS[request.routerPath ?? request.url.split("?")[0]];
      const limit = routeLimit ?? rateLimitPerMinute;
      const bucketScope = routeLimit ? (request.routerPath ?? request.url.split("?")[0]) : "global";
      const key = `${bucketScope}:${request.ip}`;
      const current = rateLimitState.get(key);

      const next: RateLimitState =
        !current || now - current.startedAt >= 60_000
          ? { startedAt: now, count: 1 }
          : {
              startedAt: current.startedAt,
              count: current.count + 1,
            };

      rateLimitState.set(key, next);

      if (rateLimitState.size > 10_000) {
        const cutoff = now - 60_000;

        for (const [stateKey, state] of rateLimitState) {
          if (state.startedAt < cutoff) {
            rateLimitState.delete(stateKey);
          }
        }
      }

      reply.header("X-RateLimit-Limit", limit);

      reply.header(
        "X-RateLimit-Remaining",
        Math.max(0, limit - next.count),
      );

      if (next.count > limit) {
        reply
          .code(429)
          .header("Retry-After", "60")
          .send({ message: "Too many requests" });
      }
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
