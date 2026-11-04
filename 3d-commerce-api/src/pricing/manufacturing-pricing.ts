import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function normalizePricingSize(value: string | null | undefined): string {
  const normalized = (value ?? '').trim().toLowerCase();
  if (/\\bsmall\\b|\\bs\\b/.test(normalized)) return 'small';
  if (/\\bmedium\\b|\\bmid\\b|\\bm\\b/.test(normalized)) return 'medium';
  if (/\\blarge\\b|\\bl\\b/.test(normalized)) return 'large';
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
    packagingCostMinor: number;
    directCostMinor: number;
    overheadRateBps: number;
    overheadCostMinor: number;
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
  input: { productId: string; material: string; size: string | null; variantName: string },
): Promise<ManufacturingPriceResult> {
  const sizeKey = normalizePricingSize(input.variantName) || normalizePricingSize(input.size);
  const material = input.material.trim();
  if (!material || !sizeKey) {
    throw new BadRequestException('Product material and variant size are required for manufacturing pricing');
  }

  const [materialRule, productRule, globalRate] = await Promise.all([
    tx.materialPricingRule.findFirst({
      where: { material: { equals: material, mode: 'insensitive' }, sizeKey, isActive: true },
    }),
    tx.productCostRule.findUnique({
      where: { productId_sizeKey: { productId: input.productId, sizeKey } },
    }),
    tx.manufacturingRate.findUnique({ where: { id: 'default' } }),
  ]);

  if (!materialRule) {
    throw new BadRequestException(
      'No active material pricing is configured for ' + material + ' / ' + sizeKey +
      '. Configure it under Admin > Promotions & tax > Manufacturing pricing.',
    );
  }

  const rawMaterialCostMinor = materialRule.rawMaterialCostMinor;
  const wastageCostMinor = Math.round(rawMaterialCostMinor * materialRule.wastageRateBps / 10000);
  const electricityCostMinor = Math.round(
    materialRule.electricityKwhMilli * (globalRate?.electricityRatePerKwhMinor ?? 0) / 1000,
  );
  const machineCostMinor = Math.round(
    materialRule.machineHoursMilli * (globalRate?.machineHourlyCostMinor ?? 0) / 1000,
  );
  const labourCostMinor = productRule?.labourCostMinor ?? globalRate?.defaultLabourCostMinor ?? 0;
  const paintingCostMinor = productRule?.paintingCostMinor ?? 0;
  const finishingCostMinor = productRule?.finishingCostMinor ?? 0;
  const machineSetupCostMinor = productRule?.machineSetupCostMinor ?? 0;
  const packagingCostMinor = productRule?.packagingCostMinor ?? globalRate?.standardPackagingCostMinor ?? 0;

  const directCostMinor =
    rawMaterialCostMinor + wastageCostMinor + electricityCostMinor + machineCostMinor +
    labourCostMinor + paintingCostMinor + finishingCostMinor + machineSetupCostMinor +
    packagingCostMinor;
  const overheadRateBps = globalRate?.generalOverheadBps ?? 0;
  const overheadCostMinor = Math.round(directCostMinor * overheadRateBps / 10000);
  const amountMinor = directCostMinor + overheadCostMinor;

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
      packagingCostMinor,
      directCostMinor,
      overheadRateBps,
      overheadCostMinor,
      sellingPriceMinor: amountMinor,
    },
  };
}
