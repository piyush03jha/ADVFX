import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CalculatePricingDto } from "./dto/calculate-pricing.dto";

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async calculate(userId: string, dto: CalculatePricingDto) {
    const address = await this.prisma.address.findFirst({
      where: { id: dto.shippingAddressId, userId },
    });
    if (!address) throw new NotFoundException("Shipping address not found");

    type PricingSourceItem = {
      productId: string;
      variantId: string | null;
      quantity: number;
      product: any;
      variant: any;
    };

    let sourceItems: PricingSourceItem[];

    if (dto.items?.length) {
      const productIds = [...new Set(dto.items.map((item) => item.productId))];
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
        include: {
          inventory: true,
          prices: {
            where: { isActive: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          variants: { include: { price: true } },
        },
      });

      const productById = new Map(products.map((product) => [product.id, product]));
      sourceItems = dto.items.map((item) => {
        const product = productById.get(item.productId);
        if (!product) {
          throw new BadRequestException("Product is unavailable");
        }
        const variant = item.variantId
          ? product.variants.find((candidate) => candidate.id === item.variantId)
          : null;
        if (item.variantId && !variant) {
          throw new BadRequestException("Selected variant is unavailable");
        }
        return {
          productId: product.id,
          variantId: variant?.id ?? null,
          quantity: item.quantity,
          product,
          variant,
        };
      });
    } else {
      const cart = await this.prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              variant: { include: { price: true } },
              product: {
                include: {
                  inventory: true,
                  prices: {
                    where: { isActive: true },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException("Cart is empty");
      }

      sourceItems = cart.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId ?? null,
        quantity: item.quantity,
        product: item.product,
        variant: item.variant,
      }));
    }

    let subtotalMinor = 0;
    let totalWeightGrams = 0;
    let currency = "INR";

    const items = sourceItems.map((item) => {
      const product = item.product;
      const variant = item.variant;
      const basePrice = product.prices[0];
      const variantPrice =
        variant?.isActive && variant.price?.isActive ? variant.price : null;
      const price = variantPrice ?? basePrice;

      if (product.status !== "ACTIVE" || !price) {
        throw new BadRequestException(
          'Product "' + product.name + '" is unavailable',
        );
      }

      if (
        variant &&
        (variant.productId !== product.id || !variant.isActive)
      ) {
        throw new BadRequestException(
          'Selected variant for "' + product.name + '" is unavailable',
        );
      }

      if (item.quantity <= 0) {
        throw new BadRequestException(
          'Invalid quantity for "' + product.name + '"',
        );
      }

      const lineTotalMinor = price.amountMinor * item.quantity;
      subtotalMinor += lineTotalMinor;
      currency = price.currency;
      totalWeightGrams +=
        this.parseWeightGrams(product.weight) * item.quantity;

      const available =
        product.inventory?.trackStock && !product.inventory.allowBackorder
          ? Math.max(
              0,
              product.inventory.stock - product.inventory.reserved,
            )
          : null;

      if (available !== null && item.quantity > available) {
        throw new BadRequestException(
          "Only " +
            available +
            ' unit(s) of "' +
            product.name +
            '" are currently available',
        );
      }

      return {
        productId: product.id,
        variantId: variant?.id ?? null,
        productName: product.name,
        variantName: variant?.name ?? null,
        quantity: item.quantity,
        unitPriceMinor: price.amountMinor,
        lineTotalMinor,
      };
    });

    const postalCode = address.postalCode.trim().toUpperCase();
    const deliveryZone = await this.prisma.deliveryZone.findUnique({
      where: { postalCode },
      select: { active: true, coverage: true },
    });

    if (deliveryZone?.active && deliveryZone.coverage === 'NOT_DELIVERED') {
      throw new BadRequestException(
        'We currently do not deliver to postal code ' + postalCode,
      );
    }

    const shipping = await this.prisma.shippingRule.findFirst({
      where: {
        isActive: true,
        OR: [
          { countryCode: address.country, stateCode: address.state },
          { countryCode: address.country, stateCode: null },
          { countryCode: null, stateCode: null },
        ],
        AND: [
          {
            OR: [
              { minWeightGrams: null },
              { minWeightGrams: { lte: totalWeightGrams } },
            ],
          },
          {
            OR: [
              { maxWeightGrams: null },
              { maxWeightGrams: { gte: totalWeightGrams } },
            ],
          },
        ],
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    // Shipping rules are optional during the initial checkout rollout.
    // Until an admin configures rules, every valid customer address remains
    // checkout-eligible and shipping is treated as free. Once rules exist,
    // the highest-priority matching rule is applied normally.
    const shippingMinor = shipping
      ? this.calculateShipping(
          shipping.type,
          shipping.amountMinor,
          shipping.freeAboveMinor,
          subtotalMinor,
        )
      : 0;

    let discountMinor = 0;
    let promotion: {
      id: string;
      code: string | null;
      type: string;
      value: number;
    } | null = null;

    if (dto.couponCode?.trim()) {
      const code = dto.couponCode.trim().toUpperCase();
      const found = await this.prisma.promotion.findFirst({
        where: { code, isActive: true },
      });

      if (!found) throw new BadRequestException("Coupon code is invalid");

      const now = new Date();
      if (found.startsAt && found.startsAt > now) {
        throw new BadRequestException("Coupon code is not active yet");
      }
      if (found.endsAt && found.endsAt < now) {
        throw new BadRequestException("Coupon code has expired");
      }
      if (found.usageLimit !== null && found.usageCount >= found.usageLimit) {
        throw new BadRequestException("Coupon usage limit has been reached");
      }
      if (
        found.minSubtotalMinor !== null &&
        subtotalMinor < found.minSubtotalMinor
      ) {
        throw new BadRequestException(
          "Cart subtotal is too low for this coupon",
        );
      }

      discountMinor =
        found.type === "PERCENTAGE"
          ? Math.floor((subtotalMinor * found.value) / 10000)
          : found.value;

      discountMinor = Math.min(discountMinor, subtotalMinor);

      if (found.maxDiscountMinor !== null) {
        discountMinor = Math.min(discountMinor, found.maxDiscountMinor);
      }

      promotion = {
        id: found.id,
        code: found.code,
        type: found.type,
        value: found.value,
      };
    }

    const taxRule = await this.prisma.taxRule.findFirst({
      where: {
        isActive: true,
        countryCode: address.country,
        OR: [{ stateCode: address.state }, { stateCode: null }],
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    const taxableBase =
      subtotalMinor -
      discountMinor +
      (taxRule?.applyToShipping ? shippingMinor : 0);

    const taxMinor = taxRule
      ? Math.floor(Math.max(0, taxableBase) * taxRule.rateBps / 10000)
      : 0;

    const totalMinor = Math.max(
      0,
      subtotalMinor + shippingMinor + taxMinor - discountMinor,
    );

    // Razorpay Orders require a positive amount. Reject zero-value checkout
    // rather than creating an order that cannot be paid.
    if (totalMinor <= 0) {
      throw new BadRequestException(
        "This order total is zero. Please adjust the coupon or cart before checkout.",
      );
    }

    return {
      currency,
      items,
      shippingRule: shipping,
      promotion,
      taxRule,
      summary: {
        subtotalMinor,
        shippingMinor,
        discountMinor,
        taxMinor,
        totalMinor,
      },
    };
  }

  private calculateShipping(
    type: string,
    amountMinor: number | null,
    freeAboveMinor: number | null,
    subtotalMinor: number,
  ) {
    if (type === "FREE") return 0;
    if (
      type === "FREE_ABOVE" &&
      freeAboveMinor !== null &&
      subtotalMinor >= freeAboveMinor
    ) {
      return 0;
    }
    return amountMinor ?? 0;
  }

  private parseWeightGrams(value: string | null) {
    if (!value) return 0;

    const match = value
      .trim()
      .toLowerCase()
      .match(
        /([0-9]+(?:\.[0-9]+)?)\s*(kg|g|gram|grams|kilogram|kilograms)?/,
      );

    if (!match) return 0;

    const amount = Number(match[1]);

    return ["kg", "kilogram", "kilograms"].includes(match[2] ?? "")
      ? Math.round(amount * 1000)
      : Math.round(amount);
  }
}
