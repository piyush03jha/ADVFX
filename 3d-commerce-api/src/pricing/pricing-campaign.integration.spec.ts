import { PricingService } from './pricing.service';

describe('PricingService sale campaign integration', () => {
  const prisma = {
    address: { findFirst: jest.fn() },
    product: { findMany: jest.fn() },
    productVariantCountryPrice: { findMany: jest.fn() },
    siteSetting: { findUnique: jest.fn() },
    deliveryZone: { findUnique: jest.fn() },
    shippingRule: { findFirst: jest.fn() },
    promotion: { findFirst: jest.fn() },
    order: { count: jest.fn() },
    cart: { findUnique: jest.fn() },
  } as any;

  let service: PricingService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new PricingService(prisma);
    prisma.address.findFirst.mockResolvedValue({
      id: 'address-1',
      country: 'IN',
      state: 'DL',
      postalCode: '110001',
    });
    prisma.productVariantCountryPrice.findMany.mockResolvedValue([]);
    prisma.deliveryZone.findUnique.mockResolvedValue(null);
    prisma.shippingRule.findFirst.mockResolvedValue({
      id: 'shipping-1',
      type: 'FREE_ABOVE',
      amountMinor: 500,
      freeAboveMinor: 20000,
    });
    prisma.siteSetting.findUnique.mockResolvedValue({
      key: 'saleCampaign',
      value: JSON.stringify({
        enabled: true,
        priceIncreaseBps: 2000,
        discountBps: 2000,
        startsAt: null,
        endsAt: null,
      }),
    });
    prisma.product.findMany.mockResolvedValue([
      {
        id: 'product-1',
        name: 'Resin sculpture',
        status: 'ACTIVE',
        weight: '250g',
        material: 'Resin',
        category: { id: 'category-1', name: 'Sculptures', gstRateBps: 1800 },
        inventory: { stock: 10, reserved: 0, trackStock: true, allowBackorder: false },
        prices: [{ amountMinor: 10000, currency: 'INR', isActive: true }],
        variants: [],
      },
    ]);
    prisma.promotion.findFirst.mockResolvedValue({
      id: 'coupon-1',
      code: 'SAVE10',
      type: 'PERCENTAGE',
      value: 1000,
      minSubtotalMinor: 0,
      maxDiscountMinor: null,
      usageLimit: null,
      usageCount: 0,
      usageLimitPerUser: null,
      startsAt: null,
      endsAt: null,
    });
  });

  it('applies campaign discount before coupon, extracts GST from the discounted inclusive price, and rounds INR total', async () => {
    const result = await service.calculate('user-1', {
      shippingAddressId: 'address-1',
      couponCode: 'save10',
      items: [{ productId: 'product-1', quantity: 2 }],
    });

    // ₹100 base -> ₹120 campaign list -> ₹96 sale price, for two units.
    expect(result.items[0]).toMatchObject({
      unitPriceMinor: 9600,
      lineTotalMinor: 19200,
      taxRateBps: 1800,
      taxMinor: 2636,
      saleSnapshot: {
        baseUnitPriceMinor: 10000,
        saleListUnitPriceMinor: 12000,
        saleUnitPriceMinor: 9600,
        priceIncreaseBps: 2000,
        discountBps: 2000,
        discountMinor: 2400,
      },
    });
    expect(result.summary).toMatchObject({
      subtotalMinor: 24000,
      shippingMinor: 500,
      saleDiscountMinor: 4800,
      couponDiscountMinor: 1920,
      discountMinor: 6720,
      taxMinor: 2636,
      roundingMinor: 20,
      totalMinor: 17800,
    });
    expect(prisma.shippingRule.findFirst).toHaveBeenCalled();
    expect(prisma.promotion.findFirst).toHaveBeenCalledWith({
      where: { code: 'SAVE10', isActive: true },
    });
  });

  it('does not apply a campaign before its scheduled start time', async () => {
    prisma.siteSetting.findUnique.mockResolvedValue({
      key: 'saleCampaign',
      value: JSON.stringify({
        enabled: true,
        priceIncreaseBps: 2000,
        discountBps: 2000,
        startsAt: '2999-01-01T00:00:00.000Z',
        endsAt: null,
      }),
    });
    prisma.shippingRule.findFirst.mockResolvedValue({
      id: 'shipping-1',
      type: 'FREE',
      amountMinor: 0,
      freeAboveMinor: null,
    });

    const result = await service.calculate('user-1', {
      shippingAddressId: 'address-1',
      items: [{ productId: 'product-1', quantity: 1 }],
    });

    expect(result.items[0].unitPriceMinor).toBe(10000);
    expect(result.items[0].saleSnapshot).toBeNull();
    expect(result.summary.saleDiscountMinor).toBe(0);
    expect(result.summary.totalMinor).toBe(10000);
  });
});
