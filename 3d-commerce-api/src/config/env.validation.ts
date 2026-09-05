export function validateEnvironment() {
  const nodeEnv = process.env.NODE_ENV ?? "development";

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!process.env.ADMIN_AUTH_SECRET) {
    throw new Error("ADMIN_AUTH_SECRET is not configured");
  }

  if (nodeEnv === "production") {
    if (process.env.ADMIN_AUTH_SECRET.length < 32) {
      throw new Error("ADMIN_AUTH_SECRET must be at least 32 characters in production");
    }

    if (!process.env.CORS_ORIGINS) {
      throw new Error("CORS_ORIGINS must be configured in production");
    }

    if (process.env.CORS_ORIGINS.split(",").some((origin) => origin.trim() === "*")) {
      throw new Error("Wildcard CORS origin is not allowed in production");
    }
  }

  return {
    nodeEnv,
    port: Number(process.env.PORT ?? 3000),
  };
}
