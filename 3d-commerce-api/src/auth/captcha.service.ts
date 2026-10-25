import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
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

type TurnstileVerifyResponse = {
  success?: boolean;
  hostname?: string;
  action?: string;
  'error-codes'?: string[];
};

@Injectable()
export class AuthCaptchaService {
  private readonly logger = new Logger(AuthCaptchaService.name);
  private readonly usedNonces = new Map<string, number>();
  private verificationCount = 0;

  constructor(private readonly prisma: PrismaService) {}

  issue(purpose: string) {
    if (!PURPOSES.has(purpose)) {
      throw new BadRequestException('Invalid CAPTCHA purpose.');
    }

    if (this.provider() === 'turnstile') {
      const siteKey = process.env.TURNSTILE_SITE_KEY?.trim() ?? '';
      if (!siteKey) throw new ServiceUnavailableException('Security check is not configured.');
      return { provider: 'turnstile' as const, siteKey };
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
    if (this.provider() === 'turnstile') {
      await this.verifyTurnstile(token, purpose);
      return;
    }
    await this.verify(token, answer ?? '', purpose);
  }

  private provider(): 'math' | 'turnstile' {
    return process.env.AUTH_CAPTCHA_PROVIDER?.trim().toLowerCase() === 'turnstile'
      ? 'turnstile'
      : 'math';
  }

  private async verifyTurnstile(token: string, purpose: CaptchaPurpose): Promise<void> {
    const secret = (process.env.TURNSTILE_SECRET_KEY ?? process.env.TURNSTILE_SECRET)?.trim();
    if (!secret) throw new ServiceUnavailableException('Security check is not configured.');
    if (!token || token.length > 2048) {
      throw new BadRequestException('Please complete the security check.');
    }

    let result: TurnstileVerifyResponse;
    try {
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, response: token, idempotency_key: randomUUID() }),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`Turnstile siteverify returned HTTP ${response.status}`);
      result = (await response.json()) as TurnstileVerifyResponse;
    } catch (error) {
      this.logger.error(`Turnstile siteverify unavailable: ${String(error)}`);
      throw new ServiceUnavailableException('Security check is unavailable. Please try again.');
    }

    if (!result.success) {
      this.logger.warn(`Turnstile rejected: ${(result['error-codes'] ?? []).join(',') || 'unknown'}`);
      throw new BadRequestException('Security check failed. Please try again.');
    }
    if (result.action !== purpose) {
      throw new BadRequestException('Security check failed. Please try again.');
    }

    const hostnames = (process.env.TURNSTILE_HOSTNAMES ?? '')
      .split(',')
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean);
    if (hostnames.length && !hostnames.includes((result.hostname ?? '').toLowerCase())) {
      throw new BadRequestException('Security check failed. Please try again.');
    }
  }

  async verify(token: string, answer: string, purpose: CaptchaPurpose): Promise<void> {
    const payload = this.decode(token);
    if (!payload || payload.purpose !== purpose || payload.expiresAt <= Date.now()) {
      throw new BadRequestException('CAPTCHA has expired. Please try again.');
    }

    if (!/^\\d{1,2}$/.test(answer)) {
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

    if (process.env.DISTRIBUTED_CAPTCHA_REPLAY_ENABLED === 'true') {
      // PostgreSQL's primary key makes replay detection atomic across all API
      // replicas. Fail closed if the configured shared store cannot be reached.
      let inserted: { count: number };
      try {
        inserted = await this.prisma.authCaptchaNonce.createMany({
          data: [{ nonce: payload.nonce, expiresAt: new Date(payload.expiresAt) }],
          skipDuplicates: true,
        });
      } catch (error) {
        this.logger.error(`CAPTCHA replay store unavailable: ${String(error)}`);
        throw new ServiceUnavailableException('Security check is unavailable. Please try again.');
      }

      if (inserted.count !== 1) {
        throw new BadRequestException('CAPTCHA has already been used. Please try again.');
      }

      // Expired markers no longer contribute to replay protection; periodically
      // prune them without making successful verification depend on cleanup.
      this.verificationCount += 1;
      if (this.verificationCount % 128 === 0) {
        void this.prisma.authCaptchaNonce.deleteMany({
          where: { expiresAt: { lte: new Date() } },
        }).catch((error) => {
          this.logger.warn(`Unable to prune expired CAPTCHA markers: ${String(error)}`);
        });
      }
    } else {
      // Compatibility mode during migration rollout. Enable distributed replay
      // protection only after AuthCaptchaNonce has been created in PostgreSQL.
      const usedUntil = this.usedNonces.get(payload.nonce);
      if (usedUntil !== undefined && usedUntil > Date.now()) {
        throw new BadRequestException('CAPTCHA has already been used. Please try again.');
      }
      this.usedNonces.set(payload.nonce, payload.expiresAt);
      this.verificationCount += 1;
      if (this.verificationCount % 128 === 0) {
        const now = Date.now();
        for (const [nonce, expiresAt] of this.usedNonces) {
          if (expiresAt <= now) this.usedNonces.delete(nonce);
        }
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
