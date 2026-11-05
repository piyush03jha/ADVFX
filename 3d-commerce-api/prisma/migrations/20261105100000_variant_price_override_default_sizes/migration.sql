-- Manual per-size price override (null = use the calculated price).
ALTER TABLE "ProductVariantPrice" ADD COLUMN "priceOverrideMinor" INTEGER;

-- New default sizes: Small 20 cm, Medium 25 cm, Large 30 cm.
-- Only variants still on the old defaults are moved; custom sizes are untouched.
UPDATE "ProductVariant" SET "size" = '30 cm' WHERE "name" = 'Large' AND "size" = '25 cm';
UPDATE "ProductVariant" SET "size" = '25 cm' WHERE "name" = 'Medium' AND "size" = '20 cm';
UPDATE "ProductVariant" SET "size" = '20 cm' WHERE "name" = 'Small' AND "size" = '15 cm';
