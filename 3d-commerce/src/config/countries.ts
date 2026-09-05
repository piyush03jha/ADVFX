export type CountryCode =
  | "IN"
  | "US"
  | "GB"
  | "AE"
  | "CA"
  | "AU"
  | "SG"
  | "DE"
  | "FR"
  | "JP";

export interface CountryConfig {
  code: CountryCode;
  name: string;
  currency:
    | "INR"
    | "USD"
    | "GBP"
    | "AED"
    | "CAD"
    | "AUD"
    | "SGD"
    | "EUR"
    | "JPY";
  symbol: string;
}

/**
 * Checkout country and currency metadata.
 *
 * This file only describes supported markets. Retail prices are resolved by
 * src/lib/pricing and are intentionally kept separate so each country can
 * have an independent business-defined price.
 */
export const COUNTRIES: CountryConfig[] = [
  { code: "IN", name: "India", currency: "INR", symbol: "₹" },
  { code: "US", name: "United States", currency: "USD", symbol: "$" },
  { code: "GB", name: "United Kingdom", currency: "GBP", symbol: "£" },
  { code: "AE", name: "United Arab Emirates", currency: "AED", symbol: "د.إ" },
  { code: "CA", name: "Canada", currency: "CAD", symbol: "CA$" },
  { code: "AU", name: "Australia", currency: "AUD", symbol: "A$" },
  { code: "SG", name: "Singapore", currency: "SGD", symbol: "S$" },
  { code: "DE", name: "Germany", currency: "EUR", symbol: "€" },
  { code: "FR", name: "France", currency: "EUR", symbol: "€" },
  { code: "JP", name: "Japan", currency: "JPY", symbol: "¥" },
];

export function getCountry(code: CountryCode) {
  return (
    COUNTRIES.find((country) => country.code === code) ??
    COUNTRIES[0]
  );
}
