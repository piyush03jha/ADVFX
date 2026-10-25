CREATE TABLE "ProductViewEvent" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "visitorHash" TEXT NOT NULL,
  "bucketStart" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductViewEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductViewEvent_productId_visitorHash_bucketStart_key"
  ON "ProductViewEvent"("productId", "visitorHash", "bucketStart");

CREATE INDEX "ProductViewEvent_bucketStart_idx"
  ON "ProductViewEvent"("bucketStart");

ALTER TABLE "ProductViewEvent"
  ADD CONSTRAINT "ProductViewEvent_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
