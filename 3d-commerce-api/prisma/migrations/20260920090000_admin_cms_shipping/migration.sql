CREATE TYPE "DeliveryCoverage" AS ENUM ('DELIVERED', 'NOT_DELIVERED');

CREATE TABLE "SiteSetting" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SiteSetting_key_key" ON "SiteSetting"("key");

CREATE TABLE "DeliveryZone" (
  "id" TEXT NOT NULL,
  "postalCode" TEXT NOT NULL,
  "coverage" "DeliveryCoverage" NOT NULL DEFAULT 'DELIVERED',
  "label" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeliveryZone_postalCode_key" ON "DeliveryZone"("postalCode");
CREATE INDEX "DeliveryZone_coverage_active_idx" ON "DeliveryZone"("coverage", "active");
