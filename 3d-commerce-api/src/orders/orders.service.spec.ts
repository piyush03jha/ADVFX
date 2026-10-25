import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  const prisma = {
    order: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  } as any;
  const notifications = { create: jest.fn() } as any;
  const pricing = { calculate: jest.fn() } as any;
  const razorpay = { refundPayment: jest.fn() } as any;
  const observability = { captureException: jest.fn() } as any;
  const payments = { reconcileCapturedPayment: jest.fn() } as any;
  let service: OrdersService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new OrdersService(prisma, notifications, pricing, razorpay, payments, observability);
  });

  it('returns the existing order when concurrent requests collide on an idempotency key', async () => {
    const existing = {
      id: 'order-1',
      userId: 'user-1',
      orderNumber: 'ADV-2026-ORDER1',
      status: 'PENDING_PAYMENT',
    };
    prisma.order.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existing);
    pricing.calculate.mockResolvedValue({});
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(service.createFromCart('user-1', 'address-1', undefined, 'idem-1'))
      .resolves.toBe(existing);

    expect(prisma.order.findFirst).toHaveBeenCalledTimes(2);
    expect(notifications.create).toHaveBeenCalledWith('user-1', expect.objectContaining({
      type: 'ORDER_CREATED',
      entityId: 'order-1',
    }));
  });

  it('rejects invalid order status transitions', async () => {
    prisma.order.findUnique.mockResolvedValue({ id: 'order-1', status: 'DELIVERED' });
    await expect(service.updateStatus('order-1', 'PROCESSING' as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('allows confirmation only from pending payment', async () => {
    prisma.order.findUnique.mockResolvedValue({ id: 'order-1', status: 'PENDING_PAYMENT', userId: 'user-1' });
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'order-1' }]),
      order: { findUnique: jest.fn().mockResolvedValue({ status: 'PENDING_PAYMENT' }) },
      inventoryReservation: { findMany: jest.fn().mockResolvedValue([]) },
      productInventory: { findUnique: jest.fn(), updateMany: jest.fn() },
      order: { update: jest.fn().mockResolvedValue({ id: 'order-1', status: 'CONFIRMED' }) },
    } as any;
    prisma.$transaction.mockImplementation((callback: any) => callback(tx));
    await expect(service.updateStatus('order-1', 'CONFIRMED' as any)).resolves.toEqual({ id: 'order-1', status: 'CONFIRMED' });
  });

  it('releases active reservations when an order is cancelled', async () => {
    prisma.order.findUnique.mockResolvedValue({ id: 'order-1', status: 'PENDING_PAYMENT', userId: 'user-1' });
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'order-1' }]),
      order: {
        findUnique: jest.fn().mockResolvedValue({ status: 'PENDING_PAYMENT' }),
        update: jest.fn().mockResolvedValue({ id: 'order-1', status: 'CANCELLED', userId: 'user-1' }),
      },
      inventoryReservation: {
        findMany: jest.fn().mockResolvedValue([{ id: 'r1', productId: 'p1', productInventoryId: 'inventory-1', quantity: 2, status: 'ACTIVE' }]),
        update: jest.fn(),
      },
      productInventory: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      order: { update: jest.fn().mockResolvedValue({ id: 'order-1', status: 'CANCELLED', userId: 'user-1' }) },
    } as any;
    prisma.$transaction.mockImplementation((callback: any) => callback(tx));
    await service.updateStatus('order-1', 'CANCELLED' as any);
    expect(tx.productInventory.updateMany).toHaveBeenCalledWith({ where: { id: 'inventory-1', reserved: { gte: 2 } }, data: { reserved: { decrement: 2 } } });
    expect(tx.inventoryReservation.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'r1' }, data: expect.objectContaining({ status: 'RELEASED' }) }));
  });

  it('requests a provider refund before marking an order refunded', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'order-1', status: 'DELIVERED',
      payment: { status: 'CAPTURED', providerPaymentId: 'pay_1', amountMinor: 249900 }, userId: 'user-1',
    });
    razorpay.refundPayment.mockResolvedValue({ id: 'rfnd_1', status: 'processed' });
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'order-1' }]),
      order: {
        findUnique: jest.fn().mockResolvedValue({ status: 'DELIVERED' }),
        update: jest.fn().mockResolvedValue({ id: 'order-1', status: 'REFUNDED', userId: 'user-1' }),
      },
      inventoryReservation: { findMany: jest.fn().mockResolvedValue([]) },
      payment: { update: jest.fn() },
      order: { update: jest.fn().mockResolvedValue({ id: 'order-1', status: 'REFUNDED', userId: 'user-1' }) },
    } as any;
    prisma.$transaction.mockImplementation((callback: any) => callback(tx));
    await service.updateStatus('order-1', 'REFUNDED' as any);
    expect(razorpay.refundPayment).toHaveBeenCalledWith('pay_1', 249900);
    expect(tx.payment.update).toHaveBeenCalledWith({ where: { orderId: 'order-1' }, data: { status: 'REFUNDED' } });
  });
});
