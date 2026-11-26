import { normalizeWhatsAppPhone, queueWhatsAppOrder } from './whatsapp-order';

describe('WhatsApp order notifications', () => {
  it('normalizes Indian numbers and rejects invalid destinations', () => {
    expect(normalizeWhatsAppPhone('+91 98765 43210', 'IN')).toBe('919876543210');
    expect(normalizeWhatsAppPhone('9876543210', 'India')).toBe('919876543210');
    expect(normalizeWhatsAppPhone('abc', 'IN')).toBeNull();
    expect(normalizeWhatsAppPhone('1234567890', 'US')).toBeNull();
  });
  it('requires consent and actual shipment tracking details', async () => {
    const tx = { whatsAppOrderMessage: { upsert: jest.fn() } } as any;
    const order = { id: 'o', orderNumber: 'TEST', totalMinor: 10000, currency: 'INR', whatsappPhone: '919876543210' };
    await queueWhatsAppOrder(tx, order, 'CONFIRMED');
    const optedIn = { ...order, whatsappOptedInAt: new Date() };
    await queueWhatsAppOrder(tx, optedIn, 'SHIPPED');
    expect(tx.whatsAppOrderMessage.upsert).not.toHaveBeenCalled();
    await queueWhatsAppOrder(tx, optedIn, 'SHIPPED', { carrier: 'DTDC', trackingNumber: 'sample' });
    expect(tx.whatsAppOrderMessage.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { orderId_event: { orderId: 'o', event: 'SHIPPED' } },
      create: expect.objectContaining({ parameters: ['TEST', 'DTDC', 'sample'] }),
    }));
  });
});
