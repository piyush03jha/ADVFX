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
    sizeManufacturingRule: { findUnique: jest.fn() },
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
    tx.sizeManufacturingRule.findUnique.mockResolvedValue(null);
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

  it('calculates direct costs, then profit markup, then overhead using integer minor units', async () => {
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
    expect(result.amountMinor).toBe(27500);
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
      preMarginCostMinor: 20000,
      profitMarginBps: 2500,
      profitMarginMinor: 5000,
      priceBeforeOverheadMinor: 25000,
      overheadCostMinor: 2500,
      sellingPriceMinor: 27500,
    });
  });

  it('calculates material cost from variant grams and the per-kilogram material rate', async () => {
    tx.materialPricingRule.findFirst.mockResolvedValue({
      material: 'Resin',
      sizeKey: 'large',
      currency: 'INR',
      rawMaterialCostMinor: 0,
      pricePerKgMinor: 120000,
      wastageRateBps: 1000,
      electricityKwhMilli: 0,
      machineHoursMilli: 0,
      isActive: true,
    });

    const result = await calculateManufacturingPrice(tx, {
      productId: 'product-1',
      material: 'Resin',
      size: 'Large',
      variantName: 'Large',
      weightGrams: 50,
    });

    expect(result.costBreakdown.rawMaterialCostMinor).toBe(6000);
    expect(result.costBreakdown.wastageCostMinor).toBe(600);
  });

  it('prices a 60 g small product: material, wastage, size charges, then 40% markup, then 10% overhead', async () => {
    tx.materialPricingRule.findFirst.mockResolvedValue({
      material: 'PETG',
      sizeKey: 'small',
      currency: 'INR',
      rawMaterialCostMinor: 0,
      pricePerKgMinor: 130000,
      wastageRateBps: 1000,
      electricityKwhMilli: 0,
      machineHoursMilli: 0,
      isActive: true,
    });
    tx.sizeManufacturingRule.findUnique.mockResolvedValue({
      sizeKey: 'small',
      electricityCostMinor: 1500,
      machineCostMinor: 3000,
      labourCostMinor: 0,
      finishingCostMinor: 7000,
      platformCostMinor: 8000,
      packagingCostMinor: 3000,
    });
    tx.manufacturingRate.findUnique.mockResolvedValue({
      id: 'default',
      electricityRatePerKwhMinor: 0,
      machineHourlyCostMinor: 0,
      generalOverheadBps: 1000,
      profitMarginBps: 4000,
      defaultLabourCostMinor: 0,
      standardPackagingCostMinor: 0,
    });

    const result = await calculateManufacturingPrice(tx, {
      productId: 'product-1',
      material: 'PETG',
      size: 'Small',
      variantName: 'Small',
      weightGrams: 60,
    });

    expect(result.costBreakdown).toMatchObject({
      rawMaterialCostMinor: 7800,
      wastageCostMinor: 780,
      directCostMinor: 31080,
      profitMarginMinor: 12432,
      priceBeforeOverheadMinor: 43512,
      overheadCostMinor: 4351,
      sellingPriceMinor: 47863,
    });
    expect(result.amountMinor).toBe(47863);
  });

  it('prices 170 g of PLA+ at 750/kg without a floating-point paisa: 562.49 with 40% markup and 10% overhead', async () => {
    tx.materialPricingRule.findFirst.mockResolvedValue({
      material: 'PLA+',
      sizeKey: 'small',
      currency: 'INR',
      rawMaterialCostMinor: 0,
      pricePerKgMinor: 75000,
      wastageRateBps: 1000,
      electricityKwhMilli: 0,
      machineHoursMilli: 0,
      isActive: true,
    });
    tx.sizeManufacturingRule.findUnique.mockResolvedValue({
      sizeKey: 'small',
      electricityCostMinor: 1500,
      machineCostMinor: 3000,
      labourCostMinor: 0,
      finishingCostMinor: 7000,
      platformCostMinor: 8000,
      packagingCostMinor: 3000,
    });
    tx.manufacturingRate.findUnique.mockResolvedValue({
      id: 'default',
      electricityRatePerKwhMinor: 0,
      machineHourlyCostMinor: 0,
      generalOverheadBps: 1000,
      profitMarginBps: 4000,
      defaultLabourCostMinor: 0,
      standardPackagingCostMinor: 0,
    });

    const result = await calculateManufacturingPrice(tx, {
      productId: 'product-1',
      material: 'PLA+',
      size: 'Small',
      variantName: 'Small',
      weightGrams: 170,
    });

    expect(result.costBreakdown).toMatchObject({
      rawMaterialCostMinor: 12750,
      wastageCostMinor: 1275,
      directCostMinor: 36525,
      priceBeforeOverheadMinor: 51135,
      overheadCostMinor: 5114,
      sellingPriceMinor: 56249,
    });
    // 365.25 x 1.4 x 1.1 = 562.485, shown as 562.49.
    expect(result.amountMinor).toBe(56249);
  });

  it('includes the fixed per-size manufacturing costs including platform cost', async () => {
    tx.sizeManufacturingRule.findUnique.mockResolvedValue({
      sizeKey: 'large',
      electricityCostMinor: 1000,
      machineCostMinor: 1500,
      labourCostMinor: 2000,
      finishingCostMinor: 1000,
      platformCostMinor: 500,
      packagingCostMinor: 700,
    });

    const result = await calculateManufacturingPrice(tx, {
      productId: 'product-1',
      material: 'Resin',
      size: 'Large',
      variantName: 'Large',
    });

    expect(result.costBreakdown).toMatchObject({
      electricityCostMinor: 1000,
      machineCostMinor: 1500,
      labourCostMinor: 2000,
      finishingCostMinor: 1000,
      platformCostMinor: 500,
      packagingCostMinor: 700,
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
