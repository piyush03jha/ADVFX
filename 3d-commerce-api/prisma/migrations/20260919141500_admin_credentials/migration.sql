-- Add per-admin credential storage.
CREATE TABLE "AdminCredential" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AdminCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminCredential_userId_key"
  ON "AdminCredential"("userId");

ALTER TABLE "AdminCredential"
  ADD CONSTRAINT "AdminCredential_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
