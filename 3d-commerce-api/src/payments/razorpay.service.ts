import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import Razorpay from 'razorpay';
import { createHmac, timingSafeEqual } from 'node:crypto';

type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
};

@Injectable()
export class RazorpayService {
  private readonly keyId = process.env.RAZORPAY_KEY_ID ?? '';
  private readonly keySecret = process.env.RAZORPAY_KEY_SECRET ?? '';
  private readonly webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? '';
  private readonly client: Razorpay;

  constructor() {
    if (!this.keyId || !this.keySecret) {
      throw new InternalServerErrorException(
        'Razorpay credentials are not configured',
      );
    }

    this.client = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });
  }

  getPublicKeyId() {
    return this.keyId;
  }

  async createOrder(input: {
    amountMinor: number;
    currency: string;
    receipt: string;
  }): Promise<RazorpayOrder> {
    if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
      throw new InternalServerErrorException('Invalid Razorpay amount');
    }

    try {
      return (await this.client.orders.create({
        amount: input.amountMinor,
        currency: input.currency,
        receipt: input.receipt.slice(0, 40),
      })) as unknown as RazorpayOrder;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to create Razorpay order';
      throw new ServiceUnavailableException(message);
    }
  }

  verifyPaymentSignature(input: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    const expected = createHmac('sha256', this.keySecret)
      .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
      .digest('hex');

    return this.safeEqual(expected, input.razorpaySignature);
  }

  async fetchOrder(orderId: string) {
    try {
      return await this.client.orders.fetch(orderId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to fetch Razorpay order";
      throw new ServiceUnavailableException(message);
    }
  }

  async refundPayment(paymentId: string, amountMinor?: number) {
    try {
      const refund = await this.client.payments.refund(paymentId, amountMinor != null
        ? { amount: amountMinor }
        : {});
      return refund as { id: string; amount: number; status: string };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create Razorpay refund";
      throw new ServiceUnavailableException(message);
    }
  }

  verifyWebhookSignature(rawBody: string, signature: string) {
    if (!this.webhookSecret || !signature) return false;

    const expected = createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    return this.safeEqual(expected, signature);
  }

  private safeEqual(expected: string, received: string) {
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const receivedBuffer = Buffer.from(received, 'utf8');

    return (
      expectedBuffer.length === receivedBuffer.length &&
      timingSafeEqual(expectedBuffer, receivedBuffer)
    );
  }
}
