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

async function bootstrap() {
  const env = validateEnvironment();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: env.nodeEnv !== "test",
    }),
  );

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

  await app.register(multipart, {
    limits: {
      fileSize: maxUploadSizeMb * 1024 * 1024,
      files: 100,
    },
  });

  app.enableCors({
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : env.nodeEnv === "production"
        ? false
        : true,
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
      const key = request.ip;
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

      reply.header("X-RateLimit-Limit", rateLimitPerMinute);

      reply.header(
        "X-RateLimit-Remaining",
        Math.max(0, rateLimitPerMinute - next.count),
      );

      if (next.count > rateLimitPerMinute) {
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