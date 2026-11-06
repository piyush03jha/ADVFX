import { canTransitionReturn, isReturnStatus } from './return-transitions';

describe('return request transitions', () => {
  it('recognises only real return statuses', () => {
    for (const status of ['REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED', 'REFUNDED']) {
      expect(isReturnStatus(status)).toBe(true);
    }
    for (const status of ['PENDING', 'refunded', '', 'toString', '__proto__', undefined, null, 5]) {
      expect(isReturnStatus(status)).toBe(false);
    }
  });

  it('follows the approve -> receive -> refund path', () => {
    expect(canTransitionReturn('REQUESTED', 'APPROVED')).toBe(true);
    expect(canTransitionReturn('APPROVED', 'RECEIVED')).toBe(true);
    expect(canTransitionReturn('RECEIVED', 'REFUNDED')).toBe(true);
    expect(canTransitionReturn('APPROVED', 'REFUNDED')).toBe(true);
  });

  it('allows rejecting before the return is closed', () => {
    expect(canTransitionReturn('REQUESTED', 'REJECTED')).toBe(true);
    expect(canTransitionReturn('APPROVED', 'REJECTED')).toBe(true);
    expect(canTransitionReturn('RECEIVED', 'REJECTED')).toBe(true);
  });

  it('never refunds an unapproved or rejected request', () => {
    expect(canTransitionReturn('REQUESTED', 'REFUNDED')).toBe(false);
    expect(canTransitionReturn('REJECTED', 'REFUNDED')).toBe(false);
  });

  it('treats REJECTED and REFUNDED as final', () => {
    for (const to of ['REQUESTED', 'APPROVED', 'RECEIVED', 'REJECTED', 'REFUNDED']) {
      expect(canTransitionReturn('REJECTED', to)).toBe(false);
      expect(canTransitionReturn('REFUNDED', to)).toBe(false);
    }
  });

  it('does not allow going backwards or skipping to the same status', () => {
    expect(canTransitionReturn('APPROVED', 'REQUESTED')).toBe(false);
    expect(canTransitionReturn('RECEIVED', 'APPROVED')).toBe(false);
    expect(canTransitionReturn('APPROVED', 'APPROVED')).toBe(false);
  });
});
