import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { calculateManufacturingPrice, type PricingCache } from '../pricing/manufacturing-pricing';

/** A product without sizes is priced exactly like its Medium size. */
const FIXED_SIZE = { name: 'Medium', size: '25 cm' };

/**
 * Recalculates the single price of a product that is sold without sizes:
 * filament cost from the admin's weight, plus the Medium-size charges and the
 * global charges. Writes it as the active product-level price.
 *
 * With no material or weight there is nothing to calculate, so the old price
 * is switched off instead of being left on sale. With `strict` a missing rule
 * or weight is reported to the admin; without it (bulk rate changes) such a
 * product is skipped.
 */
export async function recalculateFixedSizePrice(
  tx: Prisma.TransactionClient,
  product: { id: string; material?: string | null; fixedWeightGrams?: number | null },
  options: { strict?: boolean; cache?: PricingCache } = {},
) {
  const deactivate = () =>
    tx.productPrice.updateMany({
      where: { productId: product.id, countryCode: null, isActive: true },
      data: { isActive: false },
    });
  const material = product.material?.trim();
  if (!material) return deactivate();
  try {
    const calculated = await calculateManufacturingPrice(tx, {
      productId: product.id,
      material,
      size: FIXED_SIZE.size,
      variantName: FIXED_SIZE.name,
      weightGrams: product.fixedWeightGrams,
      cache: options.cache,
    });
    await tx.productPrice.updateMany({
      where: { productId: product.id, countryCode: null, isActive: true },
      data: { isActive: false },
    });
    return tx.productPrice.create({
      data: {
        productId: product.id,
        countryCode: null,
        currency: calculated.currency,
        amountMinor: calculated.amountMinor,
        isActive: true,
      },
    });
  } catch (error) {
    if (!(error instanceof BadRequestException)) throw error;
    await deactivate();
    if (options.strict) throw error;
  }
}
