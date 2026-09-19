import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  const prisma = {
    payment: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  } as any;
  const razorpay = { verifyWebhookSignature: jest.fn() } as any;
  const notifications = { create: jest.fn() } as any;

  beforeEach(() => jest.resetAllMocks());

  it('marks a payment failure without confirming the order', async () => {
    razorpay.verifyWebhookSignature.mockReturnValue(true);
    prisma.payment.findFirst.mockResolvedValue({
      id: 'pay1',
      orderId: 'ord1',
      providerPaymentId: null,
      status: 'PENDING',
    });

    const tx = {
      payment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'pay1',
          orderId: 'ord1',
          status: 'PENDING',
          providerPaymentId: null,
        }),
        update: jest.fn(),
      },
      order: {
        findUnique: jest.fn().mockResolvedValue({
          status: 'PENDING_PAYMENT',
          promotionId: null,
        }),
        update: jest.fn(),
      },
      inventoryReservation: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      productInventory: {
        updateMany: jest.fn(),
      },
      cart: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      cartItem: {
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));

    const service = new PaymentsService(prisma, razorpay, notifications);

    await service.handleWebhook(
      JSON.stringify({
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_1',
              order_id: 'order_1',
            },
          },
        },
      }),
      'sig',
    );

    expect(tx.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
    expect(tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'CANCELLED' },
      }),
    );
  });
});
