CREATE TABLE "CustomerCredential" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerCredential_userId_key" ON "CustomerCredential"("userId");

CREATE TABLE "CustomerAuthSession" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerAuthSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerAuthSession_tokenHash_key" ON "CustomerAuthSession"("tokenHash");
CREATE INDEX "CustomerAuthSession_userId_idx" ON "CustomerAuthSession"("userId");
CREATE INDEX "CustomerAuthSession_expiresAt_idx" ON "CustomerAuthSession"("expiresAt");

ALTER TABLE "CustomerCredential"
  ADD CONSTRAINT "CustomerCredential_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerAuthSession"
  ADD CONSTRAINT "CustomerAuthSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
