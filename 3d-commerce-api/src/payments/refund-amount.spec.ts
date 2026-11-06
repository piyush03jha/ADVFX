import { remainingRefundMinor } from './refund-amount';

describe('remainingRefundMinor', () => {
  it('refunds the full amount when nothing was refunded yet', () => {
    expect(remainingRefundMinor(249900, 0)).toBe(249900);
    expect(remainingRefundMinor(249900, undefined)).toBe(249900);
    expect(remainingRefundMinor(249900, null)).toBe(249900);
  });

  it('refunds only what is left after a partial refund', () => {
    expect(remainingRefundMinor(249900, 100000)).toBe(149900);
  });

  it('returns 0 when the payment was already fully refunded', () => {
    expect(remainingRefundMinor(249900, 249900)).toBe(0);
  });

  it('never goes negative and ignores invalid refunded amounts', () => {
    expect(remainingRefundMinor(249900, 300000)).toBe(0);
    expect(remainingRefundMinor(249900, -5)).toBe(249900);
    expect(remainingRefundMinor(249900, Number.NaN)).toBe(249900);
  });
});
