import { calculateManufacturingPrice, normalizePricingSize } from './manufacturing-pricing';

describe('normalizePricingSize', () => {
  it.each([
    ['Small', 'small'],
    ['SMALL model', 'small'],
    ['S', 'small'],
    ['Medium', 'medium'],
    ['M', 'medium'],
    ['Large', 'large'],
    ['L', 'large'],
    ['  Extra-large  ', 'extra-large'],
    [null, ''],
    [undefined, ''],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizePricingSize(input)).toBe(expected);
  });
});

describe('calculateManufacturingPrice', () => {
  const tx = {
    materialPricingRule: { findFirst: jest.fn() },
    productCostRule: { findUnique: jest.fn() },
    manufacturingRate: { findUnique: jest.fn() },
  } as any;

  beforeEach(() => {
    jest.resetAllMocks();
    tx.materialPricingRule.findFirst.mockResolvedValue({
      material: 'Resin',
      sizeKey: 'large',
      currency: 'INR',
      rawMaterialCostMinor: 10000,
      wastageRateBps: 1000,
      electricityKwhMilli: 1500,
      machineHoursMilli: 500,
      isActive: true,
    });
    tx.productCostRule.findUnique.mockResolvedValue(null);
    tx.manufacturingRate.findUnique.mockResolvedValue({
      id: 'default',
      electricityRatePerKwhMinor: 2000,
      machineHourlyCostMinor: 6000,
      generalOverheadBps: 1000,
      profitMarginBps: 2500,
      defaultLabourCostMinor: 2000,
      standardPackagingCostMinor: 1000,
    });
  });

  it('calculates all direct costs, overhead and gross margin using integer minor units', async () => {
    const result = await calculateManufacturingPrice(tx, {
      productId: 'product-1',
      material: ' resin ',
      size: 'Large',
      variantName: 'Large',
    });

    expect(tx.materialPricingRule.findFirst).toHaveBeenCalledWith({
      where: {
        material: { equals: 'resin', mode: 'insensitive' },
        sizeKey: 'large',
        isActive: true,
      },
    });
    expect(result.currency).toBe('INR');
    expect(result.amountMinor).toBe(29334);
    expect(result.costBreakdown).toMatchObject({
      rawMaterialCostMinor: 10000,
      wastageCostMinor: 1000,
      electricityCostMinor: 3000,
      machineCostMinor: 3000,
      labourCostMinor: 2000,
      paintingCostMinor: 0,
      finishingCostMinor: 0,
      machineSetupCostMinor: 0,
      packagingCostMinor: 1000,
      directCostMinor: 20000,
      overheadCostMinor: 2000,
      preMarginCostMinor: 22000,
      profitMarginBps: 2500,
      profitMarginMinor: 7334,
      sellingPriceMinor: 29334,
    });
  });

  it('uses product-level labour and packaging overrides instead of global defaults', async () => {
    tx.productCostRule.findUnique.mockResolvedValue({
      labourCostMinor: 500,
      paintingCostMinor: 250,
      finishingCostMinor: 100,
      machineSetupCostMinor: 150,
      packagingCostMinor: 700,
    });

    const result = await calculateManufacturingPrice(tx, {
      productId: 'product-1',
      material: 'Resin',
      size: 'Large',
      variantName: 'Large',
    });

    expect(result.costBreakdown.labourCostMinor).toBe(500);
    expect(result.costBreakdown.packagingCostMinor).toBe(700);
    expect(result.costBreakdown.paintingCostMinor).toBe(250);
    expect(result.costBreakdown.finishingCostMinor).toBe(100);
    expect(result.costBreakdown.machineSetupCostMinor).toBe(150);
  });

  it('uses the variant name to resolve size before the fallback size', async () => {
    await calculateManufacturingPrice(tx, {
      productId: 'product-1',
      material: 'Resin',
      size: 'Small',
      variantName: 'Large',
    });

    expect(tx.materialPricingRule.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ sizeKey: 'large' }) }),
    );
  });

  it('rejects a missing active material rule', async () => {
    tx.materialPricingRule.findFirst.mockResolvedValue(null);

    await expect(calculateManufacturingPrice(tx, {
      productId: 'product-1',
      material: 'Resin',
      size: 'Large',
      variantName: 'Large',
    })).rejects.toThrow('No active material pricing is configured');
  });

  it('rejects missing material or size before querying pricing rules', async () => {
    await expect(calculateManufacturingPrice(tx, {
      productId: 'product-1',
      material: ' ',
      size: null,
      variantName: '',
    })).rejects.toThrow('Product material and variant size are required');

    expect(tx.materialPricingRule.findFirst).not.toHaveBeenCalled();
  });
});
