import type { CountryCode } from "@/config/countries";

export type CurrencyCode =
  | "INR"
  | "USD"
  | "GBP"
  | "AED"
  | "CAD"
  | "AUD"
  | "SGD"
  | "EUR"
  | "JPY";

/**
 * Monetary values are represented in the currency's smallest unit.
 * Example: ₹1,499.00 = 149900 paise, $19.99 = 1999 cents.
 */
export interface Money {
  amountMinor: number;
  currency: CurrencyCode;
}

/**
 * Country-specific retail price configured by the business.
 * This is an explicit price, not an exchange-rate conversion.
 */
export interface CountryPriceRule {
  amount: number;
  compareAtAmount?: number;
  enabled?: boolean;
}

export type ProductCountryPriceOverrides = Partial<
  Record<CountryCode, CountryPriceRule>
>;

export interface ResolvedProductPrice {
  productId: string;
  country: CountryCode;
  currency: CurrencyCode;
  price: Money;
  compareAtPrice?: Money;
  discountPercent?: number;
  source: "country" | "base";
}

export interface CartPriceLine {
  key: string;
  productId: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
}

export interface CartPricingResult {
  country: CountryCode;
  currency: CurrencyCode;
  lines: CartPriceLine[];
  subtotal: Money;
  unavailableProductIds: string[];
}
