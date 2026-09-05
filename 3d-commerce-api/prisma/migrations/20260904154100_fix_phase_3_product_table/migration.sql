/*
  Warnings:

  - You are about to drop the column `resolvedAt` on the `ReturnRequest` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[productFileId]` on the table `CustomRequestPreview` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('PERCENTAGE', 'FIXED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProductFileFormat" ADD VALUE 'USDA';
ALTER TYPE "ProductFileFormat" ADD VALUE 'USDC';

-- DropForeignKey
ALTER TABLE "InventoryReservation" DROP CONSTRAINT "InventoryReservation_productId_fkey";

-- DropIndex
DROP INDEX "InventoryReservation_expiresAt_status_idx";

-- DropIndex
DROP INDEX "InventoryReservation_orderId_productId_key";

-- DropIndex
DROP INDEX "InventoryReservation_productId_status_idx";

-- DropIndex
DROP INDEX "Order_userId_status_idx";

-- DropIndex
DROP INDEX "Shipment_carrier_trackingNumber_idx";

-- AlterTable
ALTER TABLE "CustomRequest" ADD COLUMN     "previewProductId" TEXT;

-- AlterTable
ALTER TABLE "CustomRequestPreview" ADD COLUMN     "productFileId" TEXT;

-- AlterTable
ALTER TABLE "InventoryReservation" ADD COLUMN     "consumedAt" TIMESTAMP(3),
ADD COLUMN     "productInventoryId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "appliedCouponCode" TEXT,
ADD COLUMN     "promotionId" TEXT;

-- AlterTable
ALTER TABLE "ReturnRequest" DROP COLUMN "resolvedAt";

-- CreateTable
CREATE TABLE "TaxRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "stateCode" TEXT,
    "rateBps" INTEGER NOT NULL,
    "applyToShipping" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT,
    "type" "PromotionType" NOT NULL,
    "value" INTEGER NOT NULL,
    "minSubtotalMinor" INTEGER,
    "maxDiscountMinor" INTEGER,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "usageLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaxRule_isActive_priority_idx" ON "TaxRule"("isActive", "priority");

-- CreateIndex
CREATE INDEX "TaxRule_countryCode_stateCode_idx" ON "TaxRule"("countryCode", "stateCode");

-- CreateIndex
CREATE UNIQUE INDEX "Promotion_code_key" ON "Promotion"("code");

-- CreateIndex
CREATE INDEX "Promotion_code_idx" ON "Promotion"("code");

-- CreateIndex
CREATE INDEX "Promotion_isActive_startsAt_endsAt_idx" ON "Promotion"("isActive", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomRequestPreview_productFileId_key" ON "CustomRequestPreview"("productFileId");

-- CreateIndex
CREATE INDEX "InventoryReservation_status_expiresAt_idx" ON "InventoryReservation"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "InventoryReservation_orderId_idx" ON "InventoryReservation"("orderId");

-- CreateIndex
CREATE INDEX "InventoryReservation_productId_idx" ON "InventoryReservation"("productId");

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_productInventoryId_fkey" FOREIGN KEY ("productInventoryId") REFERENCES "ProductInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRequest" ADD CONSTRAINT "CustomRequest_previewProductId_fkey" FOREIGN KEY ("previewProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRequestPreview" ADD CONSTRAINT "CustomRequestPreview_productFileId_fkey" FOREIGN KEY ("productFileId") REFERENCES "ProductFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
