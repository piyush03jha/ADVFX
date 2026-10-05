import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { validateEnvironment } from "./config/env.validation";

async function bootstrap() {
  validateEnvironment();
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });

  const shutdown = async () => {
    await app.close();
    process.exit(0);
  };

  process.once("SIGTERM", () => void shutdown());
  process.once("SIGINT", () => void shutdown());
}

void bootstrap();
