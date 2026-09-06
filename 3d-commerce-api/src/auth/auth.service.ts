import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { PrismaService } from '../prisma/prisma.service';
import type { UserRole } from '@prisma/client';
import type { AuthenticatedUser } from './auth.types';

const scrypt = promisify(scryptCallback);
const MAX_SESSION_COUNT = 10_000;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

@Injectable()
export class AuthService {
  private readonly adminSessions = new Map<
    string,
    { token: string; userId: string; expiresAt: Date }
  >();

  constructor(private readonly prisma: PrismaService) {}

  async registerCustomer(name: string, email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await hashPassword(password);
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        name: normalizedName,
        role: 'CUSTOMER',
        isActive: true,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    await this.prisma.$executeRaw`
      INSERT INTO "CustomerCredential" ("id", "userId", "passwordHash", "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${user.id}, ${passwordHash}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    return this.createCustomerSession(user);
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
      SELECT "passwordHash"
      FROM "CustomerCredential"
      WHERE "userId" = ${user.id}
      LIMIT 1
    `;

    if (!credentials[0] || !(await verifyPassword(password, credentials[0].passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.createCustomerSession(user);
  }

  async authenticateCustomer(token: string): Promise<AuthenticatedUser> {
    const tokenHash = hashSessionToken(token);
    const sessions = await this.prisma.$queryRaw<
      Array<{ userId: string; expiresAt: Date }>
    >`
      SELECT "userId", "expiresAt"
      FROM "CustomerAuthSession"
      WHERE "tokenHash" = ${tokenHash}
        AND "revokedAt" IS NULL
        AND "expiresAt" > CURRENT_TIMESTAMP
      LIMIT 1
    `;

    const session = sessions[0];
    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    if (!user || !user.isActive || user.role !== ('CUSTOMER' as UserRole)) {
      await this.revokeCustomerSession(tokenHash);
      throw new UnauthorizedException('User account is inactive');
    }

    return this.serializeUser(user);
  }

  async customerLogout(token: string) {
    await this.revokeCustomerSession(hashSessionToken(token));
    return { message: 'Signed out successfully' };
  }

  async login(email: string, secret: string) {
    const expectedSecret = process.env.ADMIN_AUTH_SECRET;

    if (!expectedSecret) {
      throw new Error('ADMIN_AUTH_SECRET is not configured');
    }

    if (!safeSecretEqual(secret, expectedSecret)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive || user.role !== ('ADMIN' as UserRole)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12);

    if (this.adminSessions.size >= MAX_SESSION_COUNT) {
      this.pruneExpiredAdminSessions();
    }

    this.adminSessions.set(token, { token, userId: user.id, expiresAt });

    return {
      token,
      expiresAt,
      user: this.serializeUser(user),
    };
  }

  async authenticate(token: string): Promise<AuthenticatedUser> {
    if (!token || token.length > 128 || !/^[0-9a-f-]{36}$/i.test(token)) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    const session = this.adminSessions.get(token);

    if (!session || session.expiresAt <= new Date()) {
      if (session) this.adminSessions.delete(token);
      throw new UnauthorizedException('Invalid or expired session');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive || user.role !== ('ADMIN' as UserRole)) {
      this.adminSessions.delete(token);
      throw new UnauthorizedException('User account is inactive');
    }

    return this.serializeUser(user);
  }

  logout(token: string) {
    this.adminSessions.delete(token);
    return { message: 'Signed out successfully' };
  }

  private async createCustomerSession(user: {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
  }) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await this.prisma.$executeRaw`
      INSERT INTO "CustomerAuthSession" ("id", "tokenHash", "userId", "expiresAt", "createdAt")
      VALUES (${randomUUID()}, ${hashSessionToken(token)}, ${user.id}, ${expiresAt}, CURRENT_TIMESTAMP)
    `;

    return {
      token,
      expiresAt,
      user: this.serializeUser(user),
    };
  }

  private async revokeCustomerSession(tokenHash: string) {
    await this.prisma.$executeRaw`
      UPDATE "CustomerAuthSession"
      SET "revokedAt" = CURRENT_TIMESTAMP
      WHERE "tokenHash" = ${tokenHash}
        AND "revokedAt" IS NULL
    `;
  }

  private pruneExpiredAdminSessions() {
    const now = new Date();
    for (const [token, session] of this.adminSessions) {
      if (session.expiresAt <= now) this.adminSessions.delete(token);
    }
  }

  private serializeUser(user: {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
  }): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, 64, {
    N: 16_384,
    r: 8,
    p: 1,
  })) as Buffer;

  return `scrypt$16384$8$1$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

async function verifyPassword(password: string, encoded: string) {
  const [algorithm, n, r, p, saltHex, hashHex] = encoded.split('$');

  if (
    algorithm !== 'scrypt' ||
    n !== '16384' ||
    r !== '8' ||
    p !== '1' ||
    !saltHex ||
    !hashHex
  ) {
    return false;
  }

  try {
    const derivedKey = (await scrypt(password, Buffer.from(saltHex, 'hex'), 64, {
      N: 16_384,
      r: 8,
      p: 1,
    })) as Buffer;
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
