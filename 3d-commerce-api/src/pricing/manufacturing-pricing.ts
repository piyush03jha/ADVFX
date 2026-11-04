import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function normalizePricingSize(value: string | null | undefined): string {
  const normalized = (value ?? '').trim().toLowerCase();
  if (/(^|\s)(small|s)($|\s)/.test(normalized)) return 'small';
  if (/(^|\s)(medium|mid|m)($|\s)/.test(normalized)) return 'medium';
  if (/(^|\s)(large|l)($|\s)/.test(normalized)) return 'large';
  return normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export type ManufacturingPriceResult = {
  currency: string;
  amountMinor: number;
  costBreakdown: {
    material: string;
    sizeKey: string;
    currency: string;
    rawMaterialCostMinor: number;
    wastageRateBps: number;
    wastageCostMinor: number;
    electricityKwhMilli: number;
    electricityCostMinor: number;
    machineHoursMilli: number;
    machineCostMinor: number;
    labourCostMinor: number;
    paintingCostMinor: number;
    finishingCostMinor: number;
    machineSetupCostMinor: number;
    platformCostMinor: number;
    packagingCostMinor: number;
    directCostMinor: number;
    overheadRateBps: number;
    overheadCostMinor: number;
    profitMarginBps: number;
    profitMarginMinor: number;
    preMarginCostMinor: number;
    sellingPriceMinor: number;
  };
};

/**
 * Resolve a product variant's GST-inclusive selling price from the three
 * admin-controlled pricing layers. All inputs are stored in minor currency
 * units; consumption values are stored in thousandths of kWh / machine hour.
 */
export async function calculateManufacturingPrice(
  tx: Prisma.TransactionClient,
  input: { productId: string; material: string; size: string | null; variantName: string; weightGrams?: number | null },
): Promise<ManufacturingPriceResult> {
  const sizeKey = normalizePricingSize(input.variantName) || normalizePricingSize(input.size);
  const material = input.material.trim();
  if (!material || !sizeKey) {
    throw new BadRequestException('Product material and variant size are required for manufacturing pricing');
  }

  let [materialRule, productRule, globalRate, sizeRule] = await Promise.all([
    tx.materialPricingRule.findFirst({
      where: { material: { equals: material, mode: 'insensitive' }, sizeKey, isActive: true },
    }),
    tx.productCostRule.findUnique({
      where: { productId_sizeKey: { productId: input.productId, sizeKey } },
    }),
    tx.manufacturingRate.findUnique({ where: { id: 'default' } }),
    tx.sizeManufacturingRule.findUnique({ where: { sizeKey } }),
  ]);

  if (!materialRule || materialRule.pricePerKgMinor <= 0) {
    const fallbackRule = await tx.materialPricingRule.findFirst({
      where: { material: { equals: material, mode: 'insensitive' }, sizeKey: 'all', isActive: true, pricePerKgMinor: { gt: 0 } },
    });
    if (fallbackRule) materialRule = fallbackRule;
  }

  if (!materialRule) {
    throw new BadRequestException(
      'No active material pricing is configured for ' + material + ' / ' + sizeKey +
      '. Configure it under Admin > Promotions & tax > Manufacturing pricing.',
    );
  }

  const rawMaterialCostMinor = materialRule.pricePerKgMinor > 0
    ? (() => {
        if (input.weightGrams == null || !Number.isFinite(input.weightGrams) || input.weightGrams <= 0) {
          throw new BadRequestException('Set a positive model weight in grams for this variant before calculating its material price');
        }
        // pricePerKgMinor is stored in paise; grams / 1000 converts the rate to the model's material cost.
        return Math.ceil((input.weightGrams / 1000) * materialRule.pricePerKgMinor);
      })()
    : materialRule.rawMaterialCostMinor;
  const wastageCostMinor = Math.round(rawMaterialCostMinor * materialRule.wastageRateBps / 10000);
  const electricityCostMinor = sizeRule?.electricityCostMinor ?? Math.round(
    materialRule.electricityKwhMilli * (globalRate?.electricityRatePerKwhMinor ?? 0) / 1000,
  );
  const machineCostMinor = sizeRule?.machineCostMinor ?? Math.round(
    materialRule.machineHoursMilli * (globalRate?.machineHourlyCostMinor ?? 0) / 1000,
  );
  const labourCostMinor = productRule?.labourCostMinor ?? sizeRule?.labourCostMinor ?? globalRate?.defaultLabourCostMinor ?? 0;
  const paintingCostMinor = productRule?.paintingCostMinor ?? 0;
  const finishingCostMinor = sizeRule?.finishingCostMinor ?? productRule?.finishingCostMinor ?? 0;
  const machineSetupCostMinor = productRule?.machineSetupCostMinor ?? 0;
  const platformCostMinor = sizeRule?.platformCostMinor ?? 0;
  const packagingCostMinor = productRule?.packagingCostMinor ?? sizeRule?.packagingCostMinor ?? globalRate?.standardPackagingCostMinor ?? 0;

  const directCostMinor =
    rawMaterialCostMinor + wastageCostMinor + electricityCostMinor + machineCostMinor +
    labourCostMinor + paintingCostMinor + finishingCostMinor + machineSetupCostMinor +
    platformCostMinor + packagingCostMinor;
  const overheadRateBps = globalRate?.generalOverheadBps ?? 0;
  const overheadCostMinor = Math.round(directCostMinor * overheadRateBps / 10000);
  const preMarginCostMinor = directCostMinor + overheadCostMinor;
  const profitMarginBps = globalRate?.profitMarginBps ?? 0;
  // Treat margin as a percentage of the final selling price (gross margin), not a markup on cost.
  const amountMinor = profitMarginBps > 0
    ? Math.ceil(preMarginCostMinor * 10000 / (10000 - profitMarginBps))
    : preMarginCostMinor;
  const profitMarginMinor = amountMinor - preMarginCostMinor;

  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new BadRequestException('Manufacturing pricing must produce a positive selling price');
  }

  return {
    currency: materialRule.currency,
    amountMinor,
    costBreakdown: {
      material,
      sizeKey,
      currency: materialRule.currency,
      rawMaterialCostMinor,
      wastageRateBps: materialRule.wastageRateBps,
      wastageCostMinor,
      electricityKwhMilli: materialRule.electricityKwhMilli,
      electricityCostMinor,
      machineHoursMilli: materialRule.machineHoursMilli,
      machineCostMinor,
      labourCostMinor,
      paintingCostMinor,
      finishingCostMinor,
      machineSetupCostMinor,
      platformCostMinor,
      packagingCostMinor,
      directCostMinor,
      overheadRateBps,
      overheadCostMinor,
      preMarginCostMinor,
      profitMarginBps,
      profitMarginMinor,
      sellingPriceMinor: amountMinor,
    },
  };
}
