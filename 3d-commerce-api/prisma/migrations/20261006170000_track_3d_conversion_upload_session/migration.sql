-- Track active multipart upload sessions so admin deletion can abort them safely.

ALTER TABLE "ThreeDConversionJob"
  ADD COLUMN "uploadId" TEXT;
