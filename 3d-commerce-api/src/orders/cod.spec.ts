import { codAvailable, collectCod } from './cod';

describe('COD safeguards', () => {
  it('offers COD only when enabled for Indian rupee orders', () => {
    const original = process.env.COD_ENABLED;
    try {
      process.env.COD_ENABLED = 'true';
      expect(codAvailable('IN', 'INR')).toBe(true);
      expect(codAvailable('India', 'INR')).toBe(true);
      expect(codAvailable('US', 'INR')).toBe(false);
      expect(codAvailable('IN', 'USD')).toBe(false);
      process.env.COD_ENABLED = 'false';
      expect(codAvailable('IN', 'INR')).toBe(false);
    } finally {
      if (original === undefined) delete process.env.COD_ENABLED;
      else process.env.COD_ENABLED = original;
    }
  });
  it('rejects delivery without confirmed cash collection', async () => {
    const tx = { payment: { findUnique: jest.fn().mockResolvedValue({ provider: 'COD', status: 'PENDING' }), updateMany: jest.fn() } } as any;
    await expect(collectCod(tx, 'order-1', false)).rejects.toThrow('Confirm');
    expect(tx.payment.updateMany).not.toHaveBeenCalled();
  });
  it('records collected COD once and updates metrics', async () => {
    const tx = {
      payment: { findUnique: jest.fn().mockResolvedValue({ id: 'p', provider: 'COD', status: 'PENDING' }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      orderItem: { findMany: jest.fn().mockResolvedValue([{ productId: 'item', quantity: 2 }]) },
      productMetrics: { upsert: jest.fn() },
    } as any;
    await collectCod(tx, 'order-1', true);
    expect(tx.payment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'CAPTURED' }) }));
    expect(tx.productMetrics.upsert).toHaveBeenCalledTimes(1);
    tx.payment.findUnique.mockResolvedValue({ provider: 'COD', status: 'CAPTURED' });
    await collectCod(tx, 'order-1', true);
    expect(tx.payment.updateMany).toHaveBeenCalledTimes(1);
  });
});
