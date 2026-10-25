import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  const prisma = { payment: { findFirst: jest.fn() }, $transaction: jest.fn() } as any;
  const razorpay = { verifyWebhookSignature: jest.fn() } as any;
  const notifications = { create: jest.fn() } as any;
  let service: PaymentsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new PaymentsService(prisma, razorpay, notifications);
  });

  it('marks a payment failure without confirming or cancelling the order', async () => {
    razorpay.verifyWebhookSignature.mockReturnValue(true);
    prisma.payment.findFirst.mockResolvedValue({ id: 'pay1', orderId: 'ord1', providerPaymentId: null, status: 'PENDING' });

    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'pay1' }]),
      payment: {
        findUnique: jest.fn().mockResolvedValue({ id: 'pay1', orderId: 'ord1', providerOrderId: 'order_1', status: 'PENDING', providerPaymentId: null }),
        update: jest.fn(),
      },
      paymentAttempt: {
        findUnique: jest.fn().mockResolvedValue({ id: 'attempt1', paymentId: 'pay1', status: 'PENDING', providerPaymentId: null }),
        update: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));

    const service = new PaymentsService(prisma, razorpay, notifications);
    await service.handleWebhook(JSON.stringify({ event: 'payment.failed', payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1' } } } }), 'sig');

    expect(tx.payment.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }));
    expect(tx.paymentAttempt.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'attempt1' }, data: expect.objectContaining({ status: 'FAILED', providerPaymentId: 'pay_1' }) }));
    expect(tx).not.toHaveProperty('order.update');
  });

  it('does not let an old failed webhook fail a newer active payment attempt', async () => {
    razorpay.verifyWebhookSignature.mockReturnValue(true);
    prisma.payment.findFirst.mockResolvedValue({ id: 'pay1', orderId: 'ord1', providerPaymentId: null, status: 'PENDING' });

    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'pay1' }]),
      payment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'pay1', orderId: 'ord1', providerOrderId: 'new_order', status: 'PENDING', providerPaymentId: null,
        }),
        update: jest.fn(),
      },
      paymentAttempt: {
        findUnique: jest.fn().mockResolvedValue({ id: 'old_attempt', paymentId: 'pay1', status: 'PENDING', providerPaymentId: null }),
        update: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));

    const service = new PaymentsService(prisma, razorpay, notifications);
    await service.handleWebhook(
      JSON.stringify({ event: 'payment.failed', payload: { payment: { entity: { id: 'pay_old', order_id: 'old_order' } } } }),
      'sig',
    );

    expect(tx.paymentAttempt.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'old_attempt' },
      data: expect.objectContaining({ status: 'FAILED' }),
    }));
    expect(tx.payment.update).not.toHaveBeenCalled();
  });

  it('consumes variant reservations as well as base-product inventory', async () => {
    const tx = {
      inventoryReservation: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'rv1', productId: 'p1', productVariantId: 'v1', productInventoryId: null, quantity: 2 },
        ]),
        update: jest.fn(),
      },
      productVariant: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      productInventory: { updateMany: jest.fn() },
    };
    const service = new PaymentsService(prisma, razorpay, notifications);

    await (service as any).consumeReservationsInTransaction(tx, 'ord1');

    expect(tx.productVariant.updateMany).toHaveBeenCalledWith({
      where: { id: 'v1', stock: { gte: 2 }, reserved: { gte: 2 } },
      data: { stock: { decrement: 2 }, reserved: { decrement: 2 } },
    });
    expect(tx.inventoryReservation.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'rv1' },
      data: expect.objectContaining({ status: 'CONSUMED' }),
    }));
    expect(tx.productInventory.updateMany).not.toHaveBeenCalled();
  });

  it('does not consume a reservation if the atomic stock guard fails', async () => {
    const tx = {
      inventoryReservation: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'rv1', productId: 'p1', productVariantId: 'v1', productInventoryId: null, quantity: 2 },
        ]),
        update: jest.fn(),
      },
      productVariant: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      productInventory: { updateMany: jest.fn() },
    };
    const service = new PaymentsService(prisma, razorpay, notifications);

    await expect((service as any).consumeReservationsInTransaction(tx, 'ord1'))
      .rejects.toThrow(BadRequestException);

    expect(tx.inventoryReservation.update).not.toHaveBeenCalled();
    expect(tx.productInventory.updateMany).not.toHaveBeenCalled();
  });

  it('releases variant reservations when payment is cancelled', async () => {
    const tx = {
      inventoryReservation: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'rv1', productId: 'p1', productVariantId: 'v1', productInventoryId: null, quantity: 2 },
        ]),
        update: jest.fn(),
      },
      productVariant: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      productInventory: { updateMany: jest.fn() },
    };
    const service = new PaymentsService(prisma, razorpay, notifications);

    await (service as any).releaseReservationsInTransaction(tx, 'ord1');

    expect(tx.productVariant.updateMany).toHaveBeenCalledWith({
      where: { id: 'v1', reserved: { gte: 2 } },
      data: { reserved: { decrement: 2 } },
    });
    expect(tx.inventoryReservation.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'rv1' },
      data: expect.objectContaining({ status: 'RELEASED' }),
    }));
    expect(tx.productInventory.updateMany).not.toHaveBeenCalled();
  });

  it('treats a duplicate captured webhook as idempotent', async () => {
    razorpay.verifyWebhookSignature.mockReturnValue(true);
    prisma.paymentAttempt = {
      findUnique: jest.fn().mockResolvedValue({
        id: 'attempt1',
        paymentId: 'pay1',
        providerOrderId: 'order_1',
        providerPaymentId: 'pay_1',
        amountMinor: 2500,
        currency: 'INR',
        payment: { orderId: 'ord1' },
      }),
    };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'pay1' }]),
      payment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'pay1', orderId: 'ord1', status: 'CAPTURED',
          providerPaymentId: 'pay_1', amountMinor: 2500, currency: 'INR',
        }),
        update: jest.fn(),
      },
      order: { findUnique: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));

    await expect(service.handleWebhook(JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: {
        id: 'pay_1', order_id: 'order_1', amount: 2500, currency: 'INR',
      } } },
    }), 'sig')).resolves.toEqual({ received: true });

    expect(tx.payment.update).not.toHaveBeenCalled();
    expect(tx.order.findUnique).not.toHaveBeenCalled();
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('ignores a late payment.failed webhook after the payment is captured', async () => {
    razorpay.verifyWebhookSignature.mockReturnValue(true);
    prisma.payment.findFirst.mockResolvedValue({
      id: 'pay1', orderId: 'ord1', providerOrderId: 'order_1', status: 'CAPTURED',
    });

    await expect(service.handleWebhook(JSON.stringify({
      event: 'payment.failed',
      payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1' } } },
    }), 'sig')).resolves.toEqual({ received: true });

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('refunds a second captured provider payment once without refunding the primary payment record', async () => {
    razorpay.verifyWebhookSignature.mockReturnValue(true);
    razorpay.refundPayment = jest.fn().mockResolvedValue({ id: 'rfnd_extra', status: 'processed' });
    prisma.paymentAttempt = {
      findUnique: jest.fn()
        .mockResolvedValueOnce({
          id: 'attempt2', paymentId: 'pay1', providerOrderId: 'order_2',
          providerPaymentId: null, amountMinor: 2500, currency: 'INR',
          status: 'PENDING', payment: { orderId: 'ord1' },
        })
        .mockResolvedValueOnce({
          id: 'attempt2', paymentId: 'pay1', providerOrderId: 'order_2',
          providerPaymentId: 'pay_extra', amountMinor: 2500, currency: 'INR',
          status: 'REFUNDED', payment: { orderId: 'ord1' },
        }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'pay1' }]),
      payment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'pay1', orderId: 'ord1', status: 'CAPTURED',
          providerPaymentId: 'pay_primary', providerOrderId: 'order_primary',
          amountMinor: 2500, currency: 'INR',
        }),
        update: jest.fn(),
      },
      order: { findUnique: jest.fn().mockResolvedValue({ id: 'ord1', status: 'CONFIRMED', items: [] }) },
    };
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));

    const event = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: {
        id: 'pay_extra', order_id: 'order_2', amount: 2500, currency: 'INR',
      } } },
    });
    await expect(service.handleWebhook(event, 'sig')).resolves.toEqual({ received: true });
    await expect(service.handleWebhook(event, 'sig')).resolves.toEqual({ received: true });

    expect(razorpay.refundPayment).toHaveBeenCalledTimes(1);
    expect(prisma.paymentAttempt.updateMany).toHaveBeenCalledTimes(2);
    expect(prisma.payment.update).not.toHaveBeenCalled();
    expect(tx.payment.update).not.toHaveBeenCalled();
  });

  it('locks the payment row and reuses an existing active Razorpay order', async () => {
    const payment = {
      id: 'pay1',
      provider: 'RAZORPAY',
      providerOrderId: 'order_provider_1',
      status: 'PENDING',
      amountMinor: 2500,
      currency: 'INR',
    };
    const order = {
      id: 'order1',
      userId: 'user1',
      orderNumber: 'VXL-1',
      status: 'PENDING_PAYMENT',
      totalMinor: 2500,
      currency: 'INR',
      payment,
    };
    const tx = {
      order: { findFirst: jest.fn().mockResolvedValueOnce({ id: 'order1', payment: { id: 'pay1' } }).mockResolvedValueOnce(order) },
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'pay1' }]),
      inventoryReservation: { findFirst: jest.fn().mockResolvedValue({ id: 'reservation1', status: 'ACTIVE' }) },
      paymentAttempt: { create: jest.fn() },
      payment: { update: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));
    razorpay.createOrder = jest.fn();
    razorpay.getPublicKeyId = jest.fn().mockReturnValue('rzp_test_key');

    const service = new PaymentsService(prisma, razorpay, notifications);
    await expect(service.createRazorpayOrder('user1', 'order1')).resolves.toMatchObject({
      razorpayOrderId: 'order_provider_1',
      orderId: 'order1',
    });

    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(razorpay.createOrder).not.toHaveBeenCalled();
    expect(tx.paymentAttempt.create).not.toHaveBeenCalled();
  });

});
