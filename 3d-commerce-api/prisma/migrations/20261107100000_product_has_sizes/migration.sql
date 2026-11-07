-- Per-product switch for size variants. Existing products keep their sizes.
-- When false the product is sold at one manually set price (ProductPrice) and
-- its size variants are ignored, so nothing is auto-calculated for it.
ALTER TABLE "Product" ADD COLUMN "hasSizes" BOOLEAN NOT NULL DEFAULT true;
