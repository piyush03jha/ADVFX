/**
 * Allowed status changes for a return request. A return is approved before the
 * item comes back, and a refund is only issued for an approved (or received)
 * return, so a refund cannot be triggered straight from REQUESTED or from a
 * REJECTED request. REJECTED and REFUNDED are final.
 *
 * Kept free of Prisma imports so it can be unit tested on its own.
 */
export type ReturnStatusName =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'RECEIVED'
  | 'REFUNDED';

export const RETURN_TRANSITIONS: Record<ReturnStatusName, ReturnStatusName[]> = {
  REQUESTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['RECEIVED', 'REFUNDED', 'REJECTED'],
  RECEIVED: ['REFUNDED', 'REJECTED'],
  REJECTED: [],
  REFUNDED: [],
};

export function isReturnStatus(value: unknown): value is ReturnStatusName {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(RETURN_TRANSITIONS, value);
}

export function canTransitionReturn(from: string, to: string): boolean {
  return isReturnStatus(from) && isReturnStatus(to) && RETURN_TRANSITIONS[from].includes(to);
}
