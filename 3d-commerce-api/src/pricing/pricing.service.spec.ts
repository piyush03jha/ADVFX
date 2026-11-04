import { PricingService } from './pricing.service';

describe('PricingService', () => {
  const prisma = {
    cart: { findUnique: jest.fn() },
    product: { findMany: jest.fn() },
    siteSetting: { findUnique: jest.fn() },
    address: { findFirst: jest.fn() },
    shippingRule: { findFirst: jest.fn() },
    promotion: { findFirst: jest.fn() },
    taxRule: { findFirst: jest.fn() },
  } as any;

  let service: PricingService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new PricingService(prisma);

    prisma.address.findFirst.mockResolvedValue({
      id: 'addr-1',
      country: 'IN',
      state: 'DL',
      postalCode: '110001',
    });
    prisma.shippingRule.findFirst.mockResolvedValue({
      id: 'ship-1',
      name: 'Standard',
      type: 'FLAT_RATE',
      amountMinor: 150,
      freeAboveMinor: null,
      minWeightGrams: null,
      maxWeightGrams: null,
      countryCode: 'IN',
      stateCode: null,
      estimatedMinDays: 3,
      estimatedMaxDays: 7,
      priority: 0,
      isActive: true,
    });
    prisma.taxRule.findFirst.mockResolvedValue(null);
    prisma.siteSetting.findUnique.mockResolvedValue(null);
    prisma.deliveryZone = { findUnique: jest.fn().mockResolvedValue(null) };
  });

  it('calculates discount, shipping, and tax from server-side rules', async () => {
    prisma.cart.findUnique.mockResolvedValue({
      items: [
        {
          quantity: 1,
          product: {
            id: 'p1',
            name: 'Model',
            status: 'ACTIVE',
            category: { gstRateBps: 1800 },
            weight: '1kg',
            prices: [{ amountMinor: 10000, currency: 'INR' }],
          },
        },
      ],
    });
    prisma.promotion.findFirst.mockResolvedValue({
      id: 'promo-1',
      code: 'SAVE10',
      type: 'PERCENTAGE',
      value: 1000,
      minSubtotalMinor: 0,
      maxDiscountMinor: null,
      usageLimit: null,
      usageCount: 0,
      startsAt: null,
      endsAt: null,
    });
    prisma.taxRule.findFirst.mockResolvedValue({
      id: 'tax-1',
      name: 'GST',
      rateBps: 1800,
      applyToShipping: true,
    });

    const result = await service.calculate('user-1', {
      shippingAddressId: 'addr-1',
      couponCode: 'save10',
    });

    expect(result.summary.discountMinor).toBe(1000);
    expect(result.summary.shippingMinor).toBe(150);
    expect(result.summary.taxMinor).toBe(1373);
    expect(result.summary.totalMinor).toBe(9200);
  });

  it('clamps percentage discount to the configured maximum', async () => {
    prisma.cart.findUnique.mockResolvedValue({
      items: [
        {
          quantity: 1,
          product: {
            id: 'p1',
            name: 'Model',
            status: 'ACTIVE',
            weight: null,
            prices: [{ amountMinor: 10000, currency: 'INR' }],
          },
        },
      ],
    });
    prisma.shippingRule.findFirst.mockResolvedValue({
      id: 'ship-1',
      name: 'Free',
      type: 'FREE',
      amountMinor: 0,
      freeAboveMinor: null,
      countryCode: null,
      stateCode: null,
    });
    prisma.promotion.findFirst.mockResolvedValue({
      id: 'promo-1',
      code: 'CAP',
      type: 'PERCENTAGE',
      value: 5000,
      minSubtotalMinor: 0,
      maxDiscountMinor: 1000,
      usageLimit: null,
      usageCount: 0,
      startsAt: null,
      endsAt: null,
    });

    const result = await service.calculate('user-1', {
      shippingAddressId: 'addr-1',
      couponCode: 'CAP',
    });

    expect(result.summary.discountMinor).toBe(1000);
    expect(result.summary.totalMinor).toBe(9000);
  });

  it('rejects an exhausted promotion', async () => {
    prisma.cart.findUnique.mockResolvedValue({
      items: [
        {
          quantity: 1,
          product: {
            id: 'p1',
            name: 'Model',
            status: 'ACTIVE',
            weight: null,
            prices: [{ amountMinor: 10000, currency: 'INR' }],
          },
        },
      ],
    });
    prisma.promotion.findFirst.mockResolvedValue(null);

    await expect(
      service.calculate('user-1', {
        shippingAddressId: 'addr-1',
        couponCode: 'EXPIRED',
      }),
    ).rejects.toThrow();
  });

  it('prices direct checkout items from the single global product price', async () => {
    prisma.product.findMany.mockResolvedValue([
      {
        id: 'p1',
        name: 'Global-priced model',
        status: 'ACTIVE',
        weight: null,
        prices: [{ amountMinor: 15000, currency: 'INR', countryCode: null, isActive: true }],
        variants: [],
      },
    ]);

    const result = await service.calculate('user-1', {
      shippingAddressId: 'addr-1',
      items: [{ productId: 'p1', quantity: 1 }],
    });

    expect(prisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: ['p1'] } },
      include: expect.objectContaining({
        prices: {
          where: {
            isActive: true,
            countryCode: null,
            AND: [
              { OR: [{ startsAt: null }, { startsAt: { lte: expect.any(Date) } }] },
              { OR: [{ endsAt: null }, { endsAt: { gt: expect.any(Date) } }] },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      }),
    }));
    expect(result.summary.subtotalMinor).toBe(15000);
    expect(result.currency).toBe('INR');
  });

  it('charges a variant its own price regardless of the shipping country', async () => {
    prisma.product.findMany.mockResolvedValue([
      {
        id: 'p1',
        name: 'Variant-priced model',
        status: 'ACTIVE',
        weight: null,
        prices: [{ amountMinor: 10000, currency: 'INR', countryCode: null, isActive: true }],
        variants: [{
          id: 'v1',
          productId: 'p1',
          name: 'Large',
          isActive: true,
          price: { amountMinor: 12000, currency: 'INR', isActive: true },
        }],
      },
    ]);

    const result = await service.calculate('user-1', {
      shippingAddressId: 'addr-1',
      items: [{ productId: 'p1', variantId: 'v1', quantity: 1 }],
    });

    expect(result.items[0].unitPriceMinor).toBe(12000);
    expect(result.summary.subtotalMinor).toBe(12000);
  });

  it('applies a sale campaign only to products in the selected category', async () => {
    prisma.siteSetting.findUnique.mockResolvedValue({
      key: 'saleCampaign',
      value: JSON.stringify({
        enabled: true,
        categoryId: 'category-a',
        priceIncreaseBps: 2000,
        discountBps: 1000,
        startsAt: null,
        endsAt: null,
      }),
    });
    prisma.product.findMany.mockResolvedValue([
      {
        id: 'p1', name: 'Category A model', status: 'ACTIVE', categoryId: 'category-a',
        category: { id: 'category-a', parentId: null, gstRateBps: 0 },
        weight: null,
        prices: [{ amountMinor: 10000, currency: 'INR', isActive: true }],
        variants: [],
      },
      {
        id: 'p2', name: 'Category B model', status: 'ACTIVE', categoryId: 'category-b',
        category: { id: 'category-b', parentId: null, gstRateBps: 0 },
        weight: null,
        prices: [{ amountMinor: 10000, currency: 'INR', isActive: true }],
        variants: [],
      },
    ]);

    const result = await service.calculate('user-1', {
      shippingAddressId: 'addr-1',
      items: [
        { productId: 'p1', quantity: 1 },
        { productId: 'p2', quantity: 1 },
      ],
    });

    expect(result.items[0].unitPriceMinor).toBe(10800);
    expect(result.items[1].unitPriceMinor).toBe(10000);
    expect(result.summary.saleDiscountMinor).toBe(1200);
  });

  it('rejects a cart containing prices in different currencies', async () => {
    prisma.cart.findUnique.mockResolvedValue({
      items: [
        {
          quantity: 1,
          product: {
            id: 'p1',
            name: 'INR Model',
            status: 'ACTIVE',
            weight: null,
            prices: [{ amountMinor: 10000, currency: 'INR' }],
          },
        },
        {
          quantity: 1,
          product: {
            id: 'p2',
            name: 'USD Model',
            status: 'ACTIVE',
            weight: null,
            prices: [{ amountMinor: 1000, currency: 'USD' }],
          },
        },
      ],
    });

    await expect(
      service.calculate('user-1', { shippingAddressId: 'addr-1' }),
    ).rejects.toThrow('All items in a checkout must use the same currency');
  });

  it('rejects a selected variant whose own price is inactive instead of charging the legacy product price', async () => {
    prisma.cart.findUnique.mockResolvedValue({
      items: [
        {
          quantity: 1,
          productId: 'p1',
          variantId: 'v1',
          variant: {
            id: 'v1',
            productId: 'p1',
            name: 'Small',
            isActive: true,
            price: { amountMinor: 0, currency: 'INR', isActive: false },
          },
          product: {
            id: 'p1',
            name: 'Model',
            status: 'ACTIVE',
            weight: null,
            prices: [{ amountMinor: 10000, currency: 'INR' }],
          },
        },
      ],
    });

    await expect(
      service.calculate('user-1', { shippingAddressId: 'addr-1' }),
    ).rejects.toThrow('has no active price');
  });

  describe('order availability (admin pause on product / category)', () => {
    const quoteFor = (overrides: Record<string, unknown>) => {
      prisma.product.findMany.mockResolvedValue([
        {
          id: 'p1', name: 'Dragon', status: 'ACTIVE', weight: null,
          prices: [{ amountMinor: 10000, currency: 'INR', countryCode: null, isActive: true }],
          variants: [],
          ...overrides,
        },
      ]);
      return service.calculate('user-1', {
        shippingAddressId: 'addr-1',
        items: [{ productId: 'p1', quantity: 1 }],
      });
    };

    it('accepts a product that has no pause flags (made to order, no stock check)', async () => {
      await expect(quoteFor({ ordersEnabled: true, category: { ordersEnabled: true, parent: null } })).resolves.toBeDefined();
    });

    it('rejects a product the admin has paused', async () => {
      await expect(quoteFor({ ordersEnabled: false, category: null })).rejects.toThrow(/not accepting orders/);
    });

    it('rejects every product in a paused category', async () => {
      await expect(quoteFor({ ordersEnabled: true, category: { ordersEnabled: false, parent: null } })).rejects.toThrow(/not accepting orders/);
    });

    it('rejects products in a subcategory whose parent category is paused', async () => {
      await expect(
        quoteFor({ ordersEnabled: true, category: { ordersEnabled: true, parent: { ordersEnabled: false } } }),
      ).rejects.toThrow(/not accepting orders/);
    });
  });
});
