export function validateEnvironment() {
  const nodeEnv = process.env.NODE_ENV?.trim();

  if (!nodeEnv || !['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV must be explicitly set to development, test, or production');
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured');
  }

  if (nodeEnv !== 'test') {
    if (!process.env.RAZORPAY_KEY_ID) throw new Error('RAZORPAY_KEY_ID is not configured');
    if (!process.env.RAZORPAY_KEY_SECRET) throw new Error('RAZORPAY_KEY_SECRET is not configured');
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) throw new Error('RAZORPAY_WEBHOOK_SECRET is not configured');
  }

  if (process.env.AUTH_EXPOSE_DEV_TOKENS === 'true' && nodeEnv === 'production') {
    throw new Error('AUTH_EXPOSE_DEV_TOKENS must not be enabled in production');
  }

  const storageProvider = (process.env.STORAGE_PROVIDER ?? 'local').toLowerCase();
  if (!['local', 's3', 'r2'].includes(storageProvider)) {
    throw new Error('STORAGE_PROVIDER must be local, s3, or r2');
  }

  if (nodeEnv === 'production' && storageProvider === 'local') {
    throw new Error('Local filesystem storage is not allowed in production');
  }

  if (storageProvider !== 'local') {
    for (const key of [
      'STORAGE_BUCKET',
      'STORAGE_ENDPOINT',
      'STORAGE_ACCESS_KEY_ID',
      'STORAGE_SECRET_ACCESS_KEY',
      'STORAGE_PUBLIC_BASE_URL',
    ]) {
      if (!process.env[key]) throw new Error(`${key} must be configured for remote storage`);
    }
  }

  if (nodeEnv === 'production') {
    if (!process.env.CORS_ORIGINS) {
      throw new Error('CORS_ORIGINS must be configured in production');
    }

    if (process.env.CORS_ORIGINS.split(',').some((origin) => origin.trim() === '*')) {
      throw new Error('Wildcard CORS origin is not allowed in production');
    }

    if (!process.env.FRONTEND_URL) {
      throw new Error('FRONTEND_URL must be configured in production');
    }

    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY must be configured in production');
    }

    if (!process.env.AUTH_EMAIL_FROM) {
      throw new Error('AUTH_EMAIL_FROM must be configured in production');
    }

    if (!process.env.AUTH_CAPTCHA_SECRET || process.env.AUTH_CAPTCHA_SECRET.length < 32) {
      throw new Error('AUTH_CAPTCHA_SECRET must be at least 32 characters in production');
    }

    if (process.env.AUTH_EXPOSE_DEV_TOKENS === 'true') {
      throw new Error('AUTH_EXPOSE_DEV_TOKENS must be disabled in production');
    }
  }

  return {
    nodeEnv,
    port: Number(process.env.PORT ?? 3000),
  };
}
