import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

const CAPTCHA_TTL_MS = 5 * 60 * 1000;
const PURPOSES = new Set(['login', 'register', 'forgot-password']);
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export type CaptchaPurpose = 'login' | 'register' | 'forgot-password';

type CaptchaPayload = {
  nonce: string;
  expiresAt: number;
  purpose: CaptchaPurpose;
  proof: string;
  issuedAt: number;
};

@Injectable()
export class AuthCaptchaService {
  private readonly usedNonces = new Set<string>();
  private readonly logger = new Logger(AuthCaptchaService.name);

  issue(purpose: string) {
    if (!PURPOSES.has(purpose)) throw new BadRequestException('Invalid CAPTCHA purpose.');

    const first = randomInt(1, 10);
    const second = randomInt(1, 10);
    const subtract = randomInt(0, 2) === 1;
    const left = subtract ? Math.max(first, second) : first;
    const right = subtract ? Math.min(first, second) : second;
    const answer = subtract ? left - right : left + right;
    const nonce = randomBytes(16).toString('base64url');
    const issuedAt = Date.now();
    const expiresAt = issuedAt + CAPTCHA_TTL_MS;
    const typedPurpose = purpose as CaptchaPurpose;
    const proof = this.proof(answer, nonce, expiresAt, typedPurpose);

    return {
      token: Buffer.from(JSON.stringify({ nonce, expiresAt, purpose: typedPurpose, proof, issuedAt })).toString('base64url'),
      first: left,
      second: right,
      operator: subtract ? ('−' as const) : ('+' as const),
    };
  }

  async verifyForAuth(token: string, answer: string | undefined, purpose: CaptchaPurpose) {
    if (this.provider() === 'turnstile') {
      await this.verifyTurnstile(token, purpose);
      return;
    }
    this.verify(token, answer ?? '', purpose);
  }

