-- Harden authentication/payment state.
ALTER TABLE "User"
  ADD COLUMN "adminFailedLoginCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "adminLockedUntil" TIMESTAMP(3);

CREATE TABLE "PaymentAttempt" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "providerOrderId" TEXT NOT NULL,
  "providerPaymentId" TEXT,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentAttempt_providerOrderId_key"
  ON "PaymentAttempt"("providerOrderId");
CREATE INDEX "PaymentAttempt_paymentId_createdAt_idx"
  ON "PaymentAttempt"("paymentId", "createdAt");
CREATE INDEX "PaymentAttempt_providerPaymentId_idx"
  ON "PaymentAttempt"("providerPaymentId");
CREATE INDEX "PaymentAttempt_status_idx"
  ON "PaymentAttempt"("status");

ALTER TABLE "PaymentAttempt"
  ADD CONSTRAINT "PaymentAttempt_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
