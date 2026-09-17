ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);

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
CREATE INDEX IF NOT EXISTS "AuthVerificationToken_userId_idx"
  ON "AuthVerificationToken"("userId");
CREATE INDEX IF NOT EXISTS "AuthVerificationToken_expiresAt_idx"
  ON "AuthVerificationToken"("expiresAt");

ALTER TABLE "AuthVerificationToken"
  ADD CONSTRAINT "AuthVerificationToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
CREATE INDEX IF NOT EXISTS "AuthPasswordResetToken_userId_idx"
  ON "AuthPasswordResetToken"("userId");
CREATE INDEX IF NOT EXISTS "AuthPasswordResetToken_expiresAt_idx"
  ON "AuthPasswordResetToken"("expiresAt");

ALTER TABLE "AuthPasswordResetToken"
  ADD CONSTRAINT "AuthPasswordResetToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
CREATE INDEX IF NOT EXISTS "AdminAuthSession_userId_idx"
  ON "AdminAuthSession"("userId");
CREATE INDEX IF NOT EXISTS "AdminAuthSession_expiresAt_idx"
  ON "AdminAuthSession"("expiresAt");

ALTER TABLE "AdminAuthSession"
  ADD CONSTRAINT "AdminAuthSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
