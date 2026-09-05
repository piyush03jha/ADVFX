import { getCountry, type CountryCode } from "@/config/countries";
import type { CartItem } from "@/context/CartContext";
import type { Product } from "@/config/products";

import { PRODUCT_COUNTRY_PRICE_OVERRIDES } from "./catalog";
import type {
  CartPricingResult,
  CountryPriceRule,
  Money,
  ResolvedProductPrice,
} from "./types";

export const BASE_COUNTRY: CountryCode = "IN";

function getMinorUnitDigits(currency: Money["currency"]): number {
  return currency === "JPY" ? 0 : 2;
}

function toMinorUnits(
  amount: number,
  currency: Money["currency"],
): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`Invalid price amount: ${amount}`);
  }

  const factor = 10 ** getMinorUnitDigits(currency);
  return Math.round(amount * factor);
}

function toMoney(
  amount: number,
  currency: Money["currency"],
): Money {
  return {
    amountMinor: toMinorUnits(amount, currency),
    currency,
  };
}

function getDiscountPercent(
  price: Money,
  compareAtPrice?: Money,
): number | undefined {
  if (!compareAtPrice || compareAtPrice.amountMinor <= price.amountMinor) {
    return undefined;
  }

  return Math.round(
    ((compareAtPrice.amountMinor - price.amountMinor) /
      compareAtPrice.amountMinor) *
      100,
  );
}

function getCountryOverride(
  productId: string,
  country: CountryCode,
): CountryPriceRule | undefined {
  return PRODUCT_COUNTRY_PRICE_OVERRIDES[productId]?.[country];
}

/**
 * Resolve the price a customer should see for one product in one country.
 *
 * Country prices are explicit business prices. We never calculate them from
 * an exchange rate. If the business has not configured a country price yet,
 * only the base country can fall back to the product's catalog price.
 */
export function getProductPrice(
  product: Product | CartItem["product"],
  country: CountryCode,
): ResolvedProductPrice | null {
  const countryConfig = getCountry(country);
  const override = getCountryOverride(product.id, country);

  if (override?.enabled === false) {
    return null;
  }

  if (override) {
    const price = toMoney(override.amount, countryConfig.currency);
    const compareAtPrice =
      override.compareAtAmount !== undefined
        ? toMoney(
            override.compareAtAmount,
            countryConfig.currency,
          )
        : undefined;

    return {
      productId: product.id,
      country,
      currency: countryConfig.currency,
      price,
      compareAtPrice,
      discountPercent: getDiscountPercent(
        price,
        compareAtPrice,
      ),
      source: "country",
    };
  }

  if (country !== BASE_COUNTRY) {
    return null;
  }

  const price = toMoney(
    product.price,
    countryConfig.currency,
  );
  const compareAtPrice =
    product.oldPrice !== undefined
      ? toMoney(product.oldPrice, countryConfig.currency)
      : undefined;

  return {
    productId: product.id,
    country,
    currency: countryConfig.currency,
    price,
    compareAtPrice,
    discountPercent: getDiscountPercent(
      price,
      compareAtPrice,
    ),
    source: "base",
  };
}

/**
 * Calculate every cart line using the same country pricing rules.
 *
 * Unconfigured products are returned in unavailableProductIds instead of
 * silently falling back to the wrong currency or exchange-rate conversion.
 */
export function calculateCartPricing(
  items: CartItem[],
  country: CountryCode,
): CartPricingResult {
  const countryConfig = getCountry(country);
  const lines: CartPricingResult["lines"] = [];
  const unavailableProductIds: string[] = [];

  for (const item of items) {
    const resolved = getProductPrice(item.product, country);

    if (!resolved) {
      if (!unavailableProductIds.includes(item.product.id)) {
        unavailableProductIds.push(item.product.id);
      }
      continue;
    }

    lines.push({
      key: item.key,
      productId: item.product.id,
      quantity: item.quantity,
      unitPrice: resolved.price,
      lineTotal: {
        amountMinor:
          resolved.price.amountMinor * item.quantity,
        currency: resolved.currency,
      },
    });
  }

  const subtotalMinor = lines.reduce(
    (total, line) => total + line.lineTotal.amountMinor,
    0,
  );

  return {
    country,
    currency: countryConfig.currency,
    lines,
    subtotal: {
      amountMinor: subtotalMinor,
      currency: countryConfig.currency,
    },
    unavailableProductIds,
  };
}

/**
 * Format a Money value for customer-facing UI.
 */
export function formatMoney(
  money: Money,
  locale?: string,
): string {
  const digits = getMinorUnitDigits(money.currency);
  const divisor = 10 ** digits;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(money.amountMinor / divisor);
}

export function isCountryPricingConfigured(
  product: Product | CartItem["product"],
  country: CountryCode,
): boolean {
  return getProductPrice(product, country) !== null;
}
