-- 3D conversion pipeline: optimization metadata, publish target, and immutable publication state.

ALTER TABLE "ThreeDConversionJob"
  ADD COLUMN "convertedStorageKey" TEXT,
  ADD COLUMN "stage" TEXT NOT NULL DEFAULT 'QUEUED',
  ADD COLUMN "originalSize" BIGINT,
  ADD COLUMN "convertedSize" BIGINT,
  ADD COLUMN "targetProductId" TEXT,
  ADD COLUMN "publishedFileId" TEXT,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "optimizationPreset" TEXT NOT NULL DEFAULT 'BALANCED',
  ADD COLUMN "optimizerWarning" TEXT;

CREATE UNIQUE INDEX "ThreeDConversionJob_publishedFileId_key"
  ON "ThreeDConversionJob"("publishedFileId");

CREATE INDEX "ThreeDConversionJob_stage_createdAt_idx"
  ON "ThreeDConversionJob"("stage", "createdAt");

CREATE INDEX "ThreeDConversionJob_targetProductId_idx"
  ON "ThreeDConversionJob"("targetProductId");

ALTER TABLE "ThreeDConversionJob"
  ADD CONSTRAINT "ThreeDConversionJob_targetProductId_fkey"
  FOREIGN KEY ("targetProductId") REFERENCES "Product"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ThreeDConversionJob"
  ADD CONSTRAINT "ThreeDConversionJob_publishedFileId_fkey"
  FOREIGN KEY ("publishedFileId") REFERENCES "ProductFile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
