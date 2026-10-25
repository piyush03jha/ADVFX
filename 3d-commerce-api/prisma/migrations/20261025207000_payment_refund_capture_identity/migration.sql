ALTER TABLE "PaymentAttempt" ADD COLUMN "refundProviderPaymentId" TEXT;

CREATE UNIQUE INDEX "PaymentAttempt_refundProviderPaymentId_key"
ON "PaymentAttempt"("refundProviderPaymentId");
