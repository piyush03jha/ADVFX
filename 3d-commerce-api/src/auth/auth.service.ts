import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { PrismaService } from '../prisma/prisma.service';
import type { UserRole } from '@prisma/client';
import type { AuthenticatedUser } from './auth.types';
import { AuthEmailService } from './email.service';

const scrypt = promisify(scryptCallback);
const CUSTOMER_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24;
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: AuthEmailService,
  ) {}

  async registerCustomer(name: string, email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();
    const passwordHash = await hashPassword(password);

    const user = await this.prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      });
      if (existingUser) throw new ConflictException('An account with this email already exists.');

      const created = await tx.user.create({
        data: {
          email: normalizedEmail,
          name: normalizedName,
          role: 'CUSTOMER',
          isActive: true,
        },
        select: { id: true, email: true, name: true, role: true },
      });

      await tx.$executeRaw`
        INSERT INTO "CustomerCredential" ("id", "userId", "passwordHash", "createdAt", "updatedAt")
        VALUES (${randomUUID()}, ${created.id}, ${passwordHash}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      return created;
    });

    const verificationToken = await this.createEmailVerificationToken(user.id);
    await this.emailService.sendVerificationEmail(user.email, verificationToken);

    return {
      user: this.serializeUser(user),
      verificationRequired: true,
      ...this.developmentToken('emailVerificationToken', verificationToken),
    };
  }

  async customerLogin(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    if (!user || !user.isActive || user.role !== ('CUSTOMER' as UserRole)) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const credentials = await this.prisma.$queryRaw<Array<{ passwordHash: string }>>`
      SELECT "passwordHash" FROM "CustomerCredential" WHERE "userId" = ${user.id} LIMIT 1
    `;
    if (!credentials[0] || !(await verifyPassword(password, credentials[0].passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const verification = await this.prisma.$queryRaw<Array<{ emailVerifiedAt: Date | null }>>`
      SELECT "emailVerifiedAt" FROM "User" WHERE "id" = ${user.id} LIMIT 1
    `;
    if (!verification[0]?.emailVerifiedAt) {
      throw new UnauthorizedException('Email verification is required before signing in.');
    }

    return this.createCustomerSession(user);
  }

  async authenticateCustomer(token: string): Promise<AuthenticatedUser> {
    if (!token || token.length > 256) throw new UnauthorizedException('Invalid or expired session');

    const sessions = await this.prisma.$queryRaw<Array<{ userId: string }>>`
      SELECT "userId" FROM "CustomerAuthSession"
      WHERE "tokenHash" = ${hashSessionToken(token)}
        AND "revokedAt" IS NULL AND "expiresAt" > CURRENT_TIMESTAMP
      LIMIT 1
    `;
    const session = sessions[0];
    if (!session) throw new UnauthorizedException('Invalid or expired session');

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
    if (!user || !user.isActive || user.role !== ('CUSTOMER' as UserRole)) {
      await this.revokeCustomerSession(hashSessionToken(token));
      throw new UnauthorizedException('User account is inactive');
    }
    return this.serializeUser(user);
  }

  async customerLogout(token: string) {
    if (token) await this.revokeCustomerSession(hashSessionToken(token));
    return { message: 'Signed out successfully' };
  }

  async verifyCustomerEmail(token: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; userId: string }>>`
      SELECT "id", "userId" FROM "AuthVerificationToken"
      WHERE "tokenHash" = ${hashSessionToken(token)}
        AND "usedAt" IS NULL AND "expiresAt" > CURRENT_TIMESTAMP
      LIMIT 1
    `;
    const record = rows[0];
    if (!record) throw new UnauthorizedException('Invalid or expired verification token.');

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE "User" SET "emailVerifiedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${record.userId}
      `;
      await tx.$executeRaw`
        UPDATE "AuthVerificationToken" SET "usedAt" = CURRENT_TIMESTAMP WHERE "userId" = ${record.userId}
      `;
    });
    return { message: 'Email verified successfully.' };
  }

  async forgotCustomerPassword(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return { message: 'If the account exists, password reset instructions have been sent.' };
    }

    const token = await this.createPasswordResetToken(user.id);
    await this.emailService.sendPasswordResetEmail(user.email, token);

    return {
      message: 'If the account exists, password reset instructions have been sent.',
      ...this.developmentToken('passwordResetToken', token),
    };
  }

  async resetCustomerPassword(token: string, password: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; userId: string }>>`
      SELECT "id", "userId" FROM "AuthPasswordResetToken"
      WHERE "tokenHash" = ${hashSessionToken(token)}
        AND "usedAt" IS NULL AND "expiresAt" > CURRENT_TIMESTAMP
      LIMIT 1
    `;
    const record = rows[0];
    if (!record) throw new UnauthorizedException('Invalid or expired password reset token.');

    const passwordHash = await hashPassword(password);
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE "CustomerCredential" SET "passwordHash" = ${passwordHash}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "userId" = ${record.userId}
      `;
      await tx.$executeRaw`
        UPDATE "AuthPasswordResetToken" SET "usedAt" = CURRENT_TIMESTAMP WHERE "id" = ${record.id}
      `;
      await tx.$executeRaw`
        UPDATE "CustomerAuthSession" SET "revokedAt" = CURRENT_TIMESTAMP
        WHERE "userId" = ${record.userId} AND "revokedAt" IS NULL
      `;
    });
    return { message: 'Password reset successfully.' };
  }

  async login(email: string, secret: string) {
    const expectedSecret = process.env.ADMIN_AUTH_SECRET;
    if (!expectedSecret) throw new Error('ADMIN_AUTH_SECRET is not configured');
    if (!safeSecretEqual(secret, expectedSecret)) throw new UnauthorizedException('Invalid credentials');

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
    if (!user || !user.isActive || user.role !== ('ADMIN' as UserRole)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_MS);
    await this.prisma.$executeRaw`
      INSERT INTO "AdminAuthSession" ("id", "tokenHash", "userId", "expiresAt", "createdAt")
      VALUES (${randomUUID()}, ${hashSessionToken(token)}, ${user.id}, ${expiresAt}, CURRENT_TIMESTAMP)
    `;
    return { token, expiresAt, user: this.serializeUser(user) };
  }

  async authenticate(token: string): Promise<AuthenticatedUser> {
    if (!token || token.length > 256) throw new UnauthorizedException('Invalid or expired session');

    const sessions = await this.prisma.$queryRaw<Array<{ userId: string }>>`
      SELECT "userId" FROM "AdminAuthSession"
      WHERE "tokenHash" = ${hashSessionToken(token)}
        AND "revokedAt" IS NULL AND "expiresAt" > CURRENT_TIMESTAMP
      LIMIT 1
    `;
    const session = sessions[0];
    if (!session) throw new UnauthorizedException('Invalid or expired session');

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
    if (!user || !user.isActive || user.role !== ('ADMIN' as UserRole)) {
      await this.revokeAdminSession(hashSessionToken(token));
      throw new UnauthorizedException('User account is inactive');
    }
    return this.serializeUser(user);
  }

  async logout(token: string) {
    if (token) await this.revokeAdminSession(hashSessionToken(token));
    return { message: 'Signed out successfully' };
  }

  private async createCustomerSession(user: { id: string; email: string; name: string | null; role: UserRole }) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + CUSTOMER_SESSION_TTL_MS);
    await this.prisma.$executeRaw`
      INSERT INTO "CustomerAuthSession" ("id", "tokenHash", "userId", "expiresAt", "createdAt")
      VALUES (${randomUUID()}, ${hashSessionToken(token)}, ${user.id}, ${expiresAt}, CURRENT_TIMESTAMP)
    `;
    return { token, expiresAt, user: this.serializeUser(user) };
  }

  private async createEmailVerificationToken(userId: string) {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.$executeRaw`
      UPDATE "AuthVerificationToken" SET "usedAt" = CURRENT_TIMESTAMP
      WHERE "userId" = ${userId} AND "usedAt" IS NULL
    `;
    await this.prisma.$executeRaw`
      INSERT INTO "AuthVerificationToken" ("id", "userId", "tokenHash", "expiresAt", "createdAt")
      VALUES (${randomUUID()}, ${userId}, ${hashSessionToken(token)}, ${new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS)}, CURRENT_TIMESTAMP)
    `;
    return token;
  }

  private async createPasswordResetToken(userId: string) {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.$executeRaw`
      UPDATE "AuthPasswordResetToken" SET "usedAt" = CURRENT_TIMESTAMP
      WHERE "userId" = ${userId} AND "usedAt" IS NULL
    `;
    await this.prisma.$executeRaw`
      INSERT INTO "AuthPasswordResetToken" ("id", "userId", "tokenHash", "expiresAt", "createdAt")
      VALUES (${randomUUID()}, ${userId}, ${hashSessionToken(token)}, ${new Date(Date.now() + PASSWORD_RESET_TTL_MS)}, CURRENT_TIMESTAMP)
    `;
    return token;
  }

  private async revokeCustomerSession(tokenHash: string) {
    await this.prisma.$executeRaw`
      UPDATE "CustomerAuthSession" SET "revokedAt" = CURRENT_TIMESTAMP
      WHERE "tokenHash" = ${tokenHash} AND "revokedAt" IS NULL
    `;
  }

  private async revokeAdminSession(tokenHash: string) {
    await this.prisma.$executeRaw`
      UPDATE "AdminAuthSession" SET "revokedAt" = CURRENT_TIMESTAMP
      WHERE "tokenHash" = ${tokenHash} AND "revokedAt" IS NULL
    `;
  }

  private developmentToken(key: string, token: string) {
    if (process.env.NODE_ENV === 'production') return {};
    return { developmentOnly: { [key]: token } };
  }

  private serializeUser(user: { id: string; email: string; name: string | null; role: UserRole }): AuthenticatedUser {
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, 64, { N: 16_384, r: 8, p: 1 })) as Buffer;
  return `scrypt$16384$8$1$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

async function verifyPassword(password: string, encoded: string) {
  const [algorithm, n, r, p, saltHex, hashHex] = encoded.split('$');
  if (algorithm !== 'scrypt' || n !== '16384' || r !== '8' || p !== '1' || !saltHex || !hashHex) return false;
  try {
    const derivedKey = (await scrypt(password, Buffer.from(saltHex, 'hex'), 64, { N: 16_384, r: 8, p: 1 })) as Buffer;
    const expected = Buffer.from(hashHex, 'hex');
    return expected.length === derivedKey.length && timingSafeEqual(expected, derivedKey);
  } catch {
    return false;
  }
}

function hashSessionToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function safeSecretEqual(input: string, expected: string) {
  const inputBuffer = Buffer.from(input, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  if (inputBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(inputBuffer, expectedBuffer);
}
