export function validateEnvironment() {
  const nodeEnv = process.env.NODE_ENV?.trim();

  if (!nodeEnv || !['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV must be explicitly set to development, test, or production');
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');

  if (nodeEnv !== 'test') {
    if (!process.env.RAZORPAY_KEY_ID) throw new Error('RAZORPAY_KEY_ID is not configured');
    if (!process.env.RAZORPAY_KEY_SECRET) throw new Error('RAZORPAY_KEY_SECRET is not configured');
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) throw new Error('RAZORPAY_WEBHOOK_SECRET is not configured');
    if (nodeEnv === 'production' && !process.env.RAZORPAY_KEY_ID.startsWith('rzp_live_')) {
      throw new Error('RAZORPAY_KEY_ID must be a live key (rzp_live_) in production');
    }
  }

  if (process.env.AUTH_EXPOSE_DEV_TOKENS === 'true' && nodeEnv === 'production') {
    throw new Error('AUTH_EXPOSE_DEV_TOKENS must not be enabled in production');
  }

  const storageProvider = (process.env.STORAGE_PROVIDER ?? 'local').toLowerCase();
  if (!['local', 's3', 'r2', 'b2'].includes(storageProvider)) {
    throw new Error('STORAGE_PROVIDER must be local, s3, r2, or b2');
  }
  if (nodeEnv === 'production' && storageProvider === 'local') {
    throw new Error('Local filesystem storage is not allowed in production');
  }

  if (storageProvider !== 'local') {
    const requiredStorageKeys = [
      'STORAGE_BUCKET',
      'STORAGE_ENDPOINT',
      'STORAGE_ACCESS_KEY_ID',
      'STORAGE_SECRET_ACCESS_KEY',
      'STORAGE_REGION',
    ] as const;

    for (const key of requiredStorageKeys) {
      if (!process.env[key]) {
        throw new Error(`${key} must be configured for remote storage`);
      }
    }

    const endpoint = process.env.STORAGE_ENDPOINT?.trim();
    if (!endpoint) {
      throw new Error('STORAGE_ENDPOINT must be configured for remote storage');
    }

    if (!/^https:\/\//i.test(endpoint)) {
      throw new Error('STORAGE_ENDPOINT must be an HTTPS URL for remote storage');
    }

    const bucket = process.env.STORAGE_BUCKET!.trim();
    if (/[/:]/.test(bucket)) {
      throw new Error('STORAGE_BUCKET must be the bucket name only (no URL or slashes)');
    }

    let endpointUrl: URL;
    try {
      endpointUrl = new URL(endpoint);
    } catch {
      throw new Error('STORAGE_ENDPOINT is not a valid URL');
    }

    if (endpointUrl.pathname !== '/' && endpointUrl.pathname !== '') {
      throw new Error('STORAGE_ENDPOINT must not include a path or the bucket name');
    }

    const b2Host = /^s3\.([a-z0-9-]+)\.backblazeb2\.com$/i.exec(endpointUrl.hostname);
    if (b2Host && b2Host[1].toLowerCase() !== process.env.STORAGE_REGION!.trim().toLowerCase()) {
      throw new Error(
        `STORAGE_REGION must be "${b2Host[1]}" to match the Backblaze B2 endpoint ${endpointUrl.hostname}`,
      );
    }

    if (endpointUrl.hostname.toLowerCase().startsWith(`${bucket.toLowerCase()}.`)) {
      throw new Error('STORAGE_ENDPOINT must be the regional S3 endpoint, not the bucket-specific hostname');
    }
  }

  if (nodeEnv === 'production') {
    if (!process.env.CORS_ORIGINS) throw new Error('CORS_ORIGINS must be configured in production');
    if (process.env.CORS_ORIGINS.split(',').some((origin) => origin.trim() === '*')) {
      throw new Error('Wildcard CORS origin is not allowed in production');
    }
    if (!process.env.FRONTEND_URL) throw new Error('FRONTEND_URL must be configured in production');
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY must be configured in production');
    if (!process.env.AUTH_EMAIL_FROM) throw new Error('AUTH_EMAIL_FROM must be configured in production');
    if (!process.env.AUTH_CAPTCHA_SECRET || process.env.AUTH_CAPTCHA_SECRET.length < 32) {
      throw new Error('AUTH_CAPTCHA_SECRET must be at least 32 characters in production');
    }
    if (process.env.AUTH_EXPOSE_DEV_TOKENS === 'true') {
      throw new Error('AUTH_EXPOSE_DEV_TOKENS must be disabled in production');
    }
  }

  return { nodeEnv, port: Number(process.env.PORT ?? 3000) };
}
