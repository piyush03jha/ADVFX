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
          category: { select: { id: true, name: true, parentId: true, gstRateBps: true } },
          inventory: true,
          prices: {
            where: {
              isActive: true,
              countryCode: null,
              AND: [
                { OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] },
                { OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
              ],
            },
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
            // Match CartService.getOrCreate: archived and draft products are
            // not purchasable and must not block checkout with stale cart rows.
            where: { product: { status: 'ACTIVE' } },
            include: {
              variant: { include: { price: true } },
              product: {
                include: {
                  category: { select: { id: true, name: true, gstRateBps: true } },
                  inventory: true,
                  prices: {
                    where: {
                      isActive: true,
                      countryCode: null,
                      AND: [
                        { OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] },
                        { OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
                      ],
                    },
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

    const saleSetting = await this.prisma.siteSetting.findUnique({ where: { key: "saleCampaign" } });
    let saleCampaign: { enabled: boolean; categoryId?: string | null; priceIncreaseBps: number; discountBps: number; startsAt?: string | null; endsAt?: string | null } | null = null;
    try {
      saleCampaign = saleSetting ? JSON.parse(saleSetting.value) : null;
    } catch {
      saleCampaign = null;
    }
    const now = new Date();
    const saleActive = saleCampaign?.enabled === true
      && (!saleCampaign.startsAt || new Date(saleCampaign.startsAt) <= now)
      && (!saleCampaign.endsAt || new Date(saleCampaign.endsAt) > now);

    let subtotalMinor = 0;
    let saleDiscountMinor = 0;
    let saleSubtotalMinor = 0;
    let totalWeightGrams = 0;
    let currency: string | null = null;

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

      // A selected variant must be sold at its own active price. Falling back
      // to the legacy product-level price would charge a different amount
      // than the storefront shows.
      if (variant && !variantPrice) {
        throw new BadRequestException(
          'Selected variant for "' + product.name + '" has no active price',
        );
      }

      if (item.quantity <= 0) {
        throw new BadRequestException(
          'Invalid quantity for "' + product.name + '"',
        );
      }

      if (currency !== null && currency !== price.currency) {
        throw new BadRequestException(
          "All items in a checkout must use the same currency",
        );
      }

      const saleApplies = saleActive && (!saleCampaign?.categoryId || saleCampaign.categoryId === product.categoryId || saleCampaign.categoryId === product.category?.parentId);
      const priceIncreaseBps = saleApplies ? Math.min(10000, Math.max(0, Number(saleCampaign?.priceIncreaseBps) || 0)) : 0;
      const saleDiscountBps = saleApplies ? Math.min(10000, Math.max(0, Number(saleCampaign?.discountBps) || 0)) : 0;
      const saleListUnitPriceMinor = saleApplies
        ? Math.round(price.amountMinor * (10000 + priceIncreaseBps) / 10000)
        : price.amountMinor;
      const unitPriceMinor = saleApplies
        ? Math.round(saleListUnitPriceMinor * (10000 - saleDiscountBps) / 10000)
        : price.amountMinor;
      const lineTotalMinor = unitPriceMinor * item.quantity;
      const saleListLineTotalMinor = saleListUnitPriceMinor * item.quantity;
      const itemSaleDiscountMinor = saleListLineTotalMinor - lineTotalMinor;
      const taxRateBps = product.category?.gstRateBps ?? 0;
      subtotalMinor += saleListLineTotalMinor;
      saleDiscountMinor += itemSaleDiscountMinor;
      saleSubtotalMinor += lineTotalMinor;
      currency = price.currency;
      totalWeightGrams +=
        this.parseWeightGrams(product.weight) * item.quantity;

      const inventory = variant ?? product.inventory;
      const available =
        inventory?.trackStock && !inventory.allowBackorder
          ? Math.max(0, inventory.stock - inventory.reserved)
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
        material: product.material ?? null,
        size: variant?.size ?? variant?.name ?? null,
        taxRateBps,
        taxMinor: taxRateBps > 0 ? Math.round(lineTotalMinor * taxRateBps / (10000 + taxRateBps)) : 0,
        manufacturingCostSnapshot: variant?.price?.costBreakdown ?? null,
        saleSnapshot: saleApplies ? {
          baseUnitPriceMinor: price.amountMinor,
          saleListUnitPriceMinor,
          saleUnitPriceMinor: unitPriceMinor,
          priceIncreaseBps,
          discountBps: saleDiscountBps,
          discountMinor: saleListUnitPriceMinor - unitPriceMinor,
        } : null,
        quantity: item.quantity,
        unitPriceMinor,
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
          saleSubtotalMinor,
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

      if (found.usageLimitPerUser != null) {
        const customerUses = await this.prisma.order.count({
          where: {
            userId,
            promotionId: found.id,
            status: { notIn: ["CANCELLED", "REFUNDED"] },
          },
        });
        if (customerUses >= found.usageLimitPerUser) {
          throw new BadRequestException("You have reached the usage limit for this coupon");
        }
      }
      if (
        found.minSubtotalMinor !== null &&
        saleSubtotalMinor < found.minSubtotalMinor
      ) {
        throw new BadRequestException(
          "Cart subtotal is too low for this coupon",
        );
      }

      discountMinor =
        found.type === "PERCENTAGE"
          ? Math.floor((saleSubtotalMinor * found.value) / 10000)
          : found.value;

      discountMinor = Math.min(discountMinor, saleSubtotalMinor);

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

    // Product prices are tax-inclusive. Extract category GST from the
    // already displayed price; never add it a second time at checkout.
    const pricedItems = items.map((item) => {
      const allocatedDiscount = saleSubtotalMinor > 0
        ? Math.floor(discountMinor * item.lineTotalMinor / saleSubtotalMinor)
        : 0;
      const discountedLineMinor = Math.max(0, item.lineTotalMinor - allocatedDiscount);
      const taxMinor = item.taxRateBps > 0
        ? Math.round(discountedLineMinor * item.taxRateBps / (10000 + item.taxRateBps))
        : 0;
      return { ...item, taxMinor };
    });
    const taxMinor = pricedItems.reduce((sum, item) => sum + item.taxMinor, 0);
    const combinedDiscountMinor = saleDiscountMinor + discountMinor;
    const unroundedTotalMinor = Math.max(0, subtotalMinor + shippingMinor - combinedDiscountMinor);
    const totalMinor = (currency ?? "INR") === "INR"
      ? Math.round(unroundedTotalMinor / 100) * 100
      : unroundedTotalMinor;
    const roundingMinor = totalMinor - unroundedTotalMinor;

    // Razorpay Orders require a positive amount. Reject zero-value checkout
    // rather than creating an order that cannot be paid.
    if (totalMinor <= 0) {
      throw new BadRequestException(
        "This order total is zero. Please adjust the coupon or cart before checkout.",
      );
    }

    return {
      currency: currency ?? "INR",
      items: pricedItems,
      taxInclusive: true,
      shippingRule: shipping,
      promotion,
      summary: {
        subtotalMinor,
        shippingMinor,
        discountMinor: combinedDiscountMinor,
        saleDiscountMinor,
        couponDiscountMinor: discountMinor,
        taxMinor,
        roundingMinor,
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
