ALTER TABLE "ProductVariant"
  ADD COLUMN "stock" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "reserved" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lowStockAt" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "trackStock" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "allowBackorder" BOOLEAN NOT NULL DEFAULT false;

WITH ranked AS (
  SELECT
    v.id,
    v."productId",
    ROW_NUMBER() OVER (PARTITION BY v."productId" ORDER BY v."createdAt", v.id) - 1 AS idx,
    COUNT(*) OVER (PARTITION BY v."productId") AS variant_count,
    COALESCE(i.stock, 0) AS product_stock
  FROM "ProductVariant" v
  LEFT JOIN "ProductInventory" i ON i."productId" = v."productId"
  WHERE v."isActive" = true
),
allocated AS (
  SELECT
    id,
    FLOOR(product_stock::numeric / NULLIF(variant_count, 0))::integer
      + CASE
          WHEN idx < (product_stock % NULLIF(variant_count, 0)) THEN 1
          ELSE 0
        END AS allocated_stock
  FROM ranked
)
UPDATE "ProductVariant" v
SET "stock" = allocated.allocated_stock
FROM allocated
WHERE v.id = allocated.id;
