-- Backfill the standard physical product sizes for active products that
-- do not already have variants. Prices inherit the product's active INR price.
WITH products_without_variants AS (
  SELECT p.id
  FROM "Product" p
  WHERE p.status = 'ACTIVE'
    AND NOT EXISTS (
      SELECT 1
      FROM "ProductVariant" v
      WHERE v."productId" = p.id
    )
),
new_variants AS (
  INSERT INTO "ProductVariant" (
    "id",
    "productId",
    "name",
    "size",
    "isActive",
    "createdAt",
    "updatedAt"
  )
  SELECT
    md5(p.id || ':small'),
    p.id,
    'Small',
    '15 cm',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  FROM "Product" p
  JOIN products_without_variants pwv ON pwv.id = p.id
  UNION ALL
  SELECT
    md5(p.id || ':medium'),
    p.id,
    'Medium',
    '20 cm',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  FROM "Product" p
  JOIN products_without_variants pwv ON pwv.id = p.id
  UNION ALL
  SELECT
    md5(p.id || ':large'),
    p.id,
    'Large',
    '25 cm',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  FROM "Product" p
  JOIN products_without_variants pwv ON pwv.id = p.id
  RETURNING "id", "productId"
)
INSERT INTO "ProductVariantPrice" (
  "id",
  "variantId",
  "currency",
  "amountMinor",
  "compareAtMinor",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  md5(v."id" || ':price'),
  v."id",
  COALESCE(base."currency", 'INR'),
  COALESCE(base."amountMinor", 0),
  base."compareAtMinor",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM new_variants v
LEFT JOIN LATERAL (
  SELECT
    pp."currency",
    pp."amountMinor",
    pp."compareAtMinor"
  FROM "ProductPrice" pp
  WHERE pp."productId" = v."productId"
    AND pp."isActive" = true
    AND pp."currency" = 'INR'
  ORDER BY pp."createdAt" DESC
  LIMIT 1
) base ON true;
