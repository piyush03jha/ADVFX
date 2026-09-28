CREATE TYPE "OAuthProvider" AS ENUM ('GOOGLE');

CREATE TABLE "CustomerOAuthIdentity" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "OAuthProvider" NOT NULL,
  "providerSubject" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CustomerOAuthIdentity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerOAuthIdentity_provider_providerSubject_key"
  ON "CustomerOAuthIdentity"("provider", "providerSubject");
CREATE INDEX "CustomerOAuthIdentity_userId_idx"
  ON "CustomerOAuthIdentity"("userId");
CREATE INDEX "CustomerOAuthIdentity_email_idx"
  ON "CustomerOAuthIdentity"("email");

ALTER TABLE "CustomerOAuthIdentity"
  ADD CONSTRAINT "CustomerOAuthIdentity_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
