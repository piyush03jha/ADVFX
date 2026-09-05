-- Create order idempotency key support.
ALTER TABLE "Order" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "Order_userId_idempotencyKey_key"
ON "Order"("userId", "idempotencyKey");
