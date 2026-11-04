ALTER TABLE "ProductVariant" ADD COLUMN "weightGrams" DOUBLE PRECISION;
ALTER TABLE "MaterialPricingRule" ADD COLUMN "pricePerKgMinor" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "SizeManufacturingRule" (
  "id" TEXT NOT NULL,
  "sizeKey" TEXT NOT NULL,
  "electricityCostMinor" INTEGER NOT NULL DEFAULT 0,
  "machineCostMinor" INTEGER NOT NULL DEFAULT 0,
  "labourCostMinor" INTEGER NOT NULL DEFAULT 0,
  "finishingCostMinor" INTEGER NOT NULL DEFAULT 0,
  "packagingCostMinor" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SizeManufacturingRule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SizeManufacturingRule_sizeKey_key" ON "SizeManufacturingRule"("sizeKey");
