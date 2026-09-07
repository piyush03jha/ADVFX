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

import { PrismaService } from '../prisma/prisma.service';
import type { UserRole } from '@prisma/client';
import type { AuthenticatedUser } from './auth.types';
import { AuthEmailService } from './email.service';

const CUSTOMER_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 12;

const EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24;
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 30;

/**
 * Minimum time between verification-email requests
 * for the same customer.
 */
const VERIFICATION_RESEND_COOLDOWN_MS = 1000 * 60;

const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

const GENERIC_VERIFICATION_MESSAGE =
  'If the account exists and is not verified, a verification email has been sent.';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: AuthEmailService,
  ) {}

  // ============================================================
  // CUSTOMER REGISTRATION
  // ============================================================

  async registerCustomer(
    name: string,
    email: string,
    password: string,
  ) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    const passwordHash = await hashPassword(password);

    const user = await this.prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: {
          email: normalizedEmail,
        },
        select: {
          id: true,
        },
      });

      if (existingUser) {
        throw new ConflictException(
          'An account with this email already exists.',
        );
      }

      const created = await tx.user.create({
        data: {
          email: normalizedEmail,
          name: normalizedName,
          role: 'CUSTOMER',
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });

      await tx.$executeRaw`
        INSERT INTO "CustomerCredential"
          ("id", "userId", "passwordHash", "createdAt", "updatedAt")
        VALUES
          (
            ${randomUUID()},
            ${created.id},
            ${passwordHash},
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
      `;

      return created;
    });

    const verificationToken =
      await this.createEmailVerificationToken(user.id);

    console.log(
      '[Auth] Registration created verification token for:',
      user.email,
    );

    try {
      await this.emailService.sendVerificationEmail(
        user.email,
        verificationToken,
      );

      console.log(
        '[Auth] Registration verification email sent:',
        user.email,
      );
    } catch (error) {
      console.error(
        '[Auth] Registration verification email failed:',
        error,
      );

      await this.revokeVerificationToken(verificationToken);

      throw error;
    }

    return {
      user: this.serializeUser(user),
      verificationRequired: true,
      ...this.developmentToken(
        'emailVerificationToken',
        verificationToken,
      ),
    };
  }

  // ============================================================
  // CUSTOMER LOGIN
  // ============================================================

  async customerLogin(
    email: string,
    password: string,
  ) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (
      !user ||
      !user.isActive ||
      user.role !== ('CUSTOMER' as UserRole)
    ) {
      throw new UnauthorizedException(
        'Invalid email or password.',
      );
    }

    const credentials =
      await this.prisma.$queryRaw<
        Array<{ passwordHash: string }>
      >`
        SELECT "passwordHash"
        FROM "CustomerCredential"
        WHERE "userId" = ${user.id}
        LIMIT 1
      `;

    if (
      !credentials[0] ||
      !(await verifyPassword(
        password,
        credentials[0].passwordHash,
      ))
    ) {
      throw new UnauthorizedException(
        'Invalid email or password.',
      );
    }

    const verification =
      await this.prisma.$queryRaw<
        Array<{ emailVerifiedAt: Date | null }>
      >`
        SELECT "emailVerifiedAt"
        FROM "User"
        WHERE "id" = ${user.id}
        LIMIT 1
      `;

    if (!verification[0]?.emailVerifiedAt) {
      throw new UnauthorizedException(
        'Email verification is required before signing in.',
      );
    }

    return this.createCustomerSession(user);
  }

  // ============================================================
  // CUSTOMER SESSION
  // ============================================================

  async authenticateCustomer(
    token: string,
  ): Promise<AuthenticatedUser> {
    if (!token || token.length > 256) {
      throw new UnauthorizedException(
        'Invalid or expired session',
      );
    }

    const sessions =
      await this.prisma.$queryRaw<
        Array<{ userId: string }>
      >`
        SELECT "userId"
        FROM "CustomerAuthSession"
        WHERE "tokenHash" = ${hashSessionToken(token)}
          AND "revokedAt" IS NULL
          AND "expiresAt" > CURRENT_TIMESTAMP
        LIMIT 1
      `;

    const session = sessions[0];

    if (!session) {
      throw new UnauthorizedException(
        'Invalid or expired session',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: session.userId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (
      !user ||
      !user.isActive ||
      user.role !== ('CUSTOMER' as UserRole)
    ) {
      await this.revokeCustomerSession(
        hashSessionToken(token),
      );

      throw new UnauthorizedException(
        'User account is inactive',
      );
    }

    return this.serializeUser(user);
  }

  // ============================================================
  // CUSTOMER LOGOUT
  // ============================================================

  async customerLogout(token: string) {
    if (token) {
      await this.revokeCustomerSession(
        hashSessionToken(token),
      );
    }

    return {
      message: 'Signed out successfully',
    };
  }

  // ============================================================
  // VERIFY CUSTOMER EMAIL
  // ============================================================

  async verifyCustomerEmail(token: string) {
    if (!token || token.length > 256) {
      throw new UnauthorizedException(
        'Invalid or expired verification token.',
      );
    }

    const rows =
      await this.prisma.$queryRaw<
        Array<{
          id: string;
          userId: string;
        }>
      >`
        SELECT "id", "userId"
        FROM "AuthVerificationToken"
        WHERE "tokenHash" = ${hashSessionToken(token)}
          AND "usedAt" IS NULL
          AND "expiresAt" > CURRENT_TIMESTAMP
        LIMIT 1
      `;

    const record = rows[0];

    if (!record) {
      throw new UnauthorizedException(
        'Invalid or expired verification token.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE "User"
        SET
          "emailVerifiedAt" = CURRENT_TIMESTAMP,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${record.userId}
      `;

      await tx.$executeRaw`
        UPDATE "AuthVerificationToken"
        SET "usedAt" = CURRENT_TIMESTAMP
        WHERE "userId" = ${record.userId}
          AND "usedAt" IS NULL
      `;
    });

    return {
      message: 'Email verified successfully.',
    };
  }

  // ============================================================
  // RESEND VERIFICATION EMAIL
  // ============================================================

  async resendCustomerVerification(
    email: string,
  ) {
    const normalizedEmail = email.trim().toLowerCase();

    console.log(
      '[Auth] Resend verification requested:',
      normalizedEmail,
    );

    const user = await this.prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
      select: {
        id: true,
        email: true,
        isActive: true,
        role: true,
      },
    });

    console.log('[Auth] Resend user lookup:', {
      found: Boolean(user),
      userId: user?.id,
      email: user?.email,
      isActive: user?.isActive,
      role: user?.role,
    });

    /**
     * Always return the same response here.
     *
     * This prevents account enumeration.
     */
    if (
      !user ||
      !user.isActive ||
      user.role !== ('CUSTOMER' as UserRole)
    ) {
      console.log(
        '[Auth] Resend exit: user not found, inactive, or not customer',
      );

      return {
        message: GENERIC_VERIFICATION_MESSAGE,
      };
    }

    // ----------------------------------------------------------
    // Check whether email is already verified
    // ----------------------------------------------------------

    const verification =
      await this.prisma.$queryRaw<
        Array<{
          emailVerifiedAt: Date | null;
        }>
      >`
        SELECT "emailVerifiedAt"
        FROM "User"
        WHERE "id" = ${user.id}
        LIMIT 1
      `;

    console.log(
      '[Auth] Resend verification status:',
      verification[0]?.emailVerifiedAt ?? null,
    );

    if (verification[0]?.emailVerifiedAt) {
      console.log(
        '[Auth] Resend exit: email already verified',
      );

      return {
        message: GENERIC_VERIFICATION_MESSAGE,
      };
    }

    // ----------------------------------------------------------
    // Check resend cooldown
    // ----------------------------------------------------------

    const recentTokens =
      await this.prisma.$queryRaw<
        Array<{
          createdAt: Date;
        }>
      >`
        SELECT "createdAt"
        FROM "AuthVerificationToken"
        WHERE "userId" = ${user.id}
          AND "usedAt" IS NULL
        ORDER BY "createdAt" DESC
        LIMIT 1
      `;

    const recentToken = recentTokens[0];

    if (recentToken) {
      const tokenCreatedAt = new Date(
        recentToken.createdAt,
      ).getTime();

      const ageMs =
        Date.now() - tokenCreatedAt;

      console.log(
        '[Auth] Existing verification token age:',
        Math.round(ageMs / 1000),
        'seconds',
      );

      console.log(
        '[Auth] Resend cooldown:',
        Math.round(
          VERIFICATION_RESEND_COOLDOWN_MS / 1000,
        ),
        'seconds',
      );

      if (
        ageMs >= 0 &&
        ageMs < VERIFICATION_RESEND_COOLDOWN_MS
      ) {
        console.log(
          '[Auth] Resend exit: cooldown active',
        );

        return {
          message: GENERIC_VERIFICATION_MESSAGE,
        };
      }
    }

    // ----------------------------------------------------------
    // Create a fresh token
    // ----------------------------------------------------------

    console.log(
      '[Auth] Creating new verification token...',
    );

    const verificationToken =
      await this.createEmailVerificationToken(
        user.id,
      );

    console.log(
      '[Auth] New verification token created.',
    );

    // ----------------------------------------------------------
    // Send email
    // ----------------------------------------------------------

    try {
      console.log(
        '[Auth] Calling AuthEmailService.sendVerificationEmail()...',
      );

      await this.emailService.sendVerificationEmail(
        user.email,
        verificationToken,
      );

      console.log(
        '[Auth] Verification email successfully handed to email service.',
      );
    } catch (error) {
      console.error(
        '[Auth] Verification email failed:',
        error,
      );

      /**
       * If delivery fails, invalidate the newly-created token.
       */
      await this.revokeVerificationToken(
        verificationToken,
      );

      throw error;
    }

    return {
      message: GENERIC_VERIFICATION_MESSAGE,
      ...this.developmentToken(
        'emailVerificationToken',
        verificationToken,
      ),
    };
  }

  // ============================================================
  // FORGOT CUSTOMER PASSWORD
  // ============================================================

  async forgotCustomerPassword(
    email: string,
  ) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
      select: {
        id: true,
        email: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return {
        message:
          'If the account exists, password reset instructions have been sent.',
      };
    }

    const token =
      await this.createPasswordResetToken(
        user.id,
      );

    try {
      await this.emailService.sendPasswordResetEmail(
        user.email,
        token,
      );
    } catch (error) {
      await this.revokePasswordResetToken(token);
      throw error;
    }

    return {
      message:
        'If the account exists, password reset instructions have been sent.',
      ...this.developmentToken(
        'passwordResetToken',
        token,
      ),
    };
  }

  // ============================================================
  // RESET CUSTOMER PASSWORD
  // ============================================================

  async resetCustomerPassword(
    token: string,
    password: string,
  ) {
    if (!token || token.length > 256) {
      throw new UnauthorizedException(
        'Invalid or expired password reset token.',
      );
    }

    const rows =
      await this.prisma.$queryRaw<
        Array<{
          id: string;
          userId: string;
        }>
      >`
        SELECT "id", "userId"
        FROM "AuthPasswordResetToken"
        WHERE "tokenHash" = ${hashSessionToken(token)}
          AND "usedAt" IS NULL
          AND "expiresAt" > CURRENT_TIMESTAMP
        LIMIT 1
      `;

    const record = rows[0];

    if (!record) {
      throw new UnauthorizedException(
        'Invalid or expired password reset token.',
      );
    }

    const passwordHash =
      await hashPassword(password);

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE "CustomerCredential"
        SET
          "passwordHash" = ${passwordHash},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "userId" = ${record.userId}
      `;

      await tx.$executeRaw`
        UPDATE "AuthPasswordResetToken"
        SET "usedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${record.id}
      `;

      await tx.$executeRaw`
        UPDATE "CustomerAuthSession"
        SET "revokedAt" = CURRENT_TIMESTAMP
        WHERE "userId" = ${record.userId}
          AND "revokedAt" IS NULL
      `;
    });

    return {
      message: 'Password reset successfully.',
    };
  }

  // ============================================================
  // ADMIN LOGIN
  // ============================================================

  async login(
    email: string,
    secret: string,
  ) {
    const expectedSecret =
      process.env.ADMIN_AUTH_SECRET;

    if (!expectedSecret) {
      throw new Error(
        'ADMIN_AUTH_SECRET is not configured',
      );
    }

    if (
      !safeSecretEqual(
        secret,
        expectedSecret,
      )
    ) {
      throw new UnauthorizedException(
        'Invalid credentials',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: {
        email: email.toLowerCase().trim(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (
      !user ||
      !user.isActive ||
      user.role !== ('ADMIN' as UserRole)
    ) {
      throw new UnauthorizedException(
        'Invalid credentials',
      );
    }

    const token =
      randomBytes(32).toString('base64url');

    const expiresAt = new Date(
      Date.now() + ADMIN_SESSION_TTL_MS,
    );

    await this.prisma.$executeRaw`
      INSERT INTO "AdminAuthSession"
        ("id", "tokenHash", "userId", "expiresAt", "createdAt")
      VALUES
        (
          ${randomUUID()},
          ${hashSessionToken(token)},
          ${user.id},
          ${expiresAt},
          CURRENT_TIMESTAMP
        )
    `;

    return {
      token,
      expiresAt,
      user: this.serializeUser(user),
    };
  }

  // ============================================================
  // ADMIN SESSION
  // ============================================================

  async authenticate(
    token: string,
  ): Promise<AuthenticatedUser> {
    if (!token || token.length > 256) {
      throw new UnauthorizedException(
        'Invalid or expired session',
      );
    }

    const sessions =
      await this.prisma.$queryRaw<
        Array<{ userId: string }>
      >`
        SELECT "userId"
        FROM "AdminAuthSession"
        WHERE "tokenHash" = ${hashSessionToken(token)}
          AND "revokedAt" IS NULL
          AND "expiresAt" > CURRENT_TIMESTAMP
        LIMIT 1
      `;

    const session = sessions[0];

    if (!session) {
      throw new UnauthorizedException(
        'Invalid or expired session',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: session.userId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (
      !user ||
      !user.isActive ||
      user.role !== ('ADMIN' as UserRole)
    ) {
      await this.revokeAdminSession(
        hashSessionToken(token),
      );

      throw new UnauthorizedException(
        'User account is inactive',
      );
    }

    return this.serializeUser(user);
  }

  // ============================================================
  // ADMIN LOGOUT
  // ============================================================

  async logout(token: string) {
    if (token) {
      await this.revokeAdminSession(
        hashSessionToken(token),
      );
    }

    return {
      message: 'Signed out successfully',
    };
  }

  // ============================================================
  // CREATE CUSTOMER SESSION
  // ============================================================

  private async createCustomerSession(user: {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
  }) {
    const token =
      randomBytes(32).toString('base64url');

    const expiresAt = new Date(
      Date.now() + CUSTOMER_SESSION_TTL_MS,
    );

    await this.prisma.$executeRaw`
      INSERT INTO "CustomerAuthSession"
        ("id", "tokenHash", "userId", "expiresAt", "createdAt")
      VALUES
        (
          ${randomUUID()},
          ${hashSessionToken(token)},
          ${user.id},
          ${expiresAt},
          CURRENT_TIMESTAMP
        )
    `;

    return {
      token,
      expiresAt,
      user: this.serializeUser(user),
    };
  }

  // ============================================================
  // CREATE EMAIL VERIFICATION TOKEN
  // ============================================================

  private async createEmailVerificationToken(
    userId: string,
  ) {
    const token =
      randomBytes(32).toString('base64url');

    /**
     * Invalidate every previous unused verification token.
     * Only the newest token remains valid.
     */
    await this.prisma.$executeRaw`
      UPDATE "AuthVerificationToken"
      SET "usedAt" = CURRENT_TIMESTAMP
      WHERE "userId" = ${userId}
        AND "usedAt" IS NULL
    `;

    await this.prisma.$executeRaw`
      INSERT INTO "AuthVerificationToken"
        ("id", "userId", "tokenHash", "expiresAt", "createdAt")
      VALUES
        (
          ${randomUUID()},
          ${userId},
          ${hashSessionToken(token)},
          ${new Date(
            Date.now() + EMAIL_VERIFICATION_TTL_MS,
          )},
          CURRENT_TIMESTAMP
        )
    `;

    return token;
  }

  // ============================================================
  // REVOKE EMAIL VERIFICATION TOKEN
  // ============================================================

  private async revokeVerificationToken(
    token: string,
  ) {
    await this.prisma.$executeRaw`
      UPDATE "AuthVerificationToken"
      SET "usedAt" = CURRENT_TIMESTAMP
      WHERE "tokenHash" = ${hashSessionToken(token)}
        AND "usedAt" IS NULL
    `;
  }

  // ============================================================
  // CREATE PASSWORD RESET TOKEN
  // ============================================================

  private async createPasswordResetToken(
    userId: string,
  ) {
    const token =
      randomBytes(32).toString('base64url');

    /**
     * Invalidate previous unused password-reset tokens.
     */
    await this.prisma.$executeRaw`
      UPDATE "AuthPasswordResetToken"
      SET "usedAt" = CURRENT_TIMESTAMP
      WHERE "userId" = ${userId}
        AND "usedAt" IS NULL
    `;

    await this.prisma.$executeRaw`
      INSERT INTO "AuthPasswordResetToken"
        ("id", "userId", "tokenHash", "expiresAt", "createdAt")
      VALUES
        (
          ${randomUUID()},
          ${userId},
          ${hashSessionToken(token)},
          ${new Date(
            Date.now() + PASSWORD_RESET_TTL_MS,
          )},
          CURRENT_TIMESTAMP
        )
    `;

    return token;
  }

  // ============================================================
  // REVOKE PASSWORD RESET TOKEN
  // ============================================================

  private async revokePasswordResetToken(
    token: string,
  ) {
    await this.prisma.$executeRaw`
      UPDATE "AuthPasswordResetToken"
      SET "usedAt" = CURRENT_TIMESTAMP
      WHERE "tokenHash" = ${hashSessionToken(token)}
        AND "usedAt" IS NULL
    `;
  }

  // ============================================================
  // REVOKE CUSTOMER SESSION
  // ============================================================

  private async revokeCustomerSession(
    tokenHash: string,
  ) {
    await this.prisma.$executeRaw`
      UPDATE "CustomerAuthSession"
      SET "revokedAt" = CURRENT_TIMESTAMP
      WHERE "tokenHash" = ${tokenHash}
        AND "revokedAt" IS NULL
    `;
  }

  // ============================================================
  // REVOKE ADMIN SESSION
  // ============================================================

  private async revokeAdminSession(
    tokenHash: string,
  ) {
    await this.prisma.$executeRaw`
      UPDATE "AdminAuthSession"
      SET "revokedAt" = CURRENT_TIMESTAMP
      WHERE "tokenHash" = ${tokenHash}
        AND "revokedAt" IS NULL
    `;
  }

  // ============================================================
  // DEVELOPMENT TOKEN
  // ============================================================

  private developmentToken(
    key: string,
    token: string,
  ) {
    if (
      process.env.NODE_ENV === 'production'
    ) {
      return {};
    }

    return {
      developmentOnly: {
        [key]: token,
      },
    };
  }

  // ============================================================
  // SERIALIZE USER
  // ============================================================

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

// ============================================================
// SCRYPT
// ============================================================

/**
 * Promise wrapper around Node's callback-based scrypt API.
 *
 * This keeps the explicit scrypt cost parameters while avoiding
 * the TypeScript overload problem caused by promisify().
 */
function scryptAsync(
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: {
    N: number;
    r: number;
    p: number;
  },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      keylen,
      options,
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey as Buffer);
      },
    );
  });
}

// ============================================================
// PASSWORD HASH
// ============================================================

async function hashPassword(
  password: string,
) {
  const salt = randomBytes(16);

  const derivedKey = await scryptAsync(
    password,
    salt,
    SCRYPT_KEY_LENGTH,
    {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
    },
  );

  return [
    'scrypt',
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('hex'),
    derivedKey.toString('hex'),
  ].join('$');
}

// ============================================================
// PASSWORD VERIFY
// ============================================================

async function verifyPassword(
  password: string,
  encoded: string,
) {
  const [
    algorithm,
    n,
    r,
    p,
    saltHex,
    hashHex,
  ] = encoded.split('$');

  if (
    algorithm !== 'scrypt' ||
    n !== String(SCRYPT_N) ||
    r !== String(SCRYPT_R) ||
    p !== String(SCRYPT_P) ||
    !saltHex ||
    !hashHex
  ) {
    return false;
  }

  try {
    const salt = Buffer.from(
      saltHex,
      'hex',
    );

    const expected = Buffer.from(
      hashHex,
      'hex',
    );

    if (
      expected.length !==
      SCRYPT_KEY_LENGTH
    ) {
      return false;
    }

    const derivedKey = await scryptAsync(
      password,
      salt,
      SCRYPT_KEY_LENGTH,
      {
        N: SCRYPT_N,
        r: SCRYPT_R,
        p: SCRYPT_P,
      },
    );

    return (
      derivedKey.length ===
        expected.length &&
      timingSafeEqual(
        expected,
        derivedKey,
      )
    );
  } catch {
    return false;
  }
}

// ============================================================
// SESSION TOKEN HASH
// ============================================================

function hashSessionToken(
  token: string,
) {
  return createHash('sha256')
    .update(token, 'utf8')
    .digest('hex');
}

// ============================================================
// SAFE SECRET COMPARISON
// ============================================================

function safeSecretEqual(
  input: string,
  expected: string,
) {
  const inputBuffer = Buffer.from(
    input,
    'utf8',
  );

  const expectedBuffer = Buffer.from(
    expected,
    'utf8',
  );

  if (
    inputBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    inputBuffer,
    expectedBuffer,
  );
}