ALTER TABLE "MaterialPricingRule"
  ADD COLUMN "rawMaterialCostMinor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "wastageRateBps" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "electricityKwhMilli" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "machineHoursMilli" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ProductVariantPrice"
  ADD COLUMN "costBreakdown" JSONB;

ALTER TABLE "OrderItem"
  ADD COLUMN "manufacturingCostSnapshot" JSONB;

CREATE TABLE "ProductCostRule" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sizeKey" TEXT NOT NULL,
  "labourCostMinor" INTEGER,
  "paintingCostMinor" INTEGER NOT NULL DEFAULT 0,
  "finishingCostMinor" INTEGER NOT NULL DEFAULT 0,
  "machineSetupCostMinor" INTEGER NOT NULL DEFAULT 0,
  "packagingCostMinor" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductCostRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductCostRule_productId_sizeKey_key"
  ON "ProductCostRule"("productId", "sizeKey");
CREATE INDEX "ProductCostRule_productId_idx"
  ON "ProductCostRule"("productId");

ALTER TABLE "ProductCostRule"
  ADD CONSTRAINT "ProductCostRule_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ManufacturingRate" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "electricityRatePerKwhMinor" INTEGER NOT NULL DEFAULT 0,
  "machineHourlyCostMinor" INTEGER NOT NULL DEFAULT 0,
  "generalOverheadBps" INTEGER NOT NULL DEFAULT 0,
  "defaultLabourCostMinor" INTEGER NOT NULL DEFAULT 0,
  "standardPackagingCostMinor" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManufacturingRate_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ManufacturingRate" ("id", "updatedAt")
VALUES ('default', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
