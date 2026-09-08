import { PricingService } from './pricing.service';

describe('PricingService', () => {
  const prisma = {
    cart: { findUnique: jest.fn() },
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
            weight: '1kg',
            inventory: { stock: 5, reserved: 1, trackStock: true, allowBackorder: false },
            prices: [{ amountMinor: 10000, currency: 'INR' }],
          },
        },
      ],
    });
    prisma.promotion.findFirst.mockResolvedValue({
      id: 'promo-1',
      code: 'SAVE10',
      type: 'PERCENTAGE',
      value: 10,
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
    expect(result.summary.taxMinor).toBe(1647);
    expect(result.summary.totalMinor).toBe(10797);
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
            inventory: { stock: 5, reserved: 0, trackStock: true, allowBackorder: false },
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
      minWeightGrams: null,
      maxWeightGrams: null,
      countryCode: null,
      stateCode: null,
    });
    prisma.promotion.findFirst.mockResolvedValue({
      id: 'promo-1',
      code: 'CAP',
      type: 'PERCENTAGE',
      value: 50,
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
            inventory: { stock: 5, reserved: 0, trackStock: true, allowBackorder: false },
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
});
