CREATE TABLE "AuthCaptchaNonce" (
  "nonce" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthCaptchaNonce_pkey" PRIMARY KEY ("nonce")
);

CREATE INDEX "AuthCaptchaNonce_expiresAt_idx"
  ON "AuthCaptchaNonce"("expiresAt");
