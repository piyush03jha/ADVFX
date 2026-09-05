/*
  Warnings:

  - The values [USDA,USDC] on the enum `ProductFileFormat` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ProductFileFormat_new" AS ENUM ('ABC', 'USD', 'OBJ', 'PLY', 'STL', 'BVH', 'FBX', 'GLB', 'GLTF', 'PNG', 'JPG', 'JPEG', 'WEBP', 'SVG', 'PDF');
ALTER TABLE "ProductFile" ALTER COLUMN "format" TYPE "ProductFileFormat_new" USING ("format"::text::"ProductFileFormat_new");
ALTER TYPE "ProductFileFormat" RENAME TO "ProductFileFormat_old";
ALTER TYPE "ProductFileFormat_new" RENAME TO "ProductFileFormat";
DROP TYPE "public"."ProductFileFormat_old";
COMMIT;
