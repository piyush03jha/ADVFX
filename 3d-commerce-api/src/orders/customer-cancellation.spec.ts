import { canCancelBeforeShipment } from './customer-cancellation';
import { OrdersService } from './orders.service';

describe('Customer cancellation before dispatch', () => {
  it.each(['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'READY_TO_SHIP'])('allows %s before dispatch', (status) => {
    expect(canCancelBeforeShipment({ status, shipment: { status: 'LABEL_CREATED' } })).toBe(true);
  });
  it.each(['SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'])('rejects %s', (status) => {
    expect(canCancelBeforeShipment({ status, shipment: { status: 'PENDING' } })).toBe(false);
  });
  it('rejects dispatch evidence even if order status is stale', () => {
    expect(canCancelBeforeShipment({ status: 'READY_TO_SHIP', shipment: { status: 'IN_TRANSIT' } })).toBe(false);
    expect(canCancelBeforeShipment({ status: 'PROCESSING', shipment: { status: 'PENDING', shippedAt: new Date() } })).toBe(false);
    expect(canCancelBeforeShipment({ status: 'PROCESSING', shipment: { status: 'EXCEPTION' } })).toBe(false);
  });

  const makeService = (order: any) => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'o' }]),
      order: { findFirst: jest.fn().mockResolvedValue(order), update: jest.fn().mockResolvedValue({ ...order, status: 'CANCELLED', payment: { ...order?.payment, status: 'FAILED' } }) },
      payment: { update: jest.fn() },
      whatsAppOrderMessage: { updateMany: jest.fn() },
      customRequest: { updateMany: jest.fn() },
    };
    const prisma = { order: { findFirst: jest.fn().mockResolvedValue(order ? { id: 'o' } : null) }, $transaction: jest.fn((cb) => cb(tx)) } as any;
    const notifications = { create: jest.fn().mockResolvedValue({}) } as any;
    const razorpay = { refundPayment: jest.fn() } as any;
    const service = new OrdersService(prisma, notifications, {} as any, razorpay, {} as any, {} as any);
    return { tx, prisma, service, razorpay, notifications };
  };

  it('rejects another customer order without modifying it', async () => {
    const { service, prisma } = makeService(null);
    await expect(service.cancelMine('u', 'o')).rejects.toThrow('Order not found');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('cancels unpaid COD without calling Razorpay', async () => {
    const { service, tx, razorpay } = makeService({ id: 'o', userId: 'u', orderNumber: 'TEST', status: 'CONFIRMED', shipment: { status: 'PENDING' }, payment: { id: 'p', provider: 'COD', status: 'PENDING' } });
    await expect(service.cancelMine('u', 'o')).resolves.toEqual({ id: 'o', status: 'CANCELLED', paymentStatus: 'FAILED' });
    expect(tx.payment.update).toHaveBeenCalledWith({ where: { id: 'p' }, data: { status: 'FAILED' } });
    expect(razorpay.refundPayment).not.toHaveBeenCalled();
  });
  it('rejects an order shipped between initial ownership check and row lock', async () => {
    const { service, tx } = makeService({ id: 'o', status: 'SHIPPED', shipment: { status: 'SHIPPED' } });
    await expect(service.cancelMine('u', 'o')).rejects.toThrow('no longer be cancelled');
    expect(tx.order.update).not.toHaveBeenCalled();
  });
  it('does not cancel a pending active online payment until reconciled', async () => {
    const { service, tx } = makeService({ id: 'o', status: 'PENDING_PAYMENT', payment: { id: 'p', provider: 'RAZORPAY', status: 'PENDING', providerOrderId: 'rp' } });
    await expect(service.cancelMine('u', 'o')).rejects.toThrow('being reconciled');
    expect(tx.order.update).not.toHaveBeenCalled();
  });
});
