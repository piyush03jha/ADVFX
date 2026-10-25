CREATE TABLE "ApiRateLimitBucket" (
  "key" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiRateLimitBucket_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "ApiRateLimitBucket_updatedAt_idx"
  ON "ApiRateLimitBucket"("updatedAt");
