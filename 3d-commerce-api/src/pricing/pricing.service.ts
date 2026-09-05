import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CalculatePricingDto } from './dto/calculate-pricing.dto';

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async calculate(userId: string, dto: CalculatePricingDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                inventory: true,
                prices: {
                  where: { isActive: true },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) throw new BadRequestException('Cart is empty');

    const address = await this.prisma.address.findFirst({ where: { id: dto.shippingAddressId, userId } });
    if (!address) throw new NotFoundException('Shipping address not found');

    let subtotalMinor = 0;
    let totalWeightGrams = 0;
    let currency = 'INR';

    const items = cart.items.map((item) => {
      const product = item.product;
      const price = product.prices[0];
      if (product.status !== 'ACTIVE' || !price) throw new BadRequestException(`Product "${product.name}" is unavailable`);
      if (item.quantity <= 0) throw new BadRequestException(`Invalid quantity for "${product.name}"`);

      const lineTotalMinor = price.amountMinor * item.quantity;
      subtotalMinor += lineTotalMinor;
      currency = price.currency;
      totalWeightGrams += this.parseWeightGrams(product.weight) * item.quantity;

      const available = product.inventory?.trackStock && !product.inventory.allowBackorder
        ? Math.max(0, product.inventory.stock - product.inventory.reserved)
        : null;
      if (available !== null && item.quantity > available) {
        throw new BadRequestException(`Only ${available} unit(s) of "${product.name}" are currently available`);
      }

      return { productId: product.id, productName: product.name, quantity: item.quantity, unitPriceMinor: price.amountMinor, lineTotalMinor };
    });

    const shipping = await this.prisma.shippingRule.findFirst({
      where: {
        isActive: true,
        OR: [
          { countryCode: address.country, stateCode: address.state },
          { countryCode: address.country, stateCode: null },
          { countryCode: null, stateCode: null },
        ],
        AND: [
          { OR: [{ minWeightGrams: null }, { minWeightGrams: { lte: totalWeightGrams } }] },
          { OR: [{ maxWeightGrams: null }, { maxWeightGrams: { gte: totalWeightGrams } }] },
        ],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    if (!shipping) throw new BadRequestException('No shipping rule is available for this address');

    const shippingMinor = this.calculateShipping(shipping.type, shipping.amountMinor, shipping.freeAboveMinor, subtotalMinor);

    let discountMinor = 0;
    let promotion: { id: string; code: string | null; type: string; value: number } | null = null;
    if (dto.couponCode?.trim()) {
      const code = dto.couponCode.trim().toUpperCase();
      const found = await this.prisma.promotion.findFirst({ where: { code, isActive: true } });
      if (!found) throw new BadRequestException('Coupon code is invalid');
      const now = new Date();
      if (found.startsAt && found.startsAt > now) throw new BadRequestException('Coupon code is not active yet');
      if (found.endsAt && found.endsAt < now) throw new BadRequestException('Coupon code has expired');
      if (found.usageLimit !== null && found.usageCount >= found.usageLimit) throw new BadRequestException('Coupon usage limit has been reached');
      if (found.minSubtotalMinor !== null && subtotalMinor < found.minSubtotalMinor) throw new BadRequestException('Cart subtotal is too low for this coupon');

      discountMinor = found.type === 'PERCENTAGE'
        ? Math.floor(subtotalMinor * found.value / 10000)
        : found.value;
      discountMinor = Math.min(discountMinor, subtotalMinor);
      if (found.maxDiscountMinor !== null) discountMinor = Math.min(discountMinor, found.maxDiscountMinor);
      promotion = { id: found.id, code: found.code, type: found.type, value: found.value };
    }

    const taxRule = await this.prisma.taxRule.findFirst({
      where: {
        isActive: true,
        countryCode: address.country,
        OR: [{ stateCode: address.state }, { stateCode: null }],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    const taxableBase = subtotalMinor - discountMinor + (taxRule?.applyToShipping ? shippingMinor : 0);
    const taxMinor = taxRule ? Math.floor(Math.max(0, taxableBase) * taxRule.rateBps / 10000) : 0;
    const totalMinor = Math.max(0, subtotalMinor + shippingMinor + taxMinor - discountMinor);

    return {
      currency,
      items,
      shippingRule: shipping,
      promotion,
      taxRule,
      summary: { subtotalMinor, shippingMinor, discountMinor, taxMinor, totalMinor },
    };
  }

  private calculateShipping(type: string, amountMinor: number | null, freeAboveMinor: number | null, subtotalMinor: number) {
    if (type === 'FREE') return 0;
    if (type === 'FREE_ABOVE' && freeAboveMinor !== null && subtotalMinor >= freeAboveMinor) return 0;
    return amountMinor ?? 0;
  }

  private parseWeightGrams(value: string | null) {
    if (!value) return 0;
    const match = value.trim().toLowerCase().match(/([0-9]+(?:\.[0-9]+)?)\s*(kg|g|gram|grams|kilogram|kilograms)?/);
    if (!match) return 0;
    const amount = Number(match[1]);
    return ['kg', 'kilogram', 'kilograms'].includes(match[2] ?? '') ? Math.round(amount * 1000) : Math.round(amount);
  }
}
