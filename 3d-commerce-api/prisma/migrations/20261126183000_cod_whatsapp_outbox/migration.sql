ALTER TABLE "Order" ADD COLUMN "whatsappPhone" TEXT, ADD COLUMN "whatsappOptedInAt" TIMESTAMP(3);
CREATE TABLE "WhatsAppOrderMessage" (
 "id" TEXT NOT NULL PRIMARY KEY, "orderId" TEXT NOT NULL, "event" TEXT NOT NULL,
 "recipient" TEXT NOT NULL, "parameters" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
 "attempts" INTEGER NOT NULL DEFAULT 0, "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "providerMessageId" TEXT, "lastError" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "WhatsAppOrderMessage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WhatsAppOrderMessage_orderId_event_key" ON "WhatsAppOrderMessage"("orderId", "event");
CREATE INDEX "WhatsAppOrderMessage_status_nextAttemptAt_idx" ON "WhatsAppOrderMessage"("status", "nextAttemptAt");
