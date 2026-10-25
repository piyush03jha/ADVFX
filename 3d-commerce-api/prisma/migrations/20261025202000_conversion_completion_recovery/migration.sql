ALTER TABLE "ThreeDConversionJob"
  ADD COLUMN "completionSize" BIGINT,
  ADD COLUMN "completionParts" JSONB;
