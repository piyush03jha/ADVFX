-- CreateEnum
CREATE TYPE "ProcessingJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "ProductFileProcessingJob" (
    "id" TEXT NOT NULL,
    "productFileId" TEXT NOT NULL,
    "status" "ProcessingJobStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "errorMessage" TEXT,
    "outputFileId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductFileProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductFileProcessingJob_outputFileId_key" ON "ProductFileProcessingJob"("outputFileId");

-- CreateIndex
CREATE INDEX "ProductFileProcessingJob_productFileId_idx" ON "ProductFileProcessingJob"("productFileId");

-- CreateIndex
CREATE INDEX "ProductFileProcessingJob_status_idx" ON "ProductFileProcessingJob"("status");

-- AddForeignKey
ALTER TABLE "ProductFileProcessingJob" ADD CONSTRAINT "ProductFileProcessingJob_productFileId_fkey" FOREIGN KEY ("productFileId") REFERENCES "ProductFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFileProcessingJob" ADD CONSTRAINT "ProductFileProcessingJob_outputFileId_fkey" FOREIGN KEY ("outputFileId") REFERENCES "ProductFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
