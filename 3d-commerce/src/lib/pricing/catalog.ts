import type { ProductCountryPriceOverrides } from "./types";

/**
 * Country-specific retail price overrides.
 *
 * This is intentionally separate from products.ts. The product catalog owns
 * product information and the base catalog price; this file owns regional
 * retail pricing decisions.
 *
 * IMPORTANT:
 * - Values are business-defined prices, NOT exchange-rate conversions.
 * - Amounts here are expressed in major currency units for easy editing.
 * - The admin/database layer will replace this static catalog later without
 *   changing the pricing service API.
 *
 * Example:
 * {
 *   "1": {
 *     IN: { amount: 4999, compareAtAmount: 5999 },
 *     US: { amount: 79.99, compareAtAmount: 99.99 },
 *   },
 * }
 */
export const PRODUCT_COUNTRY_PRICE_OVERRIDES: Record<
  string,
  ProductCountryPriceOverrides
> = {
  // Add explicit country prices here when the business has configured them.
};
