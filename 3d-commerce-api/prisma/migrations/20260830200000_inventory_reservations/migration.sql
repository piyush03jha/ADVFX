-- Add inventory reservation support for physical products.
ALTER TABLE "ProductInventory"
  ADD COLUMN "reserved" INTEGER NOT NULL DEFAULT 0;

CREATE TYPE "InventoryReservationStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'RELEASED', 'EXPIRED');

CREATE TABLE "InventoryReservation" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "status" "InventoryReservationStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "releasedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryReservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryReservation_orderId_productId_key"
  ON "InventoryReservation"("orderId", "productId");
CREATE INDEX "InventoryReservation_productId_status_idx"
  ON "InventoryReservation"("productId", "status");
CREATE INDEX "InventoryReservation_expiresAt_status_idx"
  ON "InventoryReservation"("expiresAt", "status");

ALTER TABLE "InventoryReservation"
  ADD CONSTRAINT "InventoryReservation_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryReservation"
  ADD CONSTRAINT "InventoryReservation_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
