-- CreateEnum
CREATE TYPE "ShippingRuleType" AS ENUM ('FREE', 'FLAT_RATE', 'FREE_ABOVE', 'WEIGHT_BASED');

-- CreateTable
CREATE TABLE "ShippingRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ShippingRuleType" NOT NULL,
    "amountMinor" INTEGER,
    "freeAboveMinor" INTEGER,
    "minWeightGrams" INTEGER,
    "maxWeightGrams" INTEGER,
    "countryCode" TEXT,
    "stateCode" TEXT,
    "estimatedMinDays" INTEGER,
    "estimatedMaxDays" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShippingRule_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Order" ADD COLUMN "shippingRuleId" TEXT;

CREATE INDEX "ShippingRule_isActive_priority_idx" ON "ShippingRule"("isActive", "priority");
CREATE INDEX "ShippingRule_countryCode_stateCode_idx" ON "ShippingRule"("countryCode", "stateCode");

ALTER TABLE "Order" ADD CONSTRAINT "Order_shippingRuleId_fkey" FOREIGN KEY ("shippingRuleId") REFERENCES "ShippingRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
