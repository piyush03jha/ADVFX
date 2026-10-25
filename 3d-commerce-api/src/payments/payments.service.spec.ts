import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  const prisma = { payment: { findFirst: jest.fn() }, $transaction: jest.fn() } as any;
  const razorpay = { verifyWebhookSignature: jest.fn() } as any;
  const notifications = { create: jest.fn() } as any;

  beforeEach(() => jest.resetAllMocks());

  it('marks a payment failure without confirming or cancelling the order', async () => {
    razorpay.verifyWebhookSignature.mockReturnValue(true);
    prisma.payment.findFirst.mockResolvedValue({ id: 'pay1', orderId: 'ord1', providerPaymentId: null, status: 'PENDING' });

    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'pay1' }]),
      payment: {
        findUnique: jest.fn().mockResolvedValue({ id: 'pay1', orderId: 'ord1', status: 'PENDING', providerPaymentId: null }),
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
