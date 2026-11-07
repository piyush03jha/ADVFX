/**
 * Whether a product is sold in sizes (Small / Medium / Large).
 *
 * `hasSizes` defaults to true, so a missing value (older cached data, partial
 * selects) means "sizes on". Only an explicit false turns sizes off.
 *
 * When sizes are off the product is a single item sold at the one price the
 * admin set by hand. Its variants are ignored everywhere and nothing is
 * calculated from material or weight.
 *
 * Kept free of Prisma/Nest imports so it can be unit tested on its own.
 */
export function sellsInSizes(product: { hasSizes?: boolean | null }): boolean {
  return product.hasSizes !== false;
}

/** The variants that count for pricing and display; none when sizes are off. */
export function sizeVariantsOf<T>(product: { hasSizes?: boolean | null }, variants: T[]): T[] {
  return sellsInSizes(product) ? variants : [];
}
