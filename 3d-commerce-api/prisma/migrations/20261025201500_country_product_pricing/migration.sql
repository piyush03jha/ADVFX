DROP INDEX IF EXISTS "ProductPrice_productId_isActive_idx";

ALTER TABLE "ProductPrice"
  ADD COLUMN "countryCode" TEXT;

CREATE INDEX "ProductPrice_productId_isActive_countryCode_idx"
  ON "ProductPrice"("productId", "isActive", "countryCode");

CREATE INDEX "ProductPrice_countryCode_currency_isActive_idx"
  ON "ProductPrice"("countryCode", "currency", "isActive");
