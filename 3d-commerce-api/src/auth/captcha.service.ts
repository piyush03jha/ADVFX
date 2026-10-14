import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';

const CAPTCHA_TTL_MS = 5 * 60 * 1000;
const PURPOSES = new Set(['login', 'register', 'forgot-password']);

export type CaptchaPurpose = 'login' | 'register' | 'forgot-password';

type CaptchaPayload = {
  nonce: string;
  expiresAt: number;
  purpose: CaptchaPurpose;
  proof: string;
  issuedAt: number;
};

type RecaptchaVerifyResponse = {
  success?: boolean;
  hostname?: string;
  'error-codes'?: string[];
};

@Injectable()
export class AuthCaptchaService {
  private readonly logger = new Logger(AuthCaptchaService.name);
  private readonly usedNonces = new Set<string>();

  issue(purpose: string) {
    if (!PURPOSES.has(purpose)) {
      throw new BadRequestException('Invalid CAPTCHA purpose.');
    }

    if (this.provider() === 'recaptcha') {
      const siteKey = process.env.RECAPTCHA_SITE_KEY?.trim() ?? '';
      if (!siteKey) throw new ServiceUnavailableException('Security check is not configured.');
      return { provider: 'recaptcha' as const, siteKey };
    }

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
      provider: 'math' as const,
      token: Buffer.from(
        JSON.stringify({ nonce, expiresAt, purpose: typedPurpose, proof, issuedAt }),
      ).toString('base64url'),
      first: left,
      second: right,
      operator: subtract ? ('−' as const) : ('+' as const),
    };
  }

  async verifyForAuth(token: string, answer: string | undefined, purpose: CaptchaPurpose): Promise<void> {
    if (this.provider() === 'recaptcha') {
      await this.verifyRecaptcha(token);
      return;
    }
    this.verify(token, answer ?? '', purpose);
  }

  private provider(): 'math' | 'recaptcha' {
    return process.env.AUTH_CAPTCHA_PROVIDER?.trim().toLowerCase() === 'recaptcha'
      ? 'recaptcha'
      : 'math';
  }

  private async verifyRecaptcha(token: string): Promise<void> {
    const secret = process.env.RECAPTCHA_SECRET_KEY?.trim();
    if (!secret) throw new ServiceUnavailableException('Security check is not configured.');
    if (!token || token.length > 4096) {
      throw new BadRequestException('Please complete the security check.');
    }

    let result: RecaptchaVerifyResponse;
    try {
      const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret, response: token }),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`reCAPTCHA siteverify returned HTTP ${response.status}`);
      result = (await response.json()) as RecaptchaVerifyResponse;
    } catch (error) {
      this.logger.error(`reCAPTCHA siteverify unavailable: ${String(error)}`);
      throw new ServiceUnavailableException('Security check is unavailable. Please try again.');
    }

    if (!result.success) {
      this.logger.warn(`reCAPTCHA rejected: ${(result['error-codes'] ?? []).join(',') || 'unknown'}`);
      throw new BadRequestException('Security check failed. Please try again.');
    }

    const expectedHostname = process.env.RECAPTCHA_EXPECTED_HOSTNAME?.trim().toLowerCase();
    if (expectedHostname && (result.hostname ?? '').toLowerCase() !== expectedHostname) {
      throw new BadRequestException('Security check failed. Please try again.');
    }
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

    const expected = Buffer.from(
      this.proof(Number(answer), payload.nonce, payload.expiresAt, purpose),
      'hex',
    );
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
      const value = JSON.parse(
        Buffer.from(token, 'base64url').toString('utf8'),
      ) as CaptchaPayload;

      return typeof value.nonce === 'string' &&
        typeof value.expiresAt === 'number' &&
        typeof value.purpose === 'string' &&
        typeof value.proof === 'string' &&
        typeof value.issuedAt === 'number'
        ? value
        : null;
    } catch {
      return null;
    }
  }

  private proof(
    answer: number,
    nonce: string,
    expiresAt: number,
    purpose: CaptchaPurpose,
  ) {
    return createHmac('sha256', this.secret())
      .update(`${answer}:${nonce}:${expiresAt}:${purpose}`)
      .digest('hex');
  }

  private secret() {
    const secret = process.env.AUTH_CAPTCHA_SECRET;
    if (!secret) throw new Error('AUTH_CAPTCHA_SECRET is not configured');
    return secret;
  }
}
