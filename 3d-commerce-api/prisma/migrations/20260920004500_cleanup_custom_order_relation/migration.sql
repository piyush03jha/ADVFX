DROP INDEX IF EXISTS "Order_customRequestId_key";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_customRequestId_fkey";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "customRequestId";