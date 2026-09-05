import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutQuoteDto } from './dto/checkout-quote.dto';
import { PricingService } from '../pricing/pricing.service';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  async getQuote(userId: string, dto: CheckoutQuoteDto) {
    const quote = await this.pricing.calculate(userId, {
      shippingAddressId: dto.shippingAddressId,
      couponCode: dto.couponCode,
    });

    const address = await this.prisma.address.findFirst({
      where: { id: dto.shippingAddressId, userId },
    });

    if (!address) throw new NotFoundException('Shipping address not found');

    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: { media: { orderBy: { sortOrder: 'asc' } } },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!cart || cart.items.length === 0) throw new BadRequestException('Cart is empty');

    const imageByProduct = new Map(
      cart.items.map((item) => [
        item.productId,
        item.product.media.find((media) => media.isPrimary && media.type === 'IMAGE')?.url ??
          item.product.media.find((media) => media.type === 'IMAGE')?.url ??
          null,
      ]),
    );

    return {
      currency: quote.currency,
      items: quote.items.map((item) => ({
        ...item,
        imageUrl: imageByProduct.get(item.productId) ?? null,
      })),
      shippingAddress: address,
      shipping: quote.shippingRule
        ? {
            amountMinor: quote.summary.shippingMinor,
            ruleId: quote.shippingRule.id,
            name: quote.shippingRule.name,
            estimatedMinDays: quote.shippingRule.estimatedMinDays,
            estimatedMaxDays: quote.shippingRule.estimatedMaxDays,
          }
        : { amountMinor: 0, ruleId: null, name: null, estimatedMinDays: null, estimatedMaxDays: null },
      promotion: quote.promotion,
      tax: quote.taxRule
        ? {
            ruleId: quote.taxRule.id,
            name: quote.taxRule.name,
            rateBps: quote.taxRule.rateBps,
          }
        : null,
      summary: quote.summary,
      payment: {
        required: true,
        status: 'NOT_STARTED',
        provider: 'RAZORPAY_PENDING_CONFIGURATION',
      },
    };
  }

  async getStatus(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { payment: true, shipment: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      payment: order.payment,
      shipment: order.shipment,
      totalMinor: order.totalMinor,
      currency: order.currency,
    };
  }
}
