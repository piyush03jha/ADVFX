CREATE TABLE "ThreeDConversionJob" (
    "id" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "sourceStorageKey" TEXT NOT NULL,
    "outputStorageKey" TEXT,
    "inputExt" TEXT NOT NULL,
    "status" "ProcessingJobStatus" NOT NULL DEFAULT 'QUEUED',
    "outputSize" BIGINT,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreeDConversionJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ThreeDConversionJob_status_createdAt_idx"
  ON "ThreeDConversionJob"("status", "createdAt");

CREATE INDEX "ThreeDConversionJob_createdById_idx"
  ON "ThreeDConversionJob"("createdById");

ALTER TABLE "ThreeDConversionJob"
  ADD CONSTRAINT "ThreeDConversionJob_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
