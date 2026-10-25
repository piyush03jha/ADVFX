CREATE TABLE "ProductVariantCountryPrice" (
  "id" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "countryCode" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "amountMinor" INTEGER NOT NULL,
  "compareAtMinor" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductVariantCountryPrice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductVariantCountryPrice_variantId_countryCode_key"
  ON "ProductVariantCountryPrice"("variantId", "countryCode");

CREATE INDEX "ProductVariantCountryPrice_countryCode_isActive_idx"
  ON "ProductVariantCountryPrice"("countryCode", "isActive");

ALTER TABLE "ProductVariantCountryPrice"
  ADD CONSTRAINT "ProductVariantCountryPrice_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