  private async verifyTurnstile(token: string, purpose: CaptchaPurpose) {
    if (!token || token.length > 4096) {
      throw new BadRequestException('Security check is invalid. Please try again.');
    }

    const secret = process.env.TURNSTILE_SECRET?.trim() || process.env.TURNSTILE_SECRET_KEY?.trim();
    if (!secret) {
      this.logger.error('Turnstile verification is not configured: missing secret.');
      throw new ServiceUnavailableException('Security check is temporarily unavailable.');
    }

    const expectedHostnames = this.allowedHostnames();
    if (expectedHostnames.size === 0) {
      this.logger.error(
        'Turnstile verification is not configured: set TURNSTILE_HOSTNAMES (or FRONTEND_URL / CORS_ORIGINS).',
      );
      throw new ServiceUnavailableException('Security check is temporarily unavailable.');
    }

    let response: Response;
    try {
      response = await this.postSiteverify(secret, token);
    } catch (firstError) {
      try {
        response = await this.postSiteverify(secret, token);
      } catch (error) {
        const cause = (error as { cause?: { code?: string; message?: string } })?.cause;
        this.logger.error('Turnstile Siteverify request failed', {
          purpose,
          error: error instanceof Error ? error.message : String(error),
          causeCode: cause?.code ?? null,
          causeMessage: cause?.message ?? null,
          firstAttempt: firstError instanceof Error ? firstError.name : String(firstError),
        });
        throw new BadRequestException('Security check could not be verified. Please try again.');
      }
    }

    if (!response.ok) {
      this.logger.warn('Turnstile Siteverify returned a non-success HTTP status', {
        purpose,
        status: response.status,
      });
      throw new BadRequestException('Security check could not be verified. Please try again.');
    }

    let result: {
      success?: boolean;
      action?: string;
      hostname?: string;
      'error-codes'?: string[];
    };

    try {
      result = (await response.json()) as typeof result;
    } catch (error) {
      this.logger.warn('Turnstile Siteverify returned invalid JSON', {
        purpose,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new BadRequestException('Security check could not be verified. Please try again.');
    }

    const errorCodes = Array.isArray(result['error-codes'])
      ? result['error-codes'].slice(0, 8)
      : [];

    if (!result.success) {
      if (errorCodes.includes('invalid-input-secret') || errorCodes.includes('missing-input-secret')) {
        this.logger.error('Turnstile secret key was rejected. Check TURNSTILE_SECRET_KEY matches the site key.', {
          purpose,
          errorCodes,
        });
        throw new ServiceUnavailableException('Security check is temporarily unavailable.');
      }

      this.logger.warn('Turnstile verification rejected the token', { purpose, errorCodes });

      if (errorCodes.includes('timeout-or-duplicate')) {
        throw new BadRequestException('Security check expired. Please complete it again.');
      }
      throw new BadRequestException('Security check failed. Please try again.');
    }

    const hostname = result.hostname?.trim().toLowerCase() || '';
    if (result.action !== purpose || !hostname || !expectedHostnames.has(hostname)) {
      this.logger.warn('Turnstile verification metadata mismatch', {
        purpose,
        receivedAction: result.action ?? null,
        receivedHostname: hostname || null,
        expectedHostnames: [...expectedHostnames],
      });
      throw new BadRequestException('Security check failed. Please try again.');
    }
  }

  private async postSiteverify(secret: string, token: string): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      return await fetch(TURNSTILE_VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret, response: token }).toString(),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private allowedHostnames(): Set<string> {
    const toHostname = (value: string) => {
      const trimmed = value.trim().toLowerCase();
      if (!trimmed) return '';
      try {
        return new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`).hostname;
      } catch {
        return '';
      }
    };

    const explicit = (process.env.TURNSTILE_HOSTNAMES ?? '')
      .split(',')
      .map(toHostname)
      .filter(Boolean);
    if (explicit.length > 0) return new Set(explicit);

    return new Set(
      [process.env.FRONTEND_URL ?? '', ...(process.env.CORS_ORIGINS ?? '').split(',')]
        .map(toHostname)
        .filter(Boolean),
    );
  }

  siteKey(): string | undefined {
    return process.env.TURNSTILE_SITE_KEY?.trim() || undefined;
  }

  provider(): 'math' | 'turnstile' {
    return process.env.AUTH_CAPTCHA_PROVIDER === 'turnstile' ? 'turnstile' : 'math';
  }

  verify(token: string, answer: string, purpose: CaptchaPurpose) {
    const payload = this.decode(token);
    if (!payload || payload.purpose !== purpose || payload.expiresAt <= Date.now()) {
      throw new BadRequestException('CAPTCHA has expired. Please try again.');
    }

    if (this.usedNonces.has(payload.nonce)) {
      throw new BadRequestException('CAPTCHA has already been used. Please try again.');
    }

    if (!/^\d{1,2}$/.test(answer)) {
      throw new BadRequestException('Incorrect CAPTCHA answer.');
    }

    const expected = Buffer.from(this.proof(Number(answer), payload.nonce, payload.expiresAt, purpose), 'hex');
    const provided = Buffer.from(payload.proof, 'hex');
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
      throw new BadRequestException('Incorrect CAPTCHA answer.');
    }

    this.usedNonces.add(payload.nonce);
    if (this.usedNonces.size > 10_000) {
      for (const nonce of this.usedNonces) {
        if (this.usedNonces.size <= 5_000) break;
        this.usedNonces.delete(nonce);
      }
    }
  }

  private decode(token: string): CaptchaPayload | null {
    if (!token || token.length > 1_024) return null;
    try {
      const value = JSON.parse(Buffer.from(token, 'base64url').toString('utf8')) as CaptchaPayload;
      return typeof value.nonce === 'string' && typeof value.expiresAt === 'number' &&
        typeof value.purpose === 'string' && typeof value.proof === 'string' && typeof value.issuedAt === 'number' ? value : null;
    } catch {
      return null;
    }
  }

  private proof(answer: number, nonce: string, expiresAt: number, purpose: CaptchaPurpose) {
    return createHmac('sha256', this.secret()).update(`${answer}:${nonce}:${expiresAt}:${purpose}`).digest('hex');
  }

  private secret() {
    const secret = process.env.AUTH_CAPTCHA_SECRET;
    if (!secret) throw new Error('AUTH_CAPTCHA_SECRET is not configured');
    return secret;
  }
}