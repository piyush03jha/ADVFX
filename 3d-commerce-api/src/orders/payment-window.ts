/**
 * Products are made to order: nothing is reserved or decremented when an
 * order is placed. An unpaid order is simply allowed a fixed payment window,
 * measured from order creation, after which it is expired/cancelled.
 */
export const PAYMENT_WINDOW_MINUTES = 10;

export function paymentWindowCutoff(now: number = Date.now()): Date {
  return new Date(now - PAYMENT_WINDOW_MINUTES * 60_000);
}

export function isPaymentWindowOpen(createdAt: Date, now: number = Date.now()): boolean {
  return createdAt.getTime() > now - PAYMENT_WINDOW_MINUTES * 60_000;
}
