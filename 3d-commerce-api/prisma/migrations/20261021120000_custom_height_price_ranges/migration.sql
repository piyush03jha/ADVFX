-- Height-range pricing for custom builds: the customer types a height and the
-- admin-configured range that contains it supplies the base price.
CREATE TABLE "CustomBuildHeightRange" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "minCm" DOUBLE PRECISION NOT NULL,
  "maxCm" DOUBLE PRECISION NOT NULL,
  "priceMinor" INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomBuildHeightRange_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CustomBuildHeightRange_categoryId_isActive_minCm_idx" ON "CustomBuildHeightRange"("categoryId","isActive","minCm");
ALTER TABLE "CustomBuildHeightRange" ADD CONSTRAINT "CustomBuildHeightRange_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CustomBuildCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Custom heights may be fractional (e.g. 12.5 cm).
ALTER TABLE "CustomRequest" ALTER COLUMN "sizeCm" TYPE DOUBLE PRECISION;

-- Seed ranges that reproduce the previous prices of the fixed size tiers for
-- every category except "person". Person pricing was body/frame based, so its
-- range prices start at 0 (body/frame add-ons still apply) and the admin sets
-- them in Custom Products.
INSERT INTO "CustomBuildHeightRange" ("id","categoryId","minCm","maxCm","priceMinor","sortOrder","isActive","updatedAt")
SELECT 'cbhr_' || c.slug || '_' || r.sortOrder, c.id, r.minCm, r.maxCm,
       CASE WHEN c.slug = 'person' THEN 0 ELSE ROUND(c."basePriceMinor" * r.multiplier)::INTEGER END,
       r.sortOrder, true, CURRENT_TIMESTAMP
FROM "CustomBuildCategory" c
CROSS JOIN (VALUES
  (1.0, 8.0, 0.75, 0),
  (8.1, 12.0, 0.9, 1),
  (12.1, 15.0, 1.0, 2),
  (15.1, 20.0, 1.35, 3),
  (20.1, 25.0, 1.75, 4),
  (25.1, 30.0, 2.15, 5)
) AS r(minCm, maxCm, multiplier, sortOrder);

-- Preset size options are replaced by the custom height input.
DELETE FROM "CustomBuildOption" WHERE "section" = 'size';
