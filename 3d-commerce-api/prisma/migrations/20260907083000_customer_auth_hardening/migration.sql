-- Add the email verification timestamp used by customer auth.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);

-- Persistent customer credentials.
CREATE TABLE IF NOT EXISTS "CustomerCredential" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerCredential_userId_key"
  ON "CustomerCredential"("userId");

CREATE INDEX IF NOT EXISTS "CustomerCredential_userId_idx"
  ON "CustomerCredential"("userId");

ALTER TABLE "CustomerCredential"
  DROP CONSTRAINT IF EXISTS "CustomerCredential_userId_fkey";

ALTER TABLE "CustomerCredential"
  ADD CONSTRAINT "CustomerCredential_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Persistent customer sessions. Only token hashes are stored.
CREATE TABLE IF NOT EXISTS "CustomerAuthSession" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerAuthSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerAuthSession_tokenHash_key"
  ON "CustomerAuthSession"("tokenHash");

CREATE INDEX IF NOT EXISTS "CustomerAuthSession_userId_expiresAt_idx"
  ON "CustomerAuthSession"("userId", "expiresAt");

ALTER TABLE "CustomerAuthSession"
  DROP CONSTRAINT IF EXISTS "CustomerAuthSession_userId_fkey";

ALTER TABLE "CustomerAuthSession"
  ADD CONSTRAINT "CustomerAuthSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One-time email verification tokens; plaintext values are never persisted.
CREATE TABLE IF NOT EXISTS "AuthVerificationToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthVerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AuthVerificationToken_tokenHash_key"
  ON "AuthVerificationToken"("tokenHash");

CREATE INDEX IF NOT EXISTS "AuthVerificationToken_userId_createdAt_idx"
  ON "AuthVerificationToken"("userId", "createdAt");

ALTER TABLE "AuthVerificationToken"
  DROP CONSTRAINT IF EXISTS "AuthVerificationToken_userId_fkey";

ALTER TABLE "AuthVerificationToken"
  ADD CONSTRAINT "AuthVerificationToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One-time password reset tokens; plaintext values are never persisted.
CREATE TABLE IF NOT EXISTS "AuthPasswordResetToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthPasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AuthPasswordResetToken_tokenHash_key"
  ON "AuthPasswordResetToken"("tokenHash");

CREATE INDEX IF NOT EXISTS "AuthPasswordResetToken_userId_createdAt_idx"
  ON "AuthPasswordResetToken"("userId", "createdAt");

ALTER TABLE "AuthPasswordResetToken"
  DROP CONSTRAINT IF EXISTS "AuthPasswordResetToken_userId_fkey";

ALTER TABLE "AuthPasswordResetToken"
  ADD CONSTRAINT "AuthPasswordResetToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Persistent admin sessions; existing admin login logic uses this table.
CREATE TABLE IF NOT EXISTS "AdminAuthSession" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuthSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminAuthSession_tokenHash_key"
  ON "AdminAuthSession"("tokenHash");

CREATE INDEX IF NOT EXISTS "AdminAuthSession_userId_expiresAt_idx"
  ON "AdminAuthSession"("userId", "expiresAt");

ALTER TABLE "AdminAuthSession"
  DROP CONSTRAINT IF EXISTS "AdminAuthSession_userId_fkey";

ALTER TABLE "AdminAuthSession"
  ADD CONSTRAINT "AdminAuthSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
