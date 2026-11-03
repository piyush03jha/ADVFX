ALTER TABLE "Category" ADD COLUMN "gstRateBps" INTEGER;

CREATE TABLE "MaterialPricingRule" (
  "id" TEXT NOT NULL,
  "material" TEXT NOT NULL,
  "sizeKey" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "amountMinor" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MaterialPricingRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MaterialPricingRule_material_sizeKey_key"
  ON "MaterialPricingRule"("material", "sizeKey");
CREATE INDEX "MaterialPricingRule_material_isActive_idx"
  ON "MaterialPricingRule"("material", "isActive");

ALTER TABLE "OrderItem"
  ADD COLUMN "materialSnapshot" TEXT,
  ADD COLUMN "sizeSnapshot" TEXT,
  ADD COLUMN "taxRateBps" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "taxMinor" INTEGER NOT NULL DEFAULT 0;
