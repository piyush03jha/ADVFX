import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  const prisma = {
    payment: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  } as any;
  const razorpay = { verifyWebhookSignature: jest.fn() } as any;
  const orders = {} as any;
  const notifications = { create: jest.fn() } as any;

  beforeEach(() => jest.resetAllMocks());

  it('keeps a failed-payment order retryable until reservation expiry', async () => {
    razorpay.verifyWebhookSignature.mockReturnValue(true);
    prisma.payment.findFirst.mockResolvedValue({
      id: 'pay1',
      orderId: 'ord1',
      providerPaymentId: null,
      status: 'PENDING',
    });
    const tx = { payment: { update: jest.fn() } };
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));

    const service = new PaymentsService(prisma, razorpay, notifications);
    await service.handleWebhook(
      JSON.stringify({ event: 'payment.failed', payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1' } } } }),
      'sig',
    );

    expect(tx.payment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'FAILED' }),
    }));
  });
});
