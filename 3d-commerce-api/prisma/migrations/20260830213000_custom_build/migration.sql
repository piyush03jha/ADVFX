CREATE TYPE "CustomRequestStatus" AS ENUM (
  'SUBMITTED',
  'UNDER_REVIEW',
  'IN_PRODUCTION',
  'PREVIEW_READY',
  'CUSTOMER_REVIEW',
  'REVISION_REQUESTED',
  'APPROVED',
  'ORDERABLE',
  'CANCELLED'
);

CREATE TYPE "CustomPreviewStatus" AS ENUM (
  'PROCESSING',
  'READY',
  'REPLACED'
);

CREATE TABLE "CustomRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "requirements" TEXT NOT NULL,
  "dimensions" TEXT,
  "preferredMaterial" TEXT,
  "preferredScale" TEXT,
  "notes" TEXT,
  "referenceFileCount" INTEGER NOT NULL DEFAULT 0,
  "status" "CustomRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
  "revisionCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomRequest_userId_createdAt_idx" ON "CustomRequest"("userId", "createdAt");
CREATE INDEX "CustomRequest_status_createdAt_idx" ON "CustomRequest"("status", "createdAt");

CREATE TABLE "CustomRequestMedia" (
  "id" TEXT NOT NULL,
  "customRequestId" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "storageUrl" TEXT,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT,
  "fileSize" BIGINT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomRequestMedia_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomRequestMedia_customRequestId_idx" ON "CustomRequestMedia"("customRequestId");

CREATE TABLE "CustomRequestPreview" (
  "id" TEXT NOT NULL,
  "customRequestId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "status" "CustomPreviewStatus" NOT NULL DEFAULT 'PROCESSING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomRequestPreview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomRequestPreview_customRequestId_key" ON "CustomRequestPreview"("customRequestId");

CREATE TABLE "CustomRequestRevision" (
  "id" TEXT NOT NULL,
  "customRequestId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomRequestRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomRequestRevision_customRequestId_createdAt_idx" ON "CustomRequestRevision"("customRequestId", "createdAt");

CREATE TABLE "CustomRequestQuote" (
  "id" TEXT NOT NULL,
  "customRequestId" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "amountMinor" INTEGER NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomRequestQuote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomRequestQuote_customRequestId_key" ON "CustomRequestQuote"("customRequestId");

ALTER TABLE "CustomRequest"
  ADD CONSTRAINT "CustomRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomRequestMedia"
  ADD CONSTRAINT "CustomRequestMedia_customRequestId_fkey"
  FOREIGN KEY ("customRequestId") REFERENCES "CustomRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomRequestPreview"
  ADD CONSTRAINT "CustomRequestPreview_customRequestId_fkey"
  FOREIGN KEY ("customRequestId") REFERENCES "CustomRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomRequestRevision"
  ADD CONSTRAINT "CustomRequestRevision_customRequestId_fkey"
  FOREIGN KEY ("customRequestId") REFERENCES "CustomRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomRequestRevision"
  ADD CONSTRAINT "CustomRequestRevision_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomRequestQuote"
  ADD CONSTRAINT "CustomRequestQuote_customRequestId_fkey"
  FOREIGN KEY ("customRequestId") REFERENCES "CustomRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
