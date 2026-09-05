import { PricingService } from './pricing.service';

describe('PricingService', () => {
  const prisma = {
    promotion: { findFirst: jest.fn(), updateMany: jest.fn() },
    taxRule: { findMany: jest.fn() },
  } as any;

  const shipping = {
    quote: jest.fn(),
  } as any;

  let service: PricingService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new PricingService(prisma, shipping);
  });

  it('calculates discount, shipping, and tax from server-side rules', async () => {
    prisma.promotion.findFirst.mockResolvedValue({
      id: 'promo-1',
      code: 'SAVE10',
      type: 'PERCENTAGE',
      value: 10,
      minimumSubtotalMinor: 0,
      maximumDiscountMinor: null,
      usageLimit: null,
      usedCount: 0,
    });
    shipping.quote.mockResolvedValue({
      amountMinor: 150,
      ruleId: 'ship-1',
      estimatedMinDays: 3,
      estimatedMaxDays: 7,
    });
    prisma.taxRule.findMany.mockResolvedValue([
      { id: 'tax-1', rateBps: 1800, applyToShipping: true },
    ]);

    const result = await service.calculate({
      subtotalMinor: 10000,
      shippingMinor: 150,
      countryCode: 'IN',
      stateCode: 'DL',
      couponCode: 'save10',
    } as any);

    expect(result.discountMinor).toBe(1000);
    expect(result.taxMinor).toBe(1647);
    expect(result.totalMinor).toBe(10797);
  });

  it('clamps percentage discount to the configured maximum', async () => {
    prisma.promotion.findFirst.mockResolvedValue({
      id: 'promo-1',
      code: 'CAP',
      type: 'PERCENTAGE',
      value: 50,
      minimumSubtotalMinor: 0,
      maximumDiscountMinor: 1000,
      usageLimit: null,
      usedCount: 0,
    });
    prisma.taxRule.findMany.mockResolvedValue([]);

    const result = await service.calculate({
      subtotalMinor: 10000,
      shippingMinor: 0,
      countryCode: 'IN',
      stateCode: 'DL',
      couponCode: 'CAP',
    } as any);

    expect(result.discountMinor).toBe(1000);
    expect(result.totalMinor).toBe(9000);
  });

  it('rejects an exhausted promotion', async () => {
    prisma.promotion.findFirst.mockResolvedValue(null);
    prisma.taxRule.findMany.mockResolvedValue([]);

    await expect(
      service.calculate({
        subtotalMinor: 10000,
        shippingMinor: 0,
        countryCode: 'IN',
        stateCode: 'DL',
        couponCode: 'EXPIRED',
      } as any),
    ).rejects.toThrow();
  });
});
