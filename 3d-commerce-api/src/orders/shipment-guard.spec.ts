import { guardShipmentUpdate, orderStatusForShipment } from './shipment-guard';

describe('guardShipmentUpdate', () => {
  it('maps shipment statuses to the order status they imply', () => {
    expect(orderStatusForShipment('SHIPPED')).toBe('SHIPPED');
    expect(orderStatusForShipment('IN_TRANSIT')).toBe('SHIPPED');
    expect(orderStatusForShipment('DELIVERED')).toBe('DELIVERED');
    expect(orderStatusForShipment('PENDING')).toBeNull();
    expect(orderStatusForShipment('LABEL_CREATED')).toBeNull();
    expect(orderStatusForShipment('EXCEPTION')).toBeNull();
  });

  it('keeps the order untouched for tracking-detail edits and neutral statuses', () => {
    expect(guardShipmentUpdate('PENDING_PAYMENT', undefined)).toEqual({ action: 'KEEP' });
    expect(guardShipmentUpdate('CANCELLED', 'LABEL_CREATED')).toEqual({ action: 'KEEP' });
    expect(guardShipmentUpdate('CONFIRMED', 'PENDING')).toEqual({ action: 'KEEP' });
  });

  it('advances a confirmed order through shipping and delivery', () => {
    for (const status of ['CONFIRMED', 'PROCESSING', 'READY_TO_SHIP']) {
      expect(guardShipmentUpdate(status, 'SHIPPED')).toEqual({ action: 'ADVANCE', to: 'SHIPPED' });
      expect(guardShipmentUpdate(status, 'IN_TRANSIT')).toEqual({ action: 'ADVANCE', to: 'SHIPPED' });
    }
    expect(guardShipmentUpdate('SHIPPED', 'DELIVERED')).toEqual({ action: 'ADVANCE', to: 'DELIVERED' });
  });

  it('does not move the order when it is already at the implied status', () => {
    expect(guardShipmentUpdate('SHIPPED', 'IN_TRANSIT')).toEqual({ action: 'KEEP' });
    expect(guardShipmentUpdate('DELIVERED', 'DELIVERED')).toEqual({ action: 'KEEP' });
  });

  it('rejects shipping or delivering an order that was never confirmed', () => {
    const result = guardShipmentUpdate('PENDING_PAYMENT', 'SHIPPED');
    expect(result.action).toBe('REJECT');
    expect((result as { message: string }).message).toContain('pending payment');
    expect((result as { message: string }).message).toContain('confirmed automatically');
    expect(guardShipmentUpdate('PENDING_PAYMENT', 'DELIVERED').action).toBe('REJECT');
  });

  it('rejects reviving cancelled or refunded orders', () => {
    for (const status of ['CANCELLED', 'REFUNDED']) {
      expect(guardShipmentUpdate(status, 'SHIPPED').action).toBe('REJECT');
      expect(guardShipmentUpdate(status, 'IN_TRANSIT').action).toBe('REJECT');
      expect(guardShipmentUpdate(status, 'DELIVERED').action).toBe('REJECT');
    }
  });

  it('rejects moving a delivered order back to shipped', () => {
    expect(guardShipmentUpdate('DELIVERED', 'SHIPPED').action).toBe('REJECT');
    expect(guardShipmentUpdate('DELIVERED', 'IN_TRANSIT').action).toBe('REJECT');
  });
});
