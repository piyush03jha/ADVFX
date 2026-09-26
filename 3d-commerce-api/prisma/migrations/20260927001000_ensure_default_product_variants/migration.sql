-- Ensure existing active physical products have the standard size variants.
-- New products already receive these variants from ProductsService.create().
DO $$
DECLARE
  product_row RECORD;
  base_amount INTEGER;
  variant_id TEXT;
BEGIN
  FOR product_row IN
    SELECT p.id
    FROM "Product" p
    WHERE p."status" = 'ACTIVE'
      AND NOT EXISTS (
        SELECT 1
        FROM "ProductVariant" v
        WHERE v."productId" = p.id
          AND v."isActive" = true
      )
  LOOP
    SELECT pp."amountMinor"
      INTO base_amount
    FROM "ProductPrice" pp
    WHERE pp."productId" = product_row.id
      AND pp."currency" = 'INR'
      AND pp."isActive" = true
    ORDER BY pp."createdAt" DESC
    LIMIT 1;

    base_amount := COALESCE(base_amount, 0);

    variant_id := 'c' || substr(md5(random()::text || clock_timestamp()::text), 1, 24);
    INSERT INTO "ProductVariant" ("id", "productId", "name", "size", "isActive", "createdAt", "updatedAt")
    VALUES (variant_id, product_row.id, 'Small', '15 cm', true, NOW(), NOW());
    INSERT INTO "ProductVariantPrice" ("id", "variantId", "currency", "amountMinor", "isActive", "createdAt", "updatedAt")
    VALUES ('c' || substr(md5(random()::text || clock_timestamp()::text), 1, 24), variant_id, 'INR', base_amount, true, NOW(), NOW());

    variant_id := 'c' || substr(md5(random()::text || clock_timestamp()::text), 1, 24);
    INSERT INTO "ProductVariant" ("id", "productId", "name", "size", "isActive", "createdAt", "updatedAt")
    VALUES (variant_id, product_row.id, 'Medium', '20 cm', true, NOW(), NOW());
    INSERT INTO "ProductVariantPrice" ("id", "variantId", "currency", "amountMinor", "isActive", "createdAt", "updatedAt")
    VALUES ('c' || substr(md5(random()::text || clock_timestamp()::text), 1, 24), variant_id, 'INR', base_amount, true, NOW(), NOW());

    variant_id := 'c' || substr(md5(random()::text || clock_timestamp()::text), 1, 24);
    INSERT INTO "ProductVariant" ("id", "productId", "name", "size", "isActive", "createdAt", "updatedAt")
    VALUES (variant_id, product_row.id, 'Large', '25 cm', true, NOW(), NOW());
    INSERT INTO "ProductVariantPrice" ("id", "variantId", "currency", "amountMinor", "isActive", "createdAt", "updatedAt")
    VALUES ('c' || substr(md5(random()::text || clock_timestamp()::text), 1, 24), variant_id, 'INR', base_amount, true, NOW(), NOW());
  END LOOP;
END $$;
