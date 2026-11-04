-- Products are made to order by default; legacy stock tracking is disabled.
ALTER TABLE "Category" ADD COLUMN "ordersEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Product" ADD COLUMN "ordersEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "ProductInventory" ALTER COLUMN "trackStock" SET DEFAULT false;
ALTER TABLE "ProductVariant" ALTER COLUMN "trackStock" SET DEFAULT false;
UPDATE "ProductInventory" SET "trackStock" = false, "reserved" = 0;
UPDATE "ProductVariant" SET "trackStock" = false, "reserved" = 0;
