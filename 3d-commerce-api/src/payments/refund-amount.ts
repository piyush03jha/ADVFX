/**
 * Amount that can still be refunded on a captured Razorpay payment.
 *
 * Razorpay rejects a refund that exceeds what is left on the payment. If an
 * earlier attempt already refunded it (the call reached Razorpay but the
 * database update failed, or an admin clicked twice), refunding the full
 * amount again would fail and leave the order stuck as paid even though the
 * customer has their money back. Refunding only the remainder makes the
 * operation safe to retry.
 *
 * Kept free of Prisma/Nest imports so it can be unit tested on its own.
 */
export function remainingRefundMinor(
  paidMinor: number,
  alreadyRefundedMinor?: number | null,
): number {
  const refunded =
    typeof alreadyRefundedMinor === 'number' &&
    Number.isFinite(alreadyRefundedMinor) &&
    alreadyRefundedMinor > 0
      ? alreadyRefundedMinor
      : 0;
  return Math.max(0, paidMinor - refunded);
}
