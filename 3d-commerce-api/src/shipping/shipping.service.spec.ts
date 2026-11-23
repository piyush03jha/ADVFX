import { ShippingRuleType } from '@prisma/client';
import { ShippingService } from './shipping.service';

describe('ShippingService', () => {
  const prisma = {
    shippingRule: { findMany: jest.fn() },
  } as any;
  const service = new ShippingService(prisma);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.shippingRule.findMany.mockResolvedValue([
      {
        id: 'weight',
        name: 'Weight-based delivery',
        type: ShippingRuleType.WEIGHT_BASED,
        amountMinor: 25000,
        priority: 100,
        countryCode: 'IN',
        stateCode: null,
        minWeightGrams: 0,
        maxWeightGrams: null,
        estimatedMinDays: 2,
        estimatedMaxDays: 4,
      },
      {
        id: 'flat',
        name: 'Flat custom delivery',
        type: ShippingRuleType.FLAT_RATE,
        amountMinor: 10000,
        priority: 10,
        countryCode: 'IN',
        stateCode: null,
        estimatedMinDays: 3,
        estimatedMaxDays: 6,
      },
    ]);
  });

  it('reserves weight-based rules for regular orders', async () => {
    const context = { country: 'IN', state: 'DL', subtotalMinor: 80000, weightGrams: 0 };
    await expect(service.quote(context)).resolves.toEqual(expect.objectContaining({
      ruleId: 'weight',
      amountMinor: 25000,
    }));
    await expect(service.quote({ ...context, excludeWeightBased: true })).resolves.toEqual(
      expect.objectContaining({ ruleId: 'flat', amountMinor: 10000 }),
    );
  });

  it('does not mark delivery free just because only a weight-based rule exists', async () => {
    prisma.shippingRule.findMany.mockResolvedValueOnce([
      {
        id: 'weight',
        name: 'Weight-based delivery',
        type: ShippingRuleType.WEIGHT_BASED,
        amountMinor: 25000,
        priority: 100,
      },
    ]);
    const quote = await service.quote({
      country: 'IN', state: 'DL', subtotalMinor: 80000, weightGrams: 0,
      excludeWeightBased: true,
    });
    expect(quote.ruleId).toBeNull();
    expect(quote.label).toBe('Shipping calculated after order review');
  });
});
